const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
let db;
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002',C='00000000-0000-4000-8000-000000000003';
const prefs={challenges:true,digest:true,digest_time:'19:00',show_name:true,analytics:true};
const action=async(user,name,data={})=>(await db.query('select public.shapes_social_action($1,$2,$3) result',[user,name,JSON.stringify(data)])).rows[0].result;
async function run(user,ms,code=null,level=1){const t=await action(user,'run_start',{level,code,rules:'shapes-0.21.27-social1'});await db.query("update public.shapes_social_runs set started_at=now()-interval '90 seconds' where id=$1",[t.id]);const result=await action(user,'run_finish',{id:t.id,time_ms:ms,hand:'right'});return {...t,result};}
before(async()=>{
 db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);
 create table public.ten_shapes_scores(id bigint generated always as identity primary key,player_id uuid not null,nickname text not null,country text not null,level smallint not null,time_ms integer not null,playing_hand text,updated_at timestamptz not null default now(),is_demo boolean not null default false,demo_friend boolean not null default false,unique(player_id,level));`);
 try{await db.exec(fs.readFileSync('backend/install-social.sql','utf8'));await db.exec(fs.readFileSync('backend/challenge-best.sql','utf8'));}catch(e){delete e.query;throw e;}
 await db.exec(fs.readFileSync('backend/unique-nicknames.sql','utf8'));
 await db.exec(fs.readFileSync('backend/performance-sectors.sql','utf8'));
 for(const [id,nickname]of [[A,'Marco'],[B,'Giulia'],[C,'Luca']]){await db.query('insert into auth.users values($1)',[id]);await action(id,'profile',{nickname,country:'IT',timezone:'Europe/Rome',preferences:prefs});}
});
after(async()=>{await db?.close();});
test('nickname ownership covers case, whitespace, legacy players and alternate score writes',async()=>{
 await assert.rejects(action(B,'profile',{nickname:' mArCo ',country:'IT',timezone:'Europe/Rome',preferences:prefs}),/Nickname già utilizzato/);
 assert.equal((await db.query('select nickname from public.shapes_social_profiles where user_id=$1',[B])).rows[0].nickname,'Giulia');
 const old='00000000-0000-4000-8000-000000000099';
 await db.query("insert into public.ten_shapes_scores(player_id,nickname,country,level,time_ms) values($1,'Legacy','IT',1,20000)",[old]);
 await assert.rejects(action(C,'profile',{nickname:'LEGACY',country:'IT',timezone:'Europe/Rome',preferences:prefs}),/Nickname già utilizzato/);
 await db.query("insert into public.ten_shapes_scores(player_id,nickname,country,level,time_ms) values($1,'Marco','IT',13,20000)",[B]);
 assert.equal((await db.query('select nickname from public.ten_shapes_scores where player_id=$1 and level=13',[B])).rows[0].nickname,'Giulia');
 await db.query('delete from public.ten_shapes_scores where player_id=$1 or (player_id=$2 and level=13)',[old,B]);
});
let challenge, firstRun;
test('a verified result creates an idempotent challenge',async()=>{
 firstRun=await run(A,18420);assert.equal(firstRun.result.saved,true);
 challenge=await action(A,'challenge_create',{run_id:firstRun.id});assert.match(challenge.code,/^[0-9a-f]{32}$/);
 assert.deepEqual(await action(A,'challenge_create',{run_id:firstRun.id}),challenge);
 const c=await action(B,'challenge_get',challenge);assert.equal(c.time_ms,18420);assert.equal(c.nickname,'Marco');
});
test('ownership, invalid rules, invalid links and impossible elapsed time',async()=>{
 await assert.rejects(action(B,'challenge_create',{run_id:firstRun.id}));
 await assert.rejects(action(B,'run_finish',{id:firstRun.id,time_ms:17000}));
 await assert.rejects(action(B,'challenge_get',{code:'a'.repeat(32)}));
 await assert.rejects(action(B,'run_start',{level:1,rules:'wrong'}));
 await assert.rejects(action(A,'run_start',{level:1,code:challenge.code,rules:'shapes-0.21.27-social1'}));
 const t=await action(B,'run_start',{level:1,code:challenge.code,rules:'shapes-0.21.27-social1'});
 await assert.rejects(action(B,'run_finish',{id:t.id,time_ms:17950}));
 await action(B,'run_abort',{id:t.id});await assert.rejects(action(B,'run_finish',{id:t.id,time_ms:17950}));
});
test('loss, equality at displayed hundredth, win and repeated attempts',async()=>{
 assert.equal((await run(B,19000,challenge.code)).result.outcome,'lost');
 assert.equal((await run(B,18424,challenge.code)).result.outcome,'tie');
 const won=await run(B,17950,challenge.code);assert.equal(won.result.outcome,'won');assert.equal(won.result.difference_ms,-470);
 assert.deepEqual(await action(B,'run_finish',{id:won.id,time_ms:17950}),won.result);
 await run(B,17500,challenge.code);
 const inbox=await action(A,'inbox');assert.equal(inbox.notices.length,1);assert.match(inbox.notices[0].title,/Giulia/);
 const returnChallenge=await action(A,'challenge_get',{code:inbox.notices[0].code});assert.equal(returnChallenge.time_ms,17950);
 const comeback=await run(A,17000,returnChallenge.code);assert.equal(comeback.result.outcome,'won');
 assert.equal((await action(B,'inbox')).notices.length,1);
});
test('preference persistence, privacy and server analytics consent',async()=>{
 await action(C,'profile',{nickname:'Luca',country:'IT',timezone:'Europe/Rome',preferences:{...prefs,show_name:false,analytics:false},update_preferences:true});
 const r=await run(C,16000);const c=await action(C,'challenge_create',{run_id:r.id});
 assert.equal((await action(A,'challenge_get',c)).nickname,'Un giocatore');
 await action(C,'event',{name:'share_clicked',event_id:crypto.randomUUID()});
 assert.equal((await db.query('select count(*)::int n from public.shapes_social_events where user_id=$1',[C])).rows[0].n,0);
 const p=await action(C,'profile',{nickname:'Luca',country:'IT',timezone:'Europe/Rome',preferences:prefs});assert.equal(p.preferences.analytics,false);
 await assert.rejects(action(C,'profile',{nickname:'Luca',country:'IT',timezone:'Not/A_Zone',preferences:prefs}));
});
test('no fictitious 24-hour comparison before enough history',async()=>{
 assert.deepEqual((await action(A,'ranking_changes')).changes,[]);
});
test('exact 24-hour history, positive/negative changes and no duplicate digest',async()=>{
 await db.exec("update shapes_private.ranking_baseline set started_at=now()-interval '3 days';update shapes_private.score_history set captured_at=now()-interval '25 hours';");
 await run(B,15000);const changesA=(await action(A,'ranking_changes')).changes;const changesB=(await action(B,'ranking_changes')).changes;
 assert.equal(changesA[0].delta,-1);assert.equal(changesB[0].delta,2);
 const at=(await db.query("select (date_trunc('day',now() at time zone 'Europe/Rome')+interval '19 hours') at time zone 'Europe/Rome' at")).rows[0].at;
 // Use a deterministic near-current instant and set due time to 00:00 for this test.
 await db.exec(`update public.shapes_social_profiles set preferences=jsonb_set(preferences,'{digest_time}','"00:00"');`);
 assert.ok((await db.query('select public.shapes_social_digest() n')).rows[0].n>=2);
 assert.equal((await db.query('select public.shapes_social_digest() n')).rows[0].n,0);
 assert.equal((await db.query("select count(*)::int n from public.shapes_social_notices where dedupe_key like 'digest:%' and user_id=$1",[A])).rows[0].n,1);
});
test('RLS and RPC grants prevent direct client access',async()=>{
 await db.exec('set role authenticated');
 try{await assert.rejects(db.query('select * from public.shapes_social_profiles'));await assert.rejects(action(A,'inbox'));}finally{await db.exec('reset role');}
 const grants=await db.query("select has_function_privilege('anon','public.shapes_social_action(uuid,text,jsonb)','EXECUTE') allowed");assert.equal(grants.rows[0].allowed,false);
});
test('IANA time zones handle winter/summer 19:00 and exact 24h',async()=>{
 const rows=(await db.query(`select '2026-01-15 19:00 Europe/Rome'::timestamptz winter,'2026-07-15 19:00 Europe/Rome'::timestamptz summer,extract(epoch from ('2026-10-25 18:00+00'::timestamptz-('2026-10-25 18:00+00'::timestamptz-interval '24 hours'))) seconds`)).rows[0];
 assert.match(rows.winter.toISOString(),/18:00/);assert.match(rows.summer.toISOString(),/17:00/);assert.equal(Number(rows.seconds),86400);
});
test('ranking API matches history and atomic legacy scores cannot worsen a record',async()=>{
 const rank=(await db.query("select public.shapes_social_rank_read(1,'world',$1,'IT') r",[A])).rows[0].r;
 const history=(await db.query('select rank_position from shapes_private.rank_at(clock_timestamp()) where player_id=$1 and level=1',[A])).rows[0];
 assert.equal(rank.my_rank,Number(history.rank_position));assert.equal(rank.total,3);
 await Promise.all([14000,19000,14500].map(ms=>db.query("select public.shapes_social_legacy_score($1,'Marco','IT',2,$2,'left')",[A,ms])));
 assert.equal((await db.query('select time_ms from public.ten_shapes_scores where player_id=$1 and level=2',[A])).rows[0].time_ms,14000);
});
test('leaderboard challenges use the owned best, support Overall stage records and renew expired links',async()=>{
 const best=async(user,level)=>(await db.query('select public.shapes_social_best_challenge($1,$2) r',[user,level])).rows[0].r;
 const first=await best(A,2);assert.equal(first.time_ms,14000);assert.equal(first.level,2);
 assert.equal((await action(B,'challenge_get',{code:first.code})).time_ms,14000);
 assert.equal((await best(A,2)).code,first.code);
 await assert.rejects(best(B,2));await assert.rejects(best(A,14));
 await db.query("select public.shapes_social_legacy_score($1,'Marco','IT',2,13000,'left')",[A]);
 const improved=await best(A,2);assert.notEqual(improved.code,first.code);assert.equal(improved.time_ms,13000);
 await db.query("update public.shapes_social_challenges set expires_at=now()-interval '1 second' where code=$1",[improved.code]);
 const renewed=await best(A,2);assert.notEqual(renewed.code,improved.code);assert.equal(renewed.time_ms,13000);
});

test('verified sector receipts: ownership, sum, global records, ties and idempotency',async()=>{
 const submit=async(who,r,parts)=>(await db.query('select public.shapes_performance_submit($1,$2,$3) result',[who,r,parts])).rows[0].result;
 const a=await run(A,18000,null,2);assert.deepEqual((await submit(A,a.id,[3000,5000,10000])).world,[false,false,false]);
 assert.deepEqual((await submit(A,a.id,[3000,5000,10000])).world,[false,false,false]);
 await assert.rejects(submit(B,a.id,[3000,5000,10000]));await assert.rejects(submit(A,a.id,[3000,4000,11000]));
 const solo=await run(A,17000,null,2);assert.deepEqual((await submit(A,solo.id,[3000,5000,9000])).world,[false,false,false]);
 const b=await run(B,18000,null,2);await assert.rejects(submit(B,b.id,[3000,5000,9999]));
 assert.deepEqual((await submit(B,b.id,[3000,4900,10100])).world,[false,true,false]);
 await db.exec('set role authenticated');try{await assert.rejects(submit(B,b.id,[3000,4900,10100]));await assert.rejects(db.query('select * from public.shapes_performance_sectors'));}finally{await db.exec('reset role')}
});
