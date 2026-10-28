// HTTP contract tests with mocked Auth/RPC; no remote requests or database writes.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const who='00000000-0000-4000-8000-000000000001';
function load(name){
 let handle;const calls=[];
 const source=stripTypeScriptTypes(fs.readFileSync('supabase/functions/'+name+'/index.ts','utf8').replace('export async function','async function'));
 vm.runInNewContext(source,{Request,Response,URL,AbortSignal,Deno:{env:{get:k=>k==='SUPABASE_URL'?'https://fixture.test':'TEST_ONLY'},serve:f=>handle=f},fetch:async(url,opts)=>{calls.push({url,data:opts?.body?JSON.parse(opts.body):null});return new Response(JSON.stringify(url.endsWith('/auth/v1/user')?{id:who}:url.includes('shapes_social_rank_read')?{scores:[],total:0}:{saved:true}),{headers:{'Content-Type':'application/json'}})}});
 return {handle,calls};
}
test('Shells ranking reads and authenticated writes use mode 19 while invalid modes and missing Auth stay rejected',async()=>{
 const {handle,calls}=load('ten-shapes-ranking');
 assert.equal((await handle(new Request('https://api.test?level=19'))).status,200);assert.equal(calls.at(-1).data.mode_id,19);
 assert.equal((await handle(new Request('https://api.test?level=20'))).status,400);
 const data={action:'score',player_id:who,nickname:'Fixture',country:'IT',level:19,time_ms:20420};
 assert.equal((await handle(new Request('https://api.test',{method:'POST',body:JSON.stringify(data)}))).status,401);
 assert.equal((await handle(new Request('https://api.test',{method:'POST',headers:{Authorization:'Bearer FIXTURE'},body:JSON.stringify(data)}))).status,200);
 assert(calls.at(-1).url.endsWith('shapes_social_legacy_score'));assert.equal(calls.at(-1).data.mode_id,19);
});
test('Shells challenge creation verifies Auth then selects the owned best for mode 19',async()=>{
 const {handle,calls}=load('ten-shapes-social');const data={action:'challenge_best',data:{level:19}};
 assert.equal((await handle(new Request('https://api.test',{method:'POST',body:JSON.stringify(data)}))).status,401);
 assert.equal((await handle(new Request('https://api.test',{method:'POST',headers:{Authorization:'Bearer FIXTURE'},body:JSON.stringify(data)}))).status,200);
 assert(calls.at(-1).url.endsWith('shapes_social_best_challenge'));assert.equal(calls.at(-1).data.mode_id,19);assert.equal(calls.at(-1).data.who,who);
 data.data.level=20;assert.equal((await handle(new Request('https://api.test',{method:'POST',headers:{Authorization:'Bearer FIXTURE'},body:JSON.stringify(data)}))).status,400);
});
