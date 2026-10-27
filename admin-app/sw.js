self.addEventListener("install",event=>{event.waitUntil(self.skipWaiting())});
self.addEventListener("activate",event=>{event.waitUntil(self.clients.claim())});
self.addEventListener("push",event=>{
 let data={title:"New CzyFit order",body:"A new order has arrived. Tap to view it.",url:"./"};
 try{if(event.data){const parsed=event.data.json();data={...data,...parsed}}}catch{}
 event.waitUntil(self.registration.showNotification(data.title||"New CzyFit order",{body:data.body||"A new order has arrived.",icon:"../assets/czyfit-mark.svg",badge:"../assets/czyfit-mark.svg",data:{url:data.url||"./"},tag:"czyfit-new-order",renotify:true}));
});
self.addEventListener("notificationclick",event=>{event.notification.close();const target=new URL(event.notification.data?.url||"./",self.location.href).href;event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{for(const client of list){if("focus" in client){client.navigate(target);return client.focus()}}return self.clients.openWindow(target)}))});
