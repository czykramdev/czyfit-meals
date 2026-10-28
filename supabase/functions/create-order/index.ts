import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MENU: Record<number, { name: string; price: number; kcal: number; protein: number; carbs: number; fat: number }> = {
  1: { name: "Lemon Herb Chicken", price: 189, kcal: 485, protein: 42, carbs: 44, fat: 13 },
  2: { name: "Teriyaki Chicken Bowl", price: 179, kcal: 520, protein: 36, carbs: 62, fat: 12 },
  3: { name: "Garlic Beef & Rice", price: 209, kcal: 575, protein: 39, carbs: 58, fat: 17 },
  4: { name: "Tofu Power Bowl", price: 159, kcal: 460, protein: 24, carbs: 54, fat: 16 },
  5: { name: "Tuna Pesto Pasta", price: 169, kcal: 510, protein: 32, carbs: 57, fat: 15 },
  6: { name: "Pesto Chicken Pasta", price: 179, kcal: 560, protein: 39, carbs: 57, fat: 18 },
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return reply({ error: "Ordering service is not configured yet." }, 503);
    const supabase = createClient(url, serviceKey);

    const data = await req.json();
    const name = String(data.name ?? "").trim().slice(0, 120);
    const phone = String(data.phone ?? "").trim().slice(0, 40);
    const customerEmail = String(data.email ?? "").trim().slice(0, 254);
    const requestedDate = String(data.date ?? "");
    const fulfilment = data.fulfilment === "delivery" ? "delivery" : "pickup";
    const paymentMethod = String(data.payment_method ?? "");
    const notes = String(data.notes ?? "").trim().slice(0, 1000);
    const address = String(data.address ?? "").trim().slice(0, 500);
    const items = Array.isArray(data.items) ? data.items : [];

    if (!name || !phone || !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate))
      return reply({ error: "Please provide your name, mobile number, and a valid preferred date." }, 400);
    if (requestedDate < new Date(Date.now() + 86400000).toISOString().slice(0, 10))
      return reply({ error: "Please choose a date at least one day from today." }, 400);
    if (paymentMethod !== "gcash") return reply({ error: "Choose GCash for this checkout." }, 400);
    const paymentPlan = data.payment_plan === "full" ? "full" : "deposit";
    if (fulfilment === "delivery" && !address)
      return reply({ error: "Please enter a delivery address." }, 400);
    if (!items.length || items.length > 20) return reply({ error: "Your cart is empty or contains too many items." }, 400);

    const normalized = [];
    let total = 0;
    for (const item of items) {
      const id = Number(item.id);
      const quantity = Number(item.quantity);
      const meal = MENU[id];
      if (!meal || !Number.isInteger(quantity) || quantity < 1 || quantity > 30)
        return reply({ error: "One or more cart items are invalid. Please review your cart." }, 400);
      total += meal.price * quantity;
      normalized.push({ id, quantity, meal });
    }
    if (total > 100000) return reply({ error: "Order total exceeds the allowed limit." }, 400);

    const orderNumber = "CZY-" + crypto.randomUUID().slice(0, 8).toUpperCase();
    const paymentStatus = "pending";
    const amountDueNow = paymentPlan === "full" ? total : Math.ceil(total / 2);
    const balanceDue = total - amountDueNow;
    const { data: order, error: orderError } = await supabase.from("orders").insert({
      order_number: orderNumber,
      customer_name: name,
      phone,
      customer_email: customerEmail || null,
      requested_date: requestedDate,
      fulfilment,
      delivery_address: fulfilment === "delivery" ? address : null,
      notes,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      payment_plan: paymentPlan,
      amount_due_now_php: amountDueNow,
      amount_paid_php: 0,
      balance_due_php: balanceDue,
      status: "pending",
      total_php: total,
    }).select("id,order_number,total_php,created_at").single();
    if (orderError || !order) {
      console.error("order insert failed", orderError);
      return reply({ error: "We couldn't save your order. Please try again." }, 500);
    }

    const rows = normalized.map(({ id, quantity, meal }) => ({
      order_id: order.id, meal_id: null, meal_name: meal.name, quantity,
      unit_price_php: meal.price, calories: meal.kcal, protein_g: meal.protein,
      carbs_g: meal.carbs, fat_g: meal.fat,
    }));
    const { error: itemsError } = await supabase.from("order_items").insert(rows);
    if (itemsError) {
      await supabase.from("orders").delete().eq("id", order.id);
      console.error("order items insert failed", itemsError);
      return reply({ error: "We couldn't save the full order. Please try again." }, 500);
    }

    // Push notifications are best-effort: never fail a saved customer order if push is unavailable.
    let pushSent = 0;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    if (vapidPublicKey && vapidPrivateKey) {
      try {
        webpush.setVapidDetails("https://czykramdev.github.io/czyfit-meals/", vapidPublicKey, vapidPrivateKey);
        const { data: subscriptions, error: subscriptionError } = await supabase
          .from("push_subscriptions")
          .select("endpoint,subscription");
        if (subscriptionError) {
          console.error("push subscription lookup failed", subscriptionError);
        } else {
          const outcomes = await Promise.all((subscriptions || []).map(async (row) => {
            try {
              await webpush.sendNotification(row.subscription, JSON.stringify({
                title: "New CzyFit order",
                body: `${orderNumber} · ₱${total} · New order received`,
                url: "https://czykramdev.github.io/czyfit-meals/admin-app/"
              }));
              return { endpoint: row.endpoint, ok: true };
            } catch (error) {
              const statusCode = Number((error as { statusCode?: number })?.statusCode || 0);
              if (statusCode === 404 || statusCode === 410) {
                await supabase.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
              }
              console.error("push notification failed", statusCode || error);
              return { endpoint: row.endpoint, ok: false };
            }
          }));
          pushSent = outcomes.filter((result) => result.ok).length;
        }
      } catch (error) {
        console.error("push notification setup failed", error);
      }
    }

    const notifyTo = Deno.env.get("ORDER_NOTIFICATION_EMAIL");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    let emailSent = false;
    if (notifyTo && resendKey) {
      const itemLines = normalized.map(({ quantity, meal }) => `${quantity} × ${meal.name} — ₱${meal.price * quantity}`).join("\n");
      const emailResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: Deno.env.get("ORDER_EMAIL_FROM") || "CzyFit Meals <onboarding@resend.dev>",
          to: [notifyTo],
          subject: `New CzyFit order ${orderNumber} — ₱${total}`,
          text: `A new order was placed.\n\nOrder: ${orderNumber}\nCustomer: ${name}\nPhone: ${phone}\nEmail: ${customerEmail || "Not provided"}\nDate: ${requestedDate}\nFulfilment: ${fulfilment}\nAddress: ${address || "Pickup"}\nPayment: ${paymentMethod} · ${paymentPlan} · pay now ₱${amountDueNow} (${paymentStatus})\n\nItems:\n${itemLines}\n\nTotal: ₱${total}\nNotes: ${notes || "None"}\n\nOpen the CzyFit Meals owner dashboard to manage this order.`,
        }),
      });
      emailSent = emailResp.ok;
      if (!emailResp.ok) console.error("email notification failed", await emailResp.text());
    }
    return reply({ ok: true, order_number: order.order_number, total_php: total, payment_plan: paymentPlan, amount_due_now_php: amountDueNow, balance_due_php: balanceDue, email_sent: emailSent, push_sent: pushSent });
  } catch (error) {
    console.error("create-order error", error);
    return reply({ error: "Unexpected server error. Please try again." }, 500);
  }
});
