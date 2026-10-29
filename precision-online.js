/* Authenticated run receipts and retryable uploads; never submit an unstarted offline result. */
(() => {
 'use strict';
 window.PotatoPrecisionOnline={create(bridge){
  const key=id=>'10potatoes_precision_pending_v1:'+id,memory=new Map();let flight=null;
  const read=id=>{if(memory.has(id))return memory.get(id);try{const q=JSON.parse(localStorage.getItem(key(id))||'[]');return Array.isArray(q)?q:[];}catch{return [];}};
  const write=(id,q)=>{memory.set(id,q);try{localStorage.setItem(key(id),JSON.stringify(q));}catch{}};
  const status=(text,id,retry=false)=>bridge.status?.(text,id,retry);
  function start(){
   const ticket={id:crypto.randomUUID(),owner:null,promise:null};
   ticket.promise=bridge.api('start',{id:ticket.id}).then(r=>{ticket.owner=r.user_id;return r;}).catch(()=>null);return ticket;
  }
  async function sync(){
   const owner=bridge.identity();
   if(flight){if(flight.owner===owner)return flight.promise;await flight.promise;return sync();}
   const work=async()=>{
    for(const item of read(owner).slice()){
     try{await bridge.api('finish',{id:item.id,placed:item.placed,errors:item.errors},owner);
      write(owner,read(owner).filter(v=>v.id!==item.id));status('Risultato registrato in classifica.',item.id);
     }catch{status('Invio in attesa: il risultato resta salvato sul dispositivo.',item.id,true);break;}
    }
   };
   const promise=work().finally(()=>{flight=null;});flight={owner,promise};return promise;
  }
  async function finish(result,ticket){
   if(!ticket)return;
   status('Registrazione in classifica…',ticket.id);
   const receipt=await ticket.promise;
   if(!receipt||ticket.owner!==bridge.identity()){status('Risultato locale: avvia una nuova partita con connessione attiva per entrare in classifica.',ticket.id);return;}
   write(ticket.owner,[...read(ticket.owner).filter(v=>v.id!==ticket.id),{id:ticket.id,placed:result.placed,errors:result.errors}]);
   await sync();
  }
  window.addEventListener('online',()=>{void sync();});
  return {start,finish,sync};
 }};
})();
