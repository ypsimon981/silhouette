const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {database,player,call,score,who,other}=require('./precision-ranking-fixture.cjs');
test('lexicographic ranking: more forms, fewer errors; exact ties share ranks; national scope and best-only updates',async()=>{
 const db=await database();try{
  const third=crypto.randomUUID(),fourth=crypto.randomUUID();await player(db,who,'First');await player(db,other,'Second');await player(db,third,'Third','FR');await player(db,fourth,'Fourth');
  await score(db,who,25,3);await score(db,other,24,0);await score(db,third,24,2);await score(db,fourth,24,0);
  let d=await call(db,'rank');assert.deepEqual(d.scores.map(x=>[x.placed,x.errors,x.rank]),[[25,3,1],[24,0,2],[24,0,2],[24,2,4]]);assert.equal(d.my_rank,1);assert.equal(d.total,4);
  assert.equal((await call(db,'rank',{scope:'national'})).total,3);
  await score(db,who,24,0);d=await call(db,'rank');assert.equal(d.my_score.placed,25);assert.equal(d.my_score.errors,3);
  const bestRun=await score(db,who,25,2);await score(db,who,25,2);d=await call(db,'rank');assert.equal(d.my_score.errors,2);assert.equal((await db.query('select run_id from shapes_precision_scores where user_id=$1',[who])).rows[0].run_id,bestRun);
  await score(db,who,26,100);assert.equal((await call(db,'rank')).my_score.placed,26);
 }finally{await db.close();}
});
test('ownership, server duration, integer validation, idempotency and permissions protect submissions',async()=>{
 const db=await database();try{
  await player(db,who);await player(db,other);const t=await call(db,'start',{id:crypto.randomUUID()});
  await assert.rejects(()=>call(db,'start',{id:t.id},other),/non valida/);await assert.rejects(()=>call(db,'finish',{id:t.id,placed:10,errors:0},other),/non trovata/);
  await assert.rejects(()=>call(db,'finish',{id:t.id,placed:10,errors:0}),/non ancora/);
  await db.query("update shapes_precision_runs set started_at=now()-interval '33 seconds' where id=$1",[t.id]);
  for(const bad of [{placed:-1,errors:0},{placed:1.5,errors:0},{placed:1,errors:null},{placed:301,errors:0}])await assert.rejects(()=>call(db,'finish',{id:t.id,...bad}),/non valido/);
  await call(db,'finish',{id:t.id,placed:20,errors:3});await call(db,'finish',{id:t.id,placed:200,errors:0});assert.equal((await call(db,'rank')).my_score.placed,20);
  const perms=(await db.query("select has_table_privilege('anon','shapes_precision_scores','select') r,has_function_privilege('authenticated','shapes_precision_action(uuid,text,jsonb)','execute') e,has_function_privilege('service_role','shapes_precision_action(uuid,text,jsonb)','execute') s")).rows[0];assert.deepEqual(perms,{r:false,e:false,s:true});
 }finally{await db.close();}
});
test('outside the first fifty, a player still sees their own rank and neighbouring scores',async()=>{
 const db=await database();try{await player(db,who);await score(db,who,0,0);
  for(let i=0;i<55;i++){const id=crypto.randomUUID();await player(db,id,'Player'+i);await score(db,id,10+i,0);}
  const d=await call(db,'rank');assert.equal(d.scores.length,50);assert.equal(d.my_rank,56);assert.ok(d.my_context.some(x=>x.player_id===who));assert.ok(d.my_context.every(x=>x.rank>50));
 }finally{await db.close();}
});
test('Edge precision dispatch derives ownership from validated Auth and keeps existing routes',async()=>{
 const {stripTypeScriptTypes}=require('node:module');const code=stripTypeScriptTypes(fs.readFileSync('supabase/functions/ten-shapes-social/index.ts','utf8'),{mode:'transform'}).replace('export async function handle','async function handle');const requests=[];
 const context={Request,Response,AbortSignal,Deno:{env:{get:()=> 'fixture'},serve:()=>{}},fetch:async(url,options)=>{requests.push({url,options});return Response.json(url.endsWith('/auth/v1/user')?{id:who}:{});}};vm.createContext(context);vm.runInContext(code,context);
 await context.handle(new Request('https://fixture',{method:'POST',headers:{Authorization:'Bearer fixture'},body:JSON.stringify({action:'precision_finish',data:{who:other,id:crypto.randomUUID(),placed:5,errors:0}})}));
 assert.ok(requests.at(-1).url.endsWith('/rpc/shapes_precision_action'));assert.equal(JSON.parse(requests.at(-1).options.body).who,who);
});
test('failed uploads stay per-user and retry exactly once without crossing an identity change',async()=>{
 const events={},storage=new Map();let owner=who,online=false;const submitted=[];
 const context={window:{addEventListener:(n,fn)=>events[n]=fn},crypto,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};vm.runInNewContext(fs.readFileSync('precision-online.js','utf8'),context);
 const client=context.window.PotatoPrecisionOnline.create({identity:()=>owner,api:async(action,data,id)=>{if(action==='start')return {user_id:who,id:data.id};if(!online)throw Error('offline');assert.equal(id,owner);submitted.push(data);return {saved:true,user_id:owner};}});
 const t=client.start();await client.finish({placed:24,errors:2},t);assert.equal(JSON.parse(storage.get('10potatoes_precision_pending_v1:'+who)).length,1);
 owner=other;online=true;await client.sync();assert.equal(submitted.length,0);owner=who;await client.sync();await client.sync();assert.equal(submitted.length,1);assert.equal(submitted[0].errors,2);
});
