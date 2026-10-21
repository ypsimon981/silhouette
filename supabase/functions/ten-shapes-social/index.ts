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
    const result=await fetch(url+'/rest/v1/rpc/shapes_social_action',{
      method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},
      body:JSON.stringify({p_user:user.id,p_action:body.action,p_data:body.data}),signal:AbortSignal.timeout(15000)
    });
    const data=await result.json();
    if(!result.ok)return reply({error:data.code==='P0001'?data.message:'Dati non validi o servizio non disponibile.'},data.code==='P0001'?400:503);
    return reply(data);
  } catch {return reply({error:'Servizio temporaneamente non disponibile.'},503);}
}
Deno.serve(handle);
