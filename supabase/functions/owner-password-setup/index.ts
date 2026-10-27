import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);

  try {
    const setupToken = Deno.env.get("OWNER_PASSWORD_SETUP_TOKEN");
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!setupToken || !url || !serviceKey) return reply({ error: "Owner password setup is not configured." }, 503);

    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const token = String(body.setup_token ?? "");
    const password = String(body.password ?? "");
    if (!email || !email.includes("@") || password.length < 12 || password.length > 128)
      return reply({ error: "Enter your owner email and a password of at least 12 characters." }, 400);
    if (token.length !== setupToken.length || token !== setupToken)
      return reply({ error: "The one-time setup code is incorrect." }, 401);

    const supabase = createClient(url, serviceKey);
    const { data: usersResult, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) return reply({ error: "Could not verify the owner account." }, 500);
    const user = usersResult.users.find((u) => (u.email || "").toLowerCase() === email);
    if (!user) return reply({ error: "That email does not match an existing owner account." }, 403);

    const { data: allowlist, error: allowlistError } = await supabase
      .from("order_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (allowlistError || !allowlist) return reply({ error: "This account is not authorized as a CzyFit owner." }, 403);

    const { data: consumed, error: consumeError } = await supabase
      .from("owner_password_setup_state")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", "owner").is("consumed_at", null).select("id").maybeSingle();
    if (consumeError) return reply({ error: "Could not verify one-time setup state. Run the setup migration." }, 500);
    if (!consumed) return reply({ error: "The one-time setup code has already been used." }, 410);

    const { error: passwordError } = await supabase.auth.admin.updateUserById(user.id, { password });
    if (passwordError) {
      await supabase.from("owner_password_setup_state").update({ consumed_at: null }).eq("id", "owner");
      return reply({ error: "Supabase could not set that password. Try a different password." }, 400);
    }
    return reply({ ok: true, message: "Owner password set. Sign in using your email and new password." });
  } catch (error) {
    console.error("owner-password-setup error", error);
    return reply({ error: "Unexpected setup error." }, 500);
  }
});
