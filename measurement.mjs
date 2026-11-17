// First-party, anonymous visit measurements. No cookies, form data, URLs or personal identifiers.
export function visibleHalf(rect,width,height){if(rect.width<=0||rect.height<=0)return false;const w=Math.max(0,Math.min(rect.right,width)-Math.max(rect.left,0));const h=Math.max(0,Math.min(rect.bottom,height)-Math.max(rect.top,0));return w*h>=rect.width*rect.height*.5;}
export function createDwell(){const since=new Map();return (key,visible,now)=>{if(!visible){since.delete(key);return false;}if(!since.has(key))since.set(key,now);return now-since.get(key)>=1000;};}
export function startMeasurement(win,doc){
 if(win.navigator.doNotTrack==='1'||win.navigator.globalPrivacyControl===true)return;
 const key='medina-measurement-short-v1';let session;try{session=JSON.parse(win.sessionStorage.getItem(key)||'null');}catch{}
 if(!session||!/^([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/.test(session.id||'')||!Array.isArray(session.sent)||session.sent.some(e=>!['visit','offer_view','whatsapp_offer','whatsapp_support','skip_offer',...Array.from({length:10},(_,i)=>`scene_${i+1}`)].includes(e))||!Number.isFinite(session.started)||session.started<0||session.started>Date.now()||Date.now()-session.started>30*60*1000)session={id:win.crypto.randomUUID(),started:Date.now(),sent:[]};
 const sent=new Set(session.sent),pending=new Set(),dwell=createDwell();let busy=false, nextRetry=0, failures=0;
 const save=()=>{try{win.sessionStorage.setItem(key,JSON.stringify({...session,sent:[...sent]}));}catch{}};
 const device=win.matchMedia('(max-width: 700px)').matches?'mobile':'desktop';
 const add=event=>{if(!sent.has(event)){pending.add(event);}};
 async function flush(){if(busy||!pending.size||Date.now()<nextRetry)return;busy=true;const batch=[...pending];try{const response=await win.fetch('/api/measurement',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visit:session.id,device,events:batch}),credentials:'omit',keepalive:true});if(!response.ok)throw new Error("Measurement unavailable");if(response.ok){failures=0;nextRetry=0;batch.forEach(e=>{pending.delete(e);sent.add(e);});save();}}catch{failures++;nextRetry=Date.now()+Math.min(60000,2000*2**Math.min(failures-1,5));}finally{busy=false;}}
 add('visit');save();flush();
 const slides=[...doc.querySelectorAll('[data-story-slide]')],price=doc.querySelector('.offer__price');
 function check(){const active=doc.visibilityState==='visible';const now=Date.now();const width=win.innerWidth,height=win.innerHeight;
 if(price&&dwell('offer_view',active&&visibleHalf(price.getBoundingClientRect(),width,height),now))add('offer_view');
 slides.forEach((slide,i)=>{const style=win.getComputedStyle(slide);const visible=active&&slide.getAttribute('aria-hidden')==='false'&&Number(style.opacity)>=.5&&visibleHalf((slide.querySelector('.story-copy')||slide).getBoundingClientRect(),width,height);if(dwell(`scene_${i+1}`,visible,now))add(`scene_${i+1}`);});flush();}
 const interval=win.setInterval(check,250);
 doc.addEventListener('visibilitychange',()=>{check();flush();});
 doc.querySelector('.skip-link')?.addEventListener('click',()=>{add('skip_offer');flush();});
 doc.querySelector('.offer__cta')?.addEventListener('click',()=>{add('whatsapp_offer');flush();});
 doc.querySelector('.support__cta')?.addEventListener('click',()=>{add('whatsapp_support');flush();});
 win.addEventListener('pagehide',()=>{flush();});
 return ()=>win.clearInterval(interval);
}
if(typeof window!=='undefined')startMeasurement(window,document);
