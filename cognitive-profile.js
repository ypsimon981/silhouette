/* Personal profile v1. Raw measurements are private and independent of rankings. */
(() => {
 'use strict';
 const MODES=[1,2,4,7,8,9,10,11,12,13],KEY='10potatoes_cognitive_v1:';
 const read=(id)=>{try{const s=JSON.parse(localStorage.getItem(KEY+id)||'null');if(s&&Array.isArray(s.records)&&Array.isArray(s.queue))return s;}catch{}return {records:[],queue:[],data:null};};
 const own=(id)=>String(id||'');
 window.PotatoCognitive={create(bridge){
  let identity=own(bridge.identity()),busy=false,shown=false,error='',flight=null;
  const memory=new Map();
  const getState=id=>memory.get(id)||read(id);
  const state=()=>getState(identity);
  function write(s,id=identity){memory.set(id,s);try{localStorage.setItem(KEY+id,JSON.stringify(s));memory.delete(id);return true;}catch{error='Il dispositivo non riesce a salvare nuovi dati. Mantieni la pagina aperta e riprova con una connessione attiva.';return false;}}
  function enqueue(item){const s=state();if(!s.queue.some(v=>v.key===item.key))s.queue.push(item);write(s);}
  function record(e,owner){
   if(!MODES.includes(e.level))return;
   const id=own(owner),s=getState(id);
   if(s.records.some(v=>v.id===e.id))return;
   s.records.push(e);s.queue.push({key:e.id,action:'sync',data:{events:[e]}});write(s,id);
   if(id===identity)void sync();
  }
  async function sync(){
   if(flight)return flight;
   const id=identity;
   const work=async()=>{
    const queued=getState(id).queue.slice();
    for(const item of queued){
     const result=await bridge.api(item.action,item.data,id);
     if(result.user_id!==id)throw Error('Profilo cambiato. Riapri la pagina.');
     const latest=getState(id);latest.queue=latest.queue.filter(q=>q.key!==item.key);write(latest,id);
    }
    const data=await bridge.api('read',{},id);
    if(data.user_id!==id||identity!==id)return;
    const latest=getState(id);latest.data=data;write(latest,id);error='';
    // A previous page was closed during a trial. It consumed the attempt.
    if(data.last_trial?.status==='running'&&!bridge.training()&&!getState(id).queue.some(q=>q.key==='trial:'+data.last_trial.id)){
     enqueue({key:'trial:'+data.last_trial.id,action:'trial_finish',data:{id:data.last_trial.id,outcome:'failed'}});
     const ended=await bridge.api('trial_finish',{id:data.last_trial.id,outcome:'failed'},id);
     const after=getState(id);after.queue=after.queue.filter(q=>q.key!=='trial:'+data.last_trial.id);after.data.last_trial=ended.trial;write(after,id);
    }
   };
   flight=work().catch(e=>{if(identity===id)error=e.message||'Connessione assente: i dati restano salvati sul dispositivo.';}).finally(()=>{flight=null;if(shown)render();if(!error&&identity===id&&getState(id).queue.length)void sync();});return flight;
  }
  function setIdentity(id){const next=own(id);if(next===identity)return;identity=next;error='';if(shown){render();void sync().then(()=>{if(shown&&identity===next)void sync();});}}
  async function start(){
   if(busy)return;busy=true;render();
   const id=identity;
   try{
    await sync();if(identity!==id)throw Error('Profilo aggiornato: premi di nuovo per iniziare.');
    if(getState(id).queue.length)throw Error('Attendi il salvataggio dei dati prima di iniziare.');
    const result=await bridge.api('trial_start',{},id);
    if(identity!==id||result.user_id!==id)return;
    const s=state();s.data={...s.data,used:result.trial.ordinal,last_trial:result.trial};write(s);
    bridge.startTraining(result.trial);error='';
   }catch(e){error=e.message||'La prova richiede una connessione attiva.';}
   finally{busy=false;render();}
  }
  function finish(trial,times,completed){
   enqueue({key:'trial:'+trial.id,action:'trial_finish',data:{id:trial.id,outcome:completed?'completed':'failed',...(completed?{times}: {})}});
   const s=state();if(s.data)s.data.last_trial={...trial,status:completed?'saving':'failed',score:completed?null:0};write(s);
   void sync();
  }
  function render(){
   const root=document.getElementById('cognitiveOverview');if(!root)return;
   const s=state(),d=s.data,p=d?.profile,unlocked=p?.unlocked===true;
   const scores=[null,p?.precision??null,p?.consistency??null,p?.adaptability??null,null];
   const format=v=>Number.isFinite(v)?Math.round(v)+'/100':'—';
   const names=['Velocità','Precisione','Costanza','Adattabilità','Percezione'];
   const descriptions=[
    'Il confronto con gli altri giocatori sarà disponibile in seguito.',
    '100 × incastri riusciti / rilasci. Media dei 10 livelli, sugli ultimi 20 tentativi misurati per livello, comprese interruzioni e timeout. Servono almeno 3 partite completate con i nuovi dati per ogni livello. I rilasci annullati dal dispositivo non contano.',
    '100 × (1 − deviazione standard / tempo medio), con minimo 0. Media dei 10 livelli sugli ultimi 20 completamenti di ciascun livello. Prestazioni identiche valgono 100; una variabilità relativa del 20% vale 80.',
    'Confronto con la mediana dei propri ultimi 20 completamenti di ogni livello, fissata prima della prova. Per ogni tappa: riferimento / tempo, con massimo 1; la media geometrica delle tre tappe × 100 dà il risultato. Conta il miglior tentativo di ogni giorno, poi la media degli ultimi 30 giorni. Nessun calo nei primi 3 giorni senza prove; poi riduzione graduale, fino al 30% in un mese. Senza prove nella finestra il dato resta da aggiornare. Una prova fallita vale 0.',
    'Il confronto con gli altri giocatori sarà disponibile in seguito.'
   ];
   const cards=[...root.querySelectorAll('.cognitiveSkill')];
   cards.forEach((card,i)=>{
    const summary=card.querySelector('summary');let value=summary.querySelector('.cognitiveScore');
    if(!value){value=document.createElement('strong');value.className='cognitiveScore';summary.insertBefore(value,summary.lastElementChild);}
    value.textContent=format(scores[i]);value.setAttribute('aria-label',names[i]+': '+(Number.isFinite(scores[i])?format(scores[i]):'dati non ancora disponibili'));
    card.querySelector('p').textContent=descriptions[i];
   });
   const measured=scores.filter(Number.isFinite).length;
   root.querySelector('.cognitiveBadge').textContent=measured?measured+' capacità attive':d?'Raccolta dati':'Caricamento';
   root.querySelector('.cognitiveRadarPending').textContent=measured?measured+' su 5 attive':'Raccolta dati';
   root.querySelector('.cognitiveRadar p').textContent='Velocità e percezione: in attesa del confronto con gli altri giocatori.';
   const svg=root.querySelector('.cognitiveRadar svg');svg.querySelector('.cognitiveMeasured')?.remove();
   const ns='http://www.w3.org/2000/svg',g=document.createElementNS(ns,'g');g.classList.add('cognitiveMeasured');
   const points=scores.map((v,i)=>{if(!Number.isFinite(v))return null;const a=(-90+i*72)*Math.PI/180,r=85*Math.max(0,Math.min(100,v))/100;return [170+Math.cos(a)*r,130+Math.sin(a)*r];});
   let segment=[];const draw=()=>{if(segment.length>1){const line=document.createElementNS(ns,'polyline');line.setAttribute('points',segment.map(v=>v.join(',')).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','#f4cf79');line.setAttribute('stroke-width','3');g.append(line);}segment=[];};
   points.forEach(point=>{if(point)segment.push(point);else draw();});draw();
   points.forEach((point,i)=>{if(!point)return;const c=document.createElementNS(ns,'circle');c.setAttribute('cx',point[0]);c.setAttribute('cy',point[1]);c.setAttribute('r','4');c.setAttribute('fill','#ffe4a2');const t=document.createElementNS(ns,'title');t.textContent=names[i]+': '+format(scores[i]);c.append(t);g.append(c);});svg.append(g);
   svg.querySelector('desc').textContent=names.map((n,i)=>n+': '+format(scores[i])).join('. ');
   let status=root.querySelector('#cognitiveStatus');if(!status){status=document.createElement('p');status.id='cognitiveStatus';status.setAttribute('role','status');root.querySelector('.cognitiveIntro').after(status);}
   const ready=(d?.counts||[]).filter(v=>v.completed>=3).length;
   status.textContent=d?(!d.unlocked?ready+'/10 livelli con almeno 3 completamenti.':!unlocked?'Requisiti raggiunti: aggiornamento del profilo in corso.':'Profilo del '+p.day.split('-').reverse().join('/')+'. Le nuove capacità compaiono appena pronte; i valori già visibili vengono ricalcolati a giornata conclusa, alla prima apertura successiva.'):'Collegamento al tuo storico personale…';
   if(unlocked&&p.precision===null)status.textContent+=' Precisione: '+(p.precision_levels||0)+'/10 livelli con almeno 3 completamenti misurati.';
   let coverage=root.querySelector('#cognitiveCoverage');if(!coverage){coverage=document.createElement('p');coverage.id='cognitiveCoverage';status.after(coverage);}
   coverage.textContent=(d?.counts||[]).map((v,i)=>'L'+(i+1)+': '+Math.min(3,v.completed)+'/3').join(' · ');
   let trial=root.querySelector('#cognitiveTraining');if(!trial){trial=document.createElement('section');trial.id='cognitiveTraining';trial.innerHTML='<h4>Prova di adattabilità</h4><p></p><button type="button">Inizia la prova quotidiana</button><p class="cognitiveTrialResult" role="status"></p>';root.querySelector('.cognitiveRules').before(trial);trial.querySelector('button').onclick=start;}
   const remaining=Math.max(0,3-(d?.used||0));
   trial.querySelector('p').textContent='Tre livelli casuali: uno tra L1–L3, uno tra L4–L6 e uno tra L7–L10. '+remaining+' tentativi disponibili oggi. Uscire, riavviare o chiudere la pagina consuma il tentativo. La prova richiede una connessione attiva.';
   trial.querySelector('button').disabled=busy||!d?.unlocked||remaining===0;
   trial.querySelector('button').textContent=busy?'Preparazione…':'Inizia la prova quotidiana';
   const last=d?.last_trial;trial.querySelector('.cognitiveTrialResult').textContent=last?.status==='completed'?'Ultima prova: '+format(last.score)+'. Se è la prima valutazione, compare subito; le successive entrano nel prossimo aggiornamento giornaliero.':last?.status==='failed'?'Ultima prova interrotta o non completata: tentativo consumato.':last?.status==='saving'?'Prova completata: salvataggio in corso.':'';
   root.querySelector('.cognitiveRules h4').textContent='Come viene calcolato';
   root.querySelector('.cognitiveRules p').textContent='Almeno 3 partite completate in ciascuno dei 10 livelli ordinari. Le classifiche restano accessibili da subito. Le prove di adattabilità non modificano record, classifiche o riferimenti delle partite ordinarie.';
   root.querySelectorAll('.cognitiveRules p')[1].textContent='Scala personale 0–100, versione 1. Ogni livello pesa allo stesso modo per precisione e costanza. Apri le capacità per leggere le formule. Dati e storico sono privati e salvati nel tuo profilo; le nuove misurazioni offline restano in attesa sul dispositivo.';
   let note=root.querySelector('#cognitiveSaveStatus');if(!note){note=document.createElement('p');note.id='cognitiveSaveStatus';note.setAttribute('role','status');root.append(note);}
   note.textContent=error?'Salvataggio o aggiornamento non riuscito. '+(s.queue.length?s.queue.length+' misurazioni in attesa sul dispositivo. ':'')+'Riapri questa pagina con una connessione attiva.':s.queue.length?s.queue.length+' misurazioni in attesa di salvataggio.':'Storico personale salvato.';
  }
  window.addEventListener('online',()=>{if(shown||state().queue.length)void sync();});
  return {record,setIdentity,finish,show(){identity=own(bridge.identity());shown=true;render();void sync();},hide(){shown=false;},sync};
 }};
})();

