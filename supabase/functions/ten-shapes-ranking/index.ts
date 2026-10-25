// Public reads preserve the existing API. All writes verify the Auth user.
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const headers={'Access-Control-Allow-Origin':Deno.env.get('SOCIAL_WEB_ORIGIN')||'https://ypsimon981.github.io','Access-Control-Allow-Headers':'content-type,apikey,authorization','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
const auth={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function rpc(name:string,data:unknown){const r=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:auth,body:JSON.stringify(data),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('RPC unavailable');return r.json();}
export async function handle(req:Request):Promise<Response>{
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{headers});
 try{
  if(req.method==='GET'){
   const p=new URL(req.url).searchParams,level=Number(p.get('level')||1),id=p.get('player_id')||'',country=(p.get('country')||'IT').toUpperCase();
   if(!Number.isInteger(level)||level<1||level>17||!/^[A-Z]{2}$/.test(country))return reply({error:'Parametri non validi'},400);
   const scope=['world','national','friends'].includes(p.get('scope')||'')?p.get('scope')!:'world';
   const candidate=p.get('action')==='positions'?Number(p.get('time_ms')):null;
   if(candidate!==null&&(!uuid.test(id)||!Number.isInteger(candidate)||candidate<1500||candidate>(level===14?600000:level===15||level===16?300000:60000)))return reply({error:'Tempo non valido'},400);
   const read=(s:string)=>rpc('shapes_social_rank_read',{mode_id:level,scope_value:s,who:uuid.test(id)?id:null,cc:country,candidate});
   if(candidate!==null){const scopes=['friends','national','world'];const results=await Promise.all(scopes.map(read));return reply({positions:Object.fromEntries(scopes.map((s,i)=>[s,{rank:results[i].my_rank,total:results[i].total}])),has_demo:results.some(x=>x.has_demo)});}
   return reply(await read(scope));
  }
  if(req.method!=='POST')return reply({error:'Metodo non consentito'},405);
  const bearer=req.headers.get('Authorization');if(!bearer?.startsWith('Bearer '))return reply({error:'Aggiorna il gioco: accesso autenticato richiesto'},401);
  const identity=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:bearer},signal:AbortSignal.timeout(10000)});
  if(!identity.ok)return reply({error:'Sessione non valida'},401);const user=await identity.json();
  const raw=await req.text();if(raw.length>8192)return reply({error:'Richiesta troppo grande'},413);
  let b;try{b=JSON.parse(raw);}catch{return reply({error:'JSON non valido'},400);}
  if(b.player_id!==user.id)return reply({error:'Profilo non autorizzato'},403);
  const name=String(b.nickname||'').trim(),cc=String(b.country||'').toUpperCase();
  if(name.length<2||name.length>20||!/^[\p{L}\p{N} _.-]+$/u.test(name)||!/^[A-Z]{2}$/.test(cc))return reply({error:'Profilo non valido'},400);
  if(b.action==='rename'){
   const r=await fetch(url+'/rest/v1/ten_shapes_scores?player_id=eq.'+user.id,{method:'PATCH',headers:auth,body:JSON.stringify({nickname:name,country:cc})});
   if(!r.ok)throw Error('rename');return reply({renamed:true});
  }
  const level=Number(b.level),ms=Number(b.time_ms);
  if(b.action!=='score'||![1,2,4,7,8,9,10,11,12,13,14,17].includes(level)||!Number.isInteger(ms)||ms<1500||ms>(level===14?600000:60000))return reply({error:'Tempo non valido'},400);
  return reply(await rpc('shapes_social_legacy_score',{who:user.id,nick:name,cc,mode_id:level,ms,hand:['left','right'].includes(b.playing_hand)?b.playing_hand:null}));
 }catch{return reply({error:'Servizio temporaneamente non disponibile'},503);}
}
Deno.serve(handle);

