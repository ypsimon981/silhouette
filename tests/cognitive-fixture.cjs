const fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const who='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const modes=[1,2,4,7,8,9,10,11,12,13];
async function database(){const db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role;
create schema auth;create table auth.users(id uuid primary key);
insert into auth.users values ('${who}'),('${other}');
create table shapes_social_profiles(user_id uuid primary key,timezone text);
insert into shapes_social_profiles values('${who}','UTC'),('${other}','UTC');
create table shapes_social_runs(id uuid primary key,user_id uuid,level smallint,started_at timestamptz default now(),status text,time_ms integer);
grant usage on schema public to service_role;grant select on shapes_social_runs,shapes_social_profiles to service_role;`);
await db.exec(fs.readFileSync('backend/cognitive-profile.sql','utf8'));return db;}
const call=async(db,action,data={},id=who)=>(await db.query('select shapes_cognitive_action($1,$2,$3::jsonb) v',[id,'cognitive_'+action,JSON.stringify(data)])).rows[0].v;
async function seed(db,id=who,release=10){let n=0;for(const level of modes)for(let i=0;i<3;i++){const e={id:crypto.randomUUID(),level,at_ms:Date.now()-10000+n++,ms:10000,outcome:'completed',successes:10,releases:release};await call(db,'sync',{events:[e]},id);}}

module.exports={database,call,seed,who,other,modes};
