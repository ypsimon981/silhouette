const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {database,call,seed,who,other,modes}=require('./cognitive-fixture.cjs');
test('personal formulas, coverage, daily freeze, ownership and immutable idempotent raw measurements',async()=>{
 const db=await database();try{
  await assert.rejects(()=>call(db,'trial_start'),/3 partite/);
  await seed(db,who,12);let d=await call(db,'read');assert.equal(d.unlocked,true);assert.equal(d.profile.consistency,100);assert.equal(d.profile.precision,83.3);assert.equal(d.profile.adaptability,null);
  const e={id:crypto.randomUUID(),level:1,at_ms:Date.now(),ms:50000,outcome:'completed',successes:10,releases:30};await call(db,'sync',{events:[e]});await call(db,'sync',{events:[{...e,ms:1,releases:10}]});
  assert.equal((await db.query('select ms from shapes_cognitive_events where id=$1',[e.id])).rows[0].ms,50000);
  const again=await call(db,'read');assert.deepEqual(again.profile,d.profile);assert.equal(again.counts.find(x=>x.level===1).completed,4);
  assert.equal((await call(db,'read',{},other)).unlocked,false);
  await assert.rejects(()=>call(db,'sync',{events:[{...e,id:crypto.randomUUID(),releases:9}]}));
  const denied=await db.query("select has_table_privilege('authenticated','shapes_cognitive_events','select') allowed,has_function_privilege('anon','shapes_cognitive_action(uuid,text,jsonb)','execute') rpc");assert.equal(denied.rows[0].allowed,false);assert.equal(denied.rows[0].rpc,false);
 }finally{await db.close()}
});
test('three server-owned trials, strata, frozen baselines, scores, failure, replay and limit',async()=>{
 const db=await database();try{await seed(db);let t=(await call(db,'trial_start')).trial;
 assert.ok([1,2,4].includes(t.levels[0]));assert.ok([7,8,9].includes(t.levels[1]));assert.ok([10,11,12,13].includes(t.levels[2]));assert.deepEqual(t.baseline,[10000,10000,10000]);
 await db.query("update shapes_cognitive_trials set started_at=now()-interval '90 seconds' where id=$1",[t.id]);
 let r=await call(db,'trial_finish',{id:t.id,outcome:'completed',times:[20000,20000,20000]});assert.equal(r.trial.score,50);
 r=await call(db,'trial_finish',{id:t.id,outcome:'completed',times:[1,1,1]});assert.equal(r.trial.score,50);
 await assert.rejects(()=>call(db,'trial_finish',{id:t.id,outcome:'completed',times:[1,1,1]},other),/non trovata/);
 t=(await call(db,'trial_start')).trial;const third=(await call(db,'trial_start')).trial;
 assert.equal((await db.query('select status from shapes_cognitive_trials where id=$1',[t.id])).rows[0].status,'failed');
 await call(db,'trial_finish',{id:third.id,outcome:'failed'});await assert.rejects(()=>call(db,'trial_start'),/3 tentativi/);
 }finally{await db.close()}
});
test('daily best and thirty-day window with inactivity decay; no population dependency',async()=>{
 const db=await database();try{await seed(db);await db.exec(`insert into shapes_cognitive_trials(user_id,day,ordinal,levels,baseline,status,score,finished_at) values
 ('${who}',current_date-13,1,array[1,7,10],array[10000,10000,10000],'completed',100,now()-interval '13 days'),
 ('${who}',current_date-13,2,array[1,7,10],array[10000,10000,10000],'completed',50,now()-interval '13 days'),
 ('${who}',current_date-35,1,array[1,7,10],array[10000,10000,10000],'completed',0,now()-interval '35 days');`);
 assert.equal((await call(db,'read')).profile.adaptability,88.9);
 }finally{await db.close()}
});
test('old verified games supply consistency but never invented precision; online duplicates count once',async()=>{
 const db=await database();try{
 const ids=[];for(const level of modes)for(let i=0;i<3;i++){const id=crypto.randomUUID();ids.push({id,level});await db.query("insert into shapes_social_runs values($1,$2,$3,now(),'completed',10000)",[id,who,level]);}
 let d=await call(db,'read');assert.equal(d.profile.consistency,100);assert.equal(d.profile.precision,null);assert.equal(d.profile.precision_levels,0);
 await call(db,'sync',{events:[{id:crypto.randomUUID(),run_id:ids[0].id,level:1,at_ms:Date.now(),ms:10000,outcome:'completed',successes:10,releases:10}]});
 d=await call(db,'read');assert.equal(d.counts.find(x=>x.level===1).completed,3);
 await assert.rejects(()=>call(db,'sync',{events:[{id:crypto.randomUUID(),run_id:ids[1].id,level:1,at_ms:Date.now(),ms:10000,outcome:'completed',successes:10,releases:10}]},other),/non valida/);
 }finally{await db.close()}
});

test('offline queue retries without losing raw history and never crosses player identity',async()=>{
 const {JSDOM}=require('jsdom');const w=new JSDOM('',{url:'https://fixture.test',runScripts:'outside-only'}).window;
 try{
  w.eval(fs.readFileSync('cognitive-profile.js','utf8'));let online=false,id=who;const sent=[];
  const c=w.PotatoCognitive.create({identity:()=>id,training:()=>false,api:async(action,data,owner)=>{if(!online)throw Error('offline');sent.push({action,data,owner});return {user_id:owner,profile:{},counts:[],last_trial:null};}});
  const e={id:crypto.randomUUID(),level:1,at_ms:Date.now(),ms:10000,outcome:'completed',successes:10,releases:12};c.record(e,who);await c.sync();
  let saved=JSON.parse(w.localStorage.getItem('10potatoes_cognitive_v1:'+who));assert.equal(saved.queue.length,1);assert.equal(saved.records.length,1);
  id=other;c.setIdentity(other);online=true;await c.sync();assert.ok(sent.every(v=>v.owner===other));
  id=who;c.setIdentity(who);await c.sync();saved=JSON.parse(w.localStorage.getItem('10potatoes_cognitive_v1:'+who));assert.equal(saved.queue.length,0);assert.equal(saved.records.length,1);assert.equal(sent.filter(v=>v.action==='sync').length,1);
 }finally{w.close()}
});

test('Edge dispatch derives ownership from Auth and keeps existing sector routing',async()=>{
 const vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module');
 const code=stripTypeScriptTypes(fs.readFileSync('supabase/functions/ten-shapes-social/index.ts','utf8'),{mode:'transform'}).replace('export async function handle','async function handle');
 const requests=[];const context={Request,Response,AbortSignal,Deno:{env:{get:n=>n==='SUPABASE_URL'?'https://fixture.test':'private-test-key'},serve:()=>{}},fetch:async(url,options)=>{requests.push({url,options});return Response.json(url.endsWith('/auth/v1/user')?{id:who}:{ok:true})}};
 vm.createContext(context);vm.runInContext(code,context);
 const request=(action,data)=>new Request('https://fixture.test',{method:'POST',headers:{Authorization:'Bearer fixture'},body:JSON.stringify({action,data})});
 let result=await context.handle(request('cognitive_read',{who:other}));assert.equal(result.status,200);let last=requests.at(-1);assert.ok(last.url.endsWith('/rpc/shapes_cognitive_action'));assert.equal(JSON.parse(last.options.body).who,who);
 await context.handle(request('performance_sectors',{id:crypto.randomUUID(),sectors:[1000,2000,3000]}));last=requests.at(-1);assert.ok(last.url.endsWith('/rpc/shapes_performance_submit'));
 result=await context.handle(new Request('https://fixture.test',{method:'POST',body:'{}'}));assert.equal(result.status,401);
});
