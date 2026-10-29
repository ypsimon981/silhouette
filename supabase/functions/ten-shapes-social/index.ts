// User JWT is verified by Auth below (supports current asymmetric signing keys).
const origin = Deno.env.get('SOCIAL_WEB_ORIGIN') || 'https://ypsimon981.github.io';
const headers = {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type',
  'Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
export async function handle(req: Request): Promise<Response> {
  const reply = (data: unknown,status=200) => new Response(JSON.stringify(data),{status,headers});
  if(req.method==='OPTIONS')return new Response(null,{headers});
  if(req.method!=='POST')return reply({error:'Metodo non consentito'},405);
  const authorization=req.headers.get('Authorization');
  if(!authorization?.startsWith('Bearer '))return reply({error:'Accesso richiesto'},401);
  try {
    const raw=await req.text();if(raw.length>8192)return reply({error:'Richiesta troppo grande'},413);
    let body;try{body=JSON.parse(raw);}catch{return reply({error:'JSON non valido'},400);}
    if(typeof body.action!=='string'||!body.data||typeof body.data!=='object'||Array.isArray(body.data))return reply({error:'Richiesta non valida'},400);
    const userResponse=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:authorization},signal:AbortSignal.timeout(10000)});
    if(!userResponse.ok)return reply({error:'Sessione scaduta. Riapri il gioco.'},401);
    const user=await userResponse.json();if(!user.id)return reply({error:'Accesso richiesto'},401);
    const precision=['precision_start','precision_finish','precision_rank'].includes(body.action);
    const cognitive=['cognitive_read','cognitive_sync','cognitive_trial_start','cognitive_trial_finish'].includes(body.action);
    const best=body.action==='challenge_best',sectors=body.action==='performance_sectors';
    if(sectors&&(!Array.isArray(body.data.sectors)||body.data.sectors.length!==3||!body.data.sectors.every((n:unknown)=>Number.isInteger(n)&&Number(n)>0&&Number(n)<=60000)))return reply({error:'Intertempi non validi'},400);
    if(best&&(!Number.isInteger(body.data.level)||![1,2,4,7,8,9,10,11,12,13,17,18,19].includes(body.data.level)))return reply({error:'Livello non valido'},400);
    const result=await fetch(url+'/rest/v1/rpc/'+(precision?'shapes_precision_action':cognitive?'shapes_cognitive_action':sectors?'shapes_performance_submit':best?'shapes_social_best_challenge':'shapes_social_action'),{
      method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
      body:JSON.stringify((precision||cognitive)?{who:user.id,p_action:body.action,p_data:body.data}:sectors?{who:user.id,run:body.data.id,parts:body.data.sectors}:best?{who:user.id,mode_id:body.data.level}:{p_user:user.id,p_action:body.action,p_data:body.data}),signal:AbortSignal.timeout(15000)
    });
    const data=await result.json();
    if(!result.ok)return reply({error:data.code==='P0001'?data.message:'Dati non validi o servizio non disponibile.'},data.code==='P0001'?400:503);
    return reply(data);
  } catch {return reply({error:'Servizio temporaneamente non disponibile.'},503);}
}
Deno.serve(handle);


