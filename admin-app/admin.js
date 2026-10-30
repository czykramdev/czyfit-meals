document.getElementById("setupMessage").textContent="Dashboard script loaded. Checking public Supabase configuration…";
let db;let orderChannel=null;const $=x=>document.getElementById(x);const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));const php=n=>"₱"+Number(n).toLocaleString("en-PH");
const VAPID_PUBLIC_KEY="BE_4pm-G8cenVa5w3Z9DeYYRuwPx5H9PvztxEK3hYe3eiAsx1OBJIttD-6UCBhr6H1URY4GaJu0zs6d5K_clm2k";
let activeUserId=null;let cachedOrders=[];const seenOrderIds=new Set();
function show(id,v){$(id).classList.toggle("hidden",!v)}
function urlBase64ToUint8Array(base64String){const padding="=".repeat((4-base64String.length%4)%4);const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");const raw=atob(base64);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))}
if("serviceWorker" in navigator){navigator.serviceWorker.register("./sw.js").catch(err=>console.error("Admin service worker failed",err))}
async function loadSupabaseClient(){if(window.supabase?.createClient)return true;const sources=["https://esm.sh/@supabase/supabase-js@2","https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"];for(const src of sources){try{const mod=await Promise.race([import(src),new Promise((_,reject)=>setTimeout(()=>reject(new Error("CDN request timed out")),9000))]);if(typeof mod.createClient==="function"){window.supabase={createClient:mod.createClient};return true}throw new Error("CDN response did not expose createClient")}catch(err){console.warn("Supabase client module attempt failed:",src,err)}}return false;}
(async()=>{const configOk=!!(window.CZYFIT_SUPABASE_URL&&window.CZYFIT_SUPABASE_ANON_KEY);if(!configOk){$("setupMessage").textContent=window.CZYFIT_SUPABASE_CONFIG_LOAD_FAILED?"Could not load ../supabase-config.js. Confirm it exists in the project root and that GitHub Pages has deployed the latest commit.":"The public config loaded, but the project URL or public key is missing. Add only the publishable/anon key; never use a service-role key.";return}$("setupMessage").textContent="Loading the Supabase client library…";const clientOk=await loadSupabaseClient();if(!clientOk){$("setupMessage").textContent="The public config loaded, but the Supabase client could not load from jsDelivr or unpkg. Check CDN/network access and reload.";return}try{db=window.supabase.createClient(window.CZYFIT_SUPABASE_URL,window.CZYFIT_SUPABASE_ANON_KEY);show("setup",false);show("login",true);const {data,error}=await db.auth.getSession();if(error){console.error("Session check failed",error);$("message").textContent="Session check failed: "+error.message;return}if(data.session){activeUserId=data.session.user.id;load()}}catch(err){console.error("Supabase initialization failed",err);$("setupMessage").textContent="Supabase config and client loaded, but initialization failed: "+(err.message||String(err));}})();
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();$("message").textContent="Signing in…";const f=new FormData(e.target);const {error}=await db.auth.signInWithPassword({email:f.get("email"),password:f.get("password")});$("message").textContent=error?error.message:"Signed in.";if(!error){const {data}=await db.auth.getUser();activeUserId=data.user?.id||null;await load()}});
$("setupPasswordForm").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.target),password=f.get("setupPassword");if(password!==f.get("setupPasswordConfirm")){$("setupPasswordMessage").textContent="Passwords do not match.";return}$("setupPasswordMessage").textContent="Setting the owner password securely…";const {data,error}=await db.functions.invoke("owner-password-setup",{body:{email:f.get("setupEmail"),setup_token:f.get("setupToken"),password}});if(error){$("setupPasswordMessage").textContent=error.message||"Password setup failed. Check the one-time setup function and secrets."}else if(data?.ok){$("setupPasswordMessage").textContent="Password set successfully. You can now sign in above with your email and new password.";e.target.reset()}else{$("setupPasswordMessage").textContent=data?.error||"Password setup failed."}});
$("magicLink").addEventListener("click",async()=>{const email=$("loginForm").elements.email.value.trim();if(!email){$("message").textContent="Enter your owner email first.";return}$("message").textContent="Sending secure sign-in link…";const {error}=await db.auth.signInWithOtp({email,options:{emailRedirectTo:location.href}});$("message").textContent=error?error.message:"Check your email for the secure sign-in link."});
$("passwordForm").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.target),password=f.get("newPassword");if(password!==f.get("confirmPassword")){$("passwordMessage").textContent="Passwords do not match.";return}const {error}=await db.auth.updateUser({password});$("passwordMessage").textContent=error?error.message:"Password saved. Next time, sign in with your email and password.";if(!error)e.target.reset()});
$("enableNotifications").addEventListener("click",enableNotifications);
async function enableNotifications(){
 const out=$("notificationMessage");
 if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)){out.textContent="Push notifications are not supported by this browser. On iPhone, install this app using Add to Home Screen and open that icon.";return}
 if(!activeUserId){const {data}=await db.auth.getUser();activeUserId=data.user?.id||null}
 if(!activeUserId){out.textContent="Please sign in again, then enable notifications.";return}
 if(Notification.permission==="denied"){out.textContent="Notifications are blocked in device settings. Allow notifications for CzyFit Owner, then try again.";return}
 try{
  const permission=await Notification.requestPermission();
  if(permission!=="granted"){out.textContent="Notification permission was not granted.";return}
  const registration=await navigator.serviceWorker.ready;
  let subscription=await registration.pushManager.getSubscription();
  const expectedKey=urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  if(subscription){const currentKey=subscription.options?.applicationServerKey;if(currentKey){const currentBytes=Array.from(new Uint8Array(currentKey));if(currentBytes.length!==expectedKey.length||currentBytes.some((v,i)=>v!==expectedKey[i])){await subscription.unsubscribe();subscription=null}}}
  if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:expectedKey});
  const {error}=await db.from("push_subscriptions").upsert({endpoint:subscription.endpoint,subscription:subscription.toJSON(),user_id:activeUserId},{onConflict:"endpoint"});
  if(error)throw error;
  out.textContent="Phone notifications are enabled on this device. Place a test order to verify delivery.";
 }catch(err){console.error(err);out.textContent="Could not enable notifications: "+(err.message||String(err))+". Check the push_subscriptions SQL migration and try again."}
}
$("refresh").addEventListener("click",load);$("orderSearch").addEventListener("input",renderOrders);$("statusFilter").addEventListener("change",renderOrders);$("logout").addEventListener("click",async()=>{await db.auth.signOut();activeUserId=null;show("dashboard",false);show("login",true)});
$("clearOrders").addEventListener("click",clearAllOrders);
$("orders").addEventListener("click",e=>{const button=e.target.closest("[data-delete-order]");if(button)deleteOrder(button.dataset.deleteOrder,button)});
async function syncExistingPushSubscription(){
 const out=$("notificationMessage");
 if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)){out.textContent="Push notifications are not supported here. On iPhone, install the app to your Home Screen first.";return}
 if(Notification.permission==="denied"){out.textContent="Notifications are blocked in device settings. Allow them for CzyFit Owner there.";return}
 if(Notification.permission!=="granted"){out.textContent="Not enabled on this device yet. Tap Enable notifications once; the app will reuse the saved subscription on future opens.";return}
 try{
  const registration=await navigator.serviceWorker.ready;
  const subscription=await registration.pushManager.getSubscription();
  if(!subscription){out.textContent="Permission is allowed, but this device has no push subscription. Tap Enable notifications once to reconnect it.";return}
  if(!activeUserId){const {data}=await db.auth.getUser();activeUserId=data.user?.id||null}
  if(!activeUserId){out.textContent="Sign in to reconnect this device's notifications.";return}
  const {error}=await db.from("push_subscriptions").upsert({endpoint:subscription.endpoint,subscription:subscription.toJSON(),user_id:activeUserId},{onConflict:"endpoint"});
  if(error)throw error;
  out.textContent="Notifications are on ✓ This device is connected automatically.";
 }catch(err){console.error("Could not sync existing push subscription",err);out.textContent="Could not reconnect notifications: "+(err.message||String(err));}
}
async function load(silent=false){
 show("login",false);show("dashboard",true);
 if(!silent)$("orders").innerHTML='<div class="empty">Loading orders…</div>';
 const {data,error}=await db.from("orders").select("id,order_number,customer_name,phone,customer_email,requested_date,fulfilment,delivery_address,notes,status,total_php,payment_method,payment_status,payment_plan,amount_due_now_php,amount_paid_php,balance_due_php,created_at,order_items(meal_name,quantity,unit_price_php)").order("created_at",{ascending:false}).limit(100);
 if(error){$("orders").innerHTML='<div class="empty">Could not load orders. Check that your signed-in user is in public.order_admins. '+esc(error.message)+'</div>';return}
 cachedOrders=data||[];
 for(const o of cachedOrders)seenOrderIds.add(o.id);
 $("statAll").textContent=cachedOrders.length;
 $("statNew").textContent=cachedOrders.filter(o=>["pending"].includes((o.status||"").toLowerCase())).length;
 $("statProgress").textContent=cachedOrders.filter(o=>["confirmed","preparing","ready"].includes((o.status||"").toLowerCase())).length;
 $("statRevenue").textContent=php(cachedOrders.filter(o=>!["cancelled"].includes((o.status||"").toLowerCase())).reduce((sum,o)=>sum+Number(o.total_php||0),0));
 renderOrders();
 if(!silent)syncExistingPushSubscription();
 if(!orderChannel&&db.channel){orderChannel=db.channel("czyfit-order-updates").on("postgres_changes",{event:"INSERT",schema:"public",table:"orders"},payload=>{const incoming=payload.new;if(incoming?.id&&!seenOrderIds.has(incoming.id)){showNewOrderAlert(incoming);load(true)}}).subscribe();}
}
function showNewOrderAlert(o){const msg="New CzyFit order "+(o.order_number||"received")+" · "+php(o.total_php||0);if("Notification"in window&&Notification.permission==="granted")try{new Notification("New CzyFit order",{body:msg})}catch{}const line=$("notificationMessage");if(line)line.textContent=msg+" — dashboard refreshed.";}
function renderOrders(){
 const query=($("orderSearch")?.value||"").trim().toLowerCase(),filter=$("statusFilter")?.value||"all";
 const rows=cachedOrders.filter(o=>{
  const hay=[o.order_number,o.customer_name,o.phone,o.customer_email].join(" ").toLowerCase();
  const status=(o.status||"pending").toLowerCase();
  return (!query||hay.includes(query))&&(filter==="all"||(filter==="new"?status==="pending":status===filter));
 });
 $("visibleCount").textContent="("+rows.length+")";
 if(!cachedOrders.length){$("orders").innerHTML='<div class="empty"><strong>No orders yet</strong><p>New customer orders will show up here.</p></div>';return}
 if(!rows.length){$("orders").innerHTML='<div class="empty">No orders match that search or filter.</div>';return}
 $("orders").innerHTML=rows.map(o=>{
  const status=(o.status||"pending").toLowerCase(),pay=(o.payment_status||"unpaid").toLowerCase();
  const paymentLabel=pay==="paid"?"PAID":pay==="paid_half"?"PAID HALF":pay==="verify_payment"?"VERIFY PAYMENT":pay==="pending"?"VERIFY PAYMENT":"UNPAID";
  const isNew=status==="pending"&&Date.now()-new Date(o.created_at).getTime()<24*60*60*1000;
  const items=(o.order_items||[]).map(i=>i.quantity+" × "+i.meal_name+" — "+php(i.quantity*i.unit_price_php)).join("\n")||"No item details";
  const date=o.created_at?new Date(o.created_at).toLocaleString("en-PH",{dateStyle:"medium",timeStyle:"short"}):"Date unavailable";
  return `<article class="order"><div class="order-top"><div style="min-width:0"><h3 class="order-title">${esc(o.order_number||"Order")}</h3><div class="order-meta">${esc(date)}</div><div class="chips" style="margin-top:9px;margin-bottom:0">${isNew?'<span class="chip new">✦ NEW ORDER</span>':""}<span class="chip ${esc(status)}">${status==="pending"?"AWAITING CUSTOMER CONFIRMATION":esc(status)}</span><span class="chip ${esc(pay)}">Payment: TO DISCUSS IN CHAT</span></div></div><div class="order-total">${php(o.total_php)}</div></div><div class="order-body"><div class="customer">${esc(o.customer_name||"Customer")}</div><div class="detail-grid"><div class="detail"><label>Contact</label>${esc(o.phone||"No phone")}<br>${esc(o.customer_email||"No email")}</div><div class="detail"><label>Requested date</label>${esc(o.requested_date||"Not specified")}<br>${esc(o.fulfilment||"Fulfilment not specified")}</div><div class="detail"><label>Delivery / pickup</label>${esc(o.delivery_address||"Pickup")}</div><div class="detail"><label>Payment</label>Discuss in Messenger / Instagram<br>Total: ${php(o.total_php)}<br>Not paid online</div></div><div class="items">${esc(items)}</div><div class="notes"><strong>Customer notes:</strong> ${esc(o.notes||"None")}</div><div class="order-actions"><div class="field"><label for="s-${esc(o.id)}">Order status</label><select id="s-${esc(o.id)}"><option value="pending">Awaiting customer confirmation</option><option value="confirmed">Confirmed</option><option value="preparing">Preparing</option><option value="ready">Ready</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div><div class="field"><label for="p-${esc(o.id)}">Payment status</label><select id="p-${esc(o.id)}"><option value="unpaid">Unpaid</option><option value="pending">Pending / Unpaid</option><option value="verify_payment">Verify payment</option><option value="paid_half">Paid half</option><option value="paid">Paid in full</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select></div><button class="save-button" data-save-order="${esc(o.id)}">Save changes</button><button class="delete-order-button" data-delete-order="${esc(o.id)}" type="button">Delete order</button></div></div></article>`;
 }).join("");
 for(const o of rows){const st=$("s-"+o.id),ps=$("p-"+o.id);if(st)st.value=o.status||"pending";if(ps)ps.value=o.payment_status||"unpaid"}
}
setInterval(()=>{if(db&&activeUserId&&!document.hidden)load(true)},30000);
async function saveOrder(id){const paymentStatus=$("p-"+id).value;const order=cachedOrders.find(o=>o.id===id);const total=Number(order?.total_php||0);const amountPaid=paymentStatus==="paid"?total:paymentStatus==="paid_half"?Math.ceil(total/2):0;const balance=Math.max(0,total-amountPaid);const {error}=await db.from("orders").update({status:$("s-"+id).value,payment_status:paymentStatus,amount_paid_php:amountPaid,balance_due_php:balance,updated_at:new Date().toISOString()}).eq("id",id);if(error){alert(error.message);return}await load()}


async function deleteOrder(id,button){
 const order=cachedOrders.find(o=>String(o.id)===String(id));
 if(!order){alert("This order is no longer in the current list. Refresh and try again.");return}
 const label=order.order_number||String(order.id);
 if(!window.confirm("Permanently delete order "+label+" for "+(order.customer_name||"this customer")+"? Its item details will also be deleted. This cannot be undone."))return;
 button.disabled=true;button.textContent="Deleting…";
 try{
  const {data,error}=await db.rpc("delete_order_by_id",{p_order_id:String(id)});
  if(error)throw error;
  if(Number(data)!==1)throw new Error("Order was not found or was already deleted. Refresh the dashboard.");
  cachedOrders=cachedOrders.filter(o=>String(o.id)!==String(id));seenOrderIds.delete(id);
  $("statAll").textContent=cachedOrders.length;
  $("statNew").textContent=cachedOrders.filter(o=>(o.status||"").toLowerCase()==="pending").length;
  $("statProgress").textContent=cachedOrders.filter(o=>["confirmed","preparing","ready"].includes((o.status||"").toLowerCase())).length;
  $("statRevenue").textContent=php(cachedOrders.filter(o=>(o.status||"").toLowerCase()!=="cancelled").reduce((sum,o)=>sum+Number(o.total_php||0),0));
  renderOrders();$("clearOrdersMessage").textContent="Deleted order "+label+" successfully.";
 }catch(err){console.error("Delete selected order failed",err);alert("Could not delete this order: "+(err.message||String(err))+". Confirm the selected-order SQL migration has been run.");button.disabled=false;button.textContent="Delete order";}
}

async function clearAllOrders(){
 const button=$("clearOrders"),message=$("clearOrdersMessage");
 if(!activeUserId){message.textContent="Please sign in again before clearing orders.";return}
 if(!cachedOrders.length){message.textContent="There are no orders in the dashboard list to clear.";return}
 const first=window.confirm("This permanently deletes ALL orders stored in CzyFit, including their order-item rows. This cannot be undone. Continue?");
 if(!first)return;
 const typed=window.prompt('To confirm permanent deletion of every order, type DELETE ALL ORDERS exactly:');
 if(typed!=="DELETE ALL ORDERS"){message.textContent="Nothing was deleted. Confirmation did not match.";return}
 button.disabled=true;button.textContent="Deleting orders…";message.textContent="Securely deleting orders…";
 try{
  const {data,error}=await db.rpc("clear_all_orders");
  if(error)throw error;
  seenOrderIds.clear();
  await load(true);
  message.textContent=Number(data)===1?"Successfully deleted 1 order.":`Successfully deleted ${Number(data)||0} orders.`;
 }catch(err){
  console.error("Clear all orders failed",err);
  message.textContent="Could not clear orders: "+(err.message||String(err))+". Confirm the owner cleanup SQL migration has been run in Supabase.";
 }finally{
  button.disabled=false;button.textContent="Clear all test orders";
 }
}
