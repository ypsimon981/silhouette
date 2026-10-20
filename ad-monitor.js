/* Opt-in measurement only. Never requests ads or infers SDK impressions. */
(function(root){
'use strict';
function createMonitor(now=()=>performance.now()){
 let origin=now(),last=origin,state=null,visit=null,visibleSince=null,stopped=false;
 const seen=new Set(),nativeSeen=new Set();
 const data={schemaVersion:2,startedAt:new Date().toISOString(),pageVisits:0,eligibleOpportunities:0,qualifiedOpportunities:0,contextChanges:0,bannerAppearances:0,gamesStarted:0,gamesCompleted:0,gamesTimedOut:0,gamesAbandoned:0,foregroundMs:0,backgroundMs:0,gameplayMs:0,adScreenMs:0,bannerVisibleMs:0,byPage:{},byContext:{},native:{request:0,loaded:0,failed:0,shown:0,impression:0,paid:0,revenueMicrosByCurrency:{}},events:[],eventsDropped:0};
 const event=(type,extra={})=>{const row={ms:Math.round(now()-origin),type,...extra};if(data.events.length<5000)data.events.push(row);else data.eventsDropped++};
 const bucket=(collection,key)=>collection[key]||(collection[key]={visits:0,opportunities:0,qualified:0,dwellMs:0,bannerVisibleMs:0});
 function accrue(){
  const t=now(),dt=Math.max(0,t-last);last=t;
  if(!state)return;
  if(!state.foreground){data.backgroundMs+=dt;return}
  data.foregroundMs+=dt;
  if(state.phase==='playing'&&state.page==='gioco')data.gameplayMs+=dt;
  bucket(data.byPage,state.page).dwellMs+=dt;
  bucket(data.byContext,state.context).dwellMs+=dt;
  if(state.eligible)data.adScreenMs+=dt;
  if(state.visible){data.bannerVisibleMs+=dt;bucket(data.byPage,state.page).bannerVisibleMs+=dt;bucket(data.byContext,state.context).bannerVisibleMs+=dt}
  if(visit&&!visit.qualified&&visibleSince!==null&&t-visibleSince>=1000){visit.qualified=true;data.qualifiedOpportunities++;bucket(data.byPage,state.page).qualified++;bucket(data.byContext,state.context).qualified++;event('qualified_opportunity',{page:state.page,visitId:visit.id})}
 }
 function observe(next){
  if(stopped)return;accrue();
  next={...next,eligible:['livelli','classifica','performance'].includes(next.page)};
  next.visible=!!(next.visible&&next.foreground&&next.eligible);
  const changed=!state||next.page!==state.page;
  if(changed){
   data.pageVisits++;const b=bucket(data.byPage,next.page);b.visits++;
   visit={id:data.pageVisits,qualified:false};
   if(next.eligible){data.eligibleOpportunities++;b.opportunities++}
   event('page_view',{page:next.page,visitId:visit.id,returnVisit:seen.has(next.page),eligible:next.eligible});seen.add(next.page);
  }
  if(!state||next.context!==state.context){
   const b=bucket(data.byContext,next.context);b.visits++;if(changed&&next.eligible)b.opportunities++;
   if(!changed){data.contextChanges++;event('context_change',{page:next.page,context:next.context,visitId:visit.id})}
  }
  if(next.visible&&(!state||!state.visible)){data.bannerAppearances++;event('placeholder_visible',{page:next.page})}
  if(changed||!next.visible||!state||!state.visible)visibleSince=next.visible?now():null;
  state=next;
 }
 function game(kind,detail={}){
  if(stopped)return;accrue();const key={start:'gamesStarted',complete:'gamesCompleted',timeout:'gamesTimedOut',abandon:'gamesAbandoned'}[kind];
  if(!key)throw Error('Unknown game event');data[key]++;event('game_'+kind,detail);
 }
 function native(e){
  if(stopped)return false;accrue();
  if(!e||!['request','loaded','failed','shown','impression','paid'].includes(e.type)||!e.eventId||!e.adId||!['android','ios'].includes(e.platform))return false;
  if(e.type==='paid'&&(!Number.isSafeInteger(e.valueMicros)||e.valueMicros<0||! /^[A-Z]{3}$/.test(e.currency||'')))return false;
  const key=e.platform+':'+e.type+':'+e.eventId;
  if(nativeSeen.has(key))return false;nativeSeen.add(key);data.native[e.type]++;
  if(e.type==='paid')data.native.revenueMicrosByCurrency[e.currency]=(data.native.revenueMicrosByCurrency[e.currency]||0)+e.valueMicros;
  event('ad_'+e.type,{adId:e.adId,eventId:e.eventId,platform:e.platform,page:state?.page,eligibleAtCallback:!!state?.eligible,valueMicros:e.valueMicros,currency:e.currency,precision:e.precision});return true;
 }
 function report(){if(!stopped)accrue();return JSON.parse(JSON.stringify({...data,elapsedSeconds:(last-origin)/1000,stopped,note:'Placeholder visibility >=1s is a custom opportunity threshold, not an AdMob impression. Native counters only change via explicit SDK bridge calls.'}))}
 function stop(){if(!stopped){accrue();stopped=true;event('session_end')}return report()}
 return {observe,game,native,report,stop,summary:()=>({elapsedSeconds:(last-origin)/1000,qualifiedOpportunities:data.qualifiedOpportunities})};
}
if(typeof module==='object')module.exports={createMonitor};else root.TimeshapesAdMonitor={createMonitor};
})(typeof window==='undefined'?globalThis:window);
