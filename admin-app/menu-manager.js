(function () {
"use strict";
const DAYS=["Monday","Tuesday","Wednesday","Thursday","Friday"];
const MEALS=[["breakfast","Breakfast"],["lunch","Lunch"],["dinner","Dinner"],["snack","Snack"]];
const BUCKET="weekly-menu-images";
let current=null,photo=null,started=false;
const el=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const blank=()=>({weekLabel:"",orderBy:"",days:DAYS.map(day=>({day,breakfast:{name:"",kcal:0,p:0,c:0,f:0},lunch:{name:"",kcal:0,p:0,c:0,f:0},dinner:{name:"",kcal:0,p:0,c:0,f:0},snack:{name:"",kcal:0,p:0,c:0,f:0}})),slotsTotal:20,slotsTaken:0});
function say(s){if(el("cmMessage"))el("cmMessage").textContent=s}
function mount(){
 if(el("czyfitMenuManager"))return;
 const stats=el("statAll")?.closest(".stats");if(!stats)return;
 const box=document.createElement("section");box.id="czyfitMenuManager";
 box.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><div><h2 style="margin:0 0 5px">Weekly Menu Manager</h2><p style="margin:0;color:#777166;font-size:13px">Upload your weekly menu photo, update the meal details, preview and publish.</p></div><strong id="cmState">Loading…</strong></div><div class="cm-grid"><div><label for="cmWeek">Week label</label><input id="cmWeek" placeholder="e.g. Nov 3–7"></div><div><label for="cmDeadline">Ordering deadline</label><input id="cmDeadline" placeholder="e.g. Sat 6 PM"></div></div><div style="margin-top:12px"><label for="cmPhoto">Weekly menu photo · JPG, PNG or WebP · max 8 MB</label><input id="cmPhoto" type="file" accept="image/jpeg,image/png,image/webp"><img id="cmPreview" alt="Menu preview" hidden></div><div id="cmMeals"></div><div class="cm-actions"><button type="button" class="secondary" id="cmSave">Save draft</button><button type="button" id="cmPublish">Publish to storefront</button><button type="button" class="secondary" id="cmReload">Reload</button></div><p id="cmMessage" class="cm-message">A saved draft stays private until you publish it.</p><details><summary><strong>Menu history</strong></summary><div id="cmHistory"></div></details>';
 stats.insertAdjacentElement("afterend",box);
 const style=document.createElement("style");style.textContent='#czyfitMenuManager{margin:18px 0;padding:18px;border:1px solid #e7dccb;border-radius:18px;background:#fffdf8;color:#191816}#czyfitMenuManager h3{margin:16px 0 8px}#czyfitMenuManager label{display:block;font-size:12px;font-weight:750;margin:10px 0 5px}#czyfitMenuManager input{width:100%;min-width:0;background:#fff;border:1px solid #e7dccb;border-radius:10px;padding:10px;color:#191816;font:inherit}#czyfitMenuManager .cm-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}#czyfitMenuManager .cm-meal{border:1px solid #e7dccb;border-radius:12px;padding:12px;margin:9px 0;background:#faf5eb}#czyfitMenuManager .cm-macros{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}#czyfitMenuManager .cm-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}#czyfitMenuManager button{font:inherit;border:1px solid #191816;border-radius:999px;padding:10px 15px;background:#191816;color:white;font-weight:750;cursor:pointer}#czyfitMenuManager button.secondary{background:#fffdf8;color:#191816;border-color:#e7dccb}#czyfitMenuManager button:disabled{opacity:.55}#cmPreview{width:100%;max-height:300px;object-fit:contain;border-radius:12px;background:#f4ecdd;margin-top:10px}#czyfitMenuManager .cm-message{padding:10px 12px;border-radius:10px;background:#f4ecdd;font-size:13px}#czyfitMenuManager details{border-top:1px solid #e7dccb;padding-top:12px;margin-top:16px}@media(max-width:620px){#czyfitMenuManager{padding:14px}#czyfitMenuManager .cm-grid{grid-template-columns:1fr}#czyfitMenuManager .cm-macros{grid-template-columns:repeat(2,minmax(0,1fr))}#czyfitMenuManager .cm-actions button{flex:1}}';
 document.head.appendChild(style);
 el("cmMeals").innerHTML=DAYS.map(day=>'<div><h3>'+day+'</h3>'+MEALS.map(([key,label])=>'<div class="cm-meal"><strong>'+label+'</strong><label>Meal name<input data-m="'+day+'|'+key+'|name" placeholder="'+label+' name"></label><div class="cm-macros">'+[["kcal","Calories (kcal)"],["p","Protein (g)"],["c","Carbs (g)"],["f","Fat (g)"]].map(([k,l])=>'<label>'+l+'<input type="number" min="0" step="0.1" data-m="'+day+'|'+key+'|'+k+'" value="0"></label>').join("")+'</div></div>').join("")+'</div>').join("");
 el("cmPhoto").addEventListener("change",()=>{photo=el("cmPhoto").files?.[0]||null;if(!photo){el("cmPreview").hidden=true;return}if(!/^image\/(jpeg|png|webp)$/.test(photo.type)||photo.size>8*1024*1024){say("Please choose a JPG, PNG or WebP image smaller than 8 MB.");photo=null;el("cmPhoto").value="";return}el("cmPreview").src=URL.createObjectURL(photo);el("cmPreview").hidden=false});
 el("cmSave").onclick=()=>save(false);el("cmPublish").onclick=()=>save(true);el("cmReload").onclick=load;
}
function fill(d){
 d=d||blank();el("cmWeek").value=d.weekLabel||"";el("cmDeadline").value=d.orderBy||"";
 for(const day of DAYS)for(const [key] of MEALS)for(const f of ["name","kcal","p","c","f"]){const m=(d.days||[]).find(x=>x.day===day)?.[key]||{};const input=document.querySelector('[data-m="'+day+"|"+key+"|"+f+'"]');if(input)input.value=m[f]??(f==="name"?"":0)}
 if(d.image_url){el("cmPreview").src=d.image_url;el("cmPreview").hidden=false}else el("cmPreview").hidden=true;
}
function collect(){
 const d=blank();d.weekLabel=el("cmWeek").value.trim();d.orderBy=el("cmDeadline").value.trim();
 d.days=DAYS.map(day=>{const row={day};for(const [key] of MEALS){const v=f=>document.querySelector('[data-m="'+day+"|"+key+"|"+f+'"]')?.value;row[key]={name:String(v("name")||"").trim(),kcal:Number(v("kcal")||0),p:Number(v("p")||0),c:Number(v("c")||0),f:Number(v("f")||0),image:null}}return row});
 return d;
}
function validate(d){if(!d.weekLabel)return"Enter a week label.";if(!d.orderBy)return"Enter the ordering deadline.";for(const day of d.days)for(const [key,label] of MEALS){const m=day[key];if(!m.name)return"Enter "+day.day+" "+label.toLowerCase()+".";if(["kcal","p","c","f"].some(k=>!Number.isFinite(m[k])||m[k]<0))return"Check the macro values for "+day.day+" "+label+"."}return""}
async function load(){
 try{
  say("Loading saved menus…");
  const {data,error}=await db.from("weekly_menus").select("*").order("updated_at",{ascending:false}).limit(20);if(error)throw error;
  const mine=(data||[]).filter(r=>r.owner_id===activeUserId),draft=mine.find(r=>r.status==="draft"),live=(data||[]).find(r=>r.status==="published");
  current=draft||live||null;
  if(current){fill({...current.menu_data,weekLabel:current.week_label,orderBy:current.order_by,image_url:current.image_url});el("cmState").textContent=current.status==="published"?"Published menu":"Draft loaded"}else{const r=await fetch("../data/menu.json",{cache:"no-store"});fill(r.ok?await r.json():blank());el("cmState").textContent="No published menu"}
  say("Edit the meals below. Saving a draft will not change the customer storefront.");history(data||[]);
 }catch(e){el("cmState").textContent="Setup required";say("Menu Manager needs its Supabase setup. Run supabase/migrations/20261030_weekly_menu_manager.sql in Supabase SQL Editor, then reload. Details: "+(e.message||e));}
}
function history(rows){const h=el("cmHistory");if(!rows.length){h.textContent="No menu history yet.";return}h.innerHTML=rows.map(r=>'<p style="display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid #e7dccb;padding:7px 0"><span><strong>'+esc(r.week_label)+'</strong> · '+esc(r.status)+'</span><button type="button" class="secondary" data-load="'+esc(r.id)+'">Load</button></p>').join("");h.querySelectorAll("[data-load]").forEach(b=>b.onclick=()=>{const r=rows.find(x=>x.id===b.dataset.load);if(r){current=r;fill({...r.menu_data,weekLabel:r.week_label,orderBy:r.order_by,image_url:r.image_url});el("cmState").textContent=r.status+" menu loaded";say("Loaded "+r.week_label+". Save as draft or publish when ready.")}})}
async function save(publish){
 const menu=collect(),problem=validate(menu);if(problem){say(problem);return}
 const button=el(publish?"cmPublish":"cmSave");el("cmSave").disabled=el("cmPublish").disabled=true;say(publish?"Publishing menu…":"Saving draft…");
 try{
  let path=current?.image_path||null,url=current?.image_url||null;
  if(photo){if(!activeUserId)throw Error("Please sign in again.");const ext=photo.type==="image/png"?"png":photo.type==="image/webp"?"webp":"jpg";path=activeUserId+"/"+crypto.randomUUID()+"."+ext;const up=await db.storage.from(BUCKET).upload(path,photo,{contentType:photo.type,upsert:false});if(up.error)throw up.error;url=db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}
  const id=current?.status==="draft"?current.id:crypto.randomUUID();
  const saved=await db.from("weekly_menus").upsert({id,owner_id:activeUserId,week_label:menu.weekLabel,order_by:menu.orderBy,image_path:path,image_url:url,menu_data:menu,status:"draft",updated_at:new Date().toISOString()},{onConflict:"id"}).select().single();if(saved.error)throw saved.error;current=saved.data;photo=null;el("cmPhoto").value="";
  if(publish){const old=await db.from("weekly_menus").update({status:"archived",updated_at:new Date().toISOString()}).eq("status","published").neq("id",current.id);if(old.error)throw old.error;const live=await db.from("weekly_menus").update({status:"published",published_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",current.id).select().single();if(live.error)throw live.error;current=live.data;el("cmState").textContent="Published · "+menu.weekLabel;say("Published! The storefront will load "+menu.weekLabel+" automatically. No GitHub edit or redeployment is needed.");}
  else{el("cmState").textContent="Draft saved · "+menu.weekLabel;say("Draft saved. Your current published menu remains live.");}
  fill({...current.menu_data,weekLabel:current.week_label,orderBy:current.order_by,image_url:current.image_url});const h=await db.from("weekly_menus").select("*").order("updated_at",{ascending:false}).limit(20);if(!h.error)history(h.data||[]);
 }catch(e){say("Could not "+(publish?"publish":"save")+" menu: "+(e.message||e));}
 finally{el("cmSave").disabled=el("cmPublish").disabled=false}
}
window.initCzyfitMenuManager=function(){if(!el("dashboard")||el("dashboard").classList.contains("hidden"))return;if(!started){mount();started=true;load()}};
})();