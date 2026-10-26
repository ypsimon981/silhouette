/* One persistent AdSense unit per page. Screen changes never refresh it. */
(()=>{
 'use strict';
 const slot=document.getElementById('adSlot');
 if(!slot)return;
 const preferenceButtons=[];
 for(const host of [document.querySelector('#homePage .homeLinks'),document.querySelector('.profilePanel')]){
  if(!host)continue;
  const links=document.createElement('div');
  links.style.cssText='display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:12px;font-size:13px';
  const privacy=document.createElement('a');privacy.href='./privacy.html';privacy.textContent='Privacy e cookie';privacy.style.color='inherit';
  const preferences=document.createElement('button');preferences.type='button';preferences.textContent='Preferenze pubblicitarie';preferences.hidden=true;
  preferences.addEventListener('click',()=>window.googlefc.callbackQueue.push({CONSENT_API_READY:()=>window.googlefc.showRevocationMessage()}));
  preferenceButtons.push(preferences);links.append(privacy,preferences);host.append(links);
 }
 window.googlefc=window.googlefc||{};
 window.googlefc.callbackQueue=window.googlefc.callbackQueue||[];
 window.googlefc.callbackQueue.push({CONSENT_API_READY:()=>{
  if(typeof window.googlefc.showRevocationMessage==='function')preferenceButtons.forEach(button=>button.hidden=false);
 }});
 let requested=false,consented=false,subscribed=false;
 const queue=()=>window.adsbygoogle=window.adsbygoogle||[];
 queue().pauseAdRequests=1;
 function request(){
  if(requested||!consented||document.hidden||!slot.getBoundingClientRect().width||getComputedStyle(slot).display==='none')return;
  const unit=document.createElement('ins');
  unit.className='adsbygoogle';
  unit.style.cssText='display:block;width:100%;height:50px';
  unit.dataset.adClient='ca-pub-9232853493225235';
  unit.dataset.adSlot='9578314917';
  unit.dataset.fullWidthResponsive='false';
  slot.replaceChildren(unit);
  requested=true;
  queue().push({});
  window.dispatchEvent(new CustomEvent('timeshapes:ad-request',{detail:{slot:'9578314917'}}));
 }
 function consent(data,success){
  if(!success||!data||!['tcloaded','useractioncomplete'].includes(data.eventStatus))return;
  consented=data.gdprApplies===false||(data.gdprApplies===true&&data.purpose?.consents?.[1]===true&&data.vendor?.consents?.[755]===true);
  queue().pauseAdRequests=consented?0:1;
  request();
 }
 function connect(){
  if(!subscribed&&typeof window.__tcfapi==='function'){
   subscribed=true;
   window.__tcfapi('addEventListener',2,consent);
  }
 }
 window.addEventListener('timeshapes:ad-screen',()=>{connect();request()});
 document.addEventListener('visibilitychange',()=>{connect();request()});
 window.addEventListener('resize',request);
 new MutationObserver(request).observe(slot,{attributes:true,attributeFilter:['style']});
 const timer=setInterval(()=>{connect();if(subscribed)clearInterval(timer)},1000);
 connect();request();
})();
