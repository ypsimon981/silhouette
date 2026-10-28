-- Private personal measurements; rankings and existing runs are never rewritten.
create table if not exists public.shapes_cognitive_events (
 user_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null, run_id uuid, level smallint not null check(level in (1,2,4,7,8,9,10,11,12,13)),
 at_ms bigint not null, ms integer not null check(ms between 0 and 60000),
 outcome text not null check(outcome in ('completed','interrupted','timeout')),
 successes smallint not null check(successes between 0 and 10),
 releases integer not null check(releases between successes and 100000),
 created_at timestamptz not null default now(),primary key(user_id,id),
 check(outcome<>'completed' or (successes=10 and ms>0))
);
create index if not exists shapes_cognitive_events_recent on public.shapes_cognitive_events(user_id,level,at_ms desc);
create index if not exists shapes_cognitive_events_run on public.shapes_cognitive_events(user_id,run_id) where run_id is not null;
create unique index if not exists shapes_cognitive_events_unique_run on public.shapes_cognitive_events(user_id,run_id) where run_id is not null;
create table if not exists public.shapes_cognitive_trials (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 day date not null, ordinal smallint not null check(ordinal between 1 and 3),
 levels integer[] not null, baseline double precision[] not null,
 status text not null default 'running' check(status in ('running','completed','failed')),
 times integer[], score double precision check(score between 0 and 100),
 started_at timestamptz not null default now(), finished_at timestamptz,
 unique(user_id,day,ordinal),check(array_length(levels,1)=3 and array_length(baseline,1)=3)
);
create index if not exists shapes_cognitive_trials_recent on public.shapes_cognitive_trials(user_id,day desc);
create table if not exists public.shapes_cognitive_snapshots (
 user_id uuid not null references auth.users(id) on delete cascade, day date not null,
 version integer not null default 1, profile jsonb not null, created_at timestamptz not null default now(),
 primary key(user_id,day,version)
);
alter table public.shapes_cognitive_events enable row level security;
alter table public.shapes_cognitive_trials enable row level security;
alter table public.shapes_cognitive_snapshots enable row level security;
revoke all on public.shapes_cognitive_events,public.shapes_cognitive_trials,public.shapes_cognitive_snapshots from public,anon,authenticated;
grant select,insert on public.shapes_cognitive_events to service_role;
grant select,insert,update on public.shapes_cognitive_trials to service_role;
grant select,insert on public.shapes_cognitive_snapshots to service_role;

-- Merge historical verified runs with new measured games, once per online run.
create or replace function public.shapes_cognitive_samples(who uuid)
returns table(id uuid,level smallint,at_ms bigint,ms integer,outcome text,successes smallint,releases integer)
language sql stable security invoker set search_path=public,pg_temp as $$
 select e.id,e.level,e.at_ms,e.ms,e.outcome,e.successes,e.releases from public.shapes_cognitive_events e where e.user_id=who
 union all
 select r.id,r.level,(extract(epoch from r.started_at)*1000)::bigint,r.time_ms,'completed'::text,10::smallint,null::integer
 from public.shapes_social_runs r
 where r.user_id=who and r.status='completed' and r.level in (1,2,4,7,8,9,10,11,12,13) and r.time_ms between 1 and 60000
 and not exists(select 1 from public.shapes_cognitive_events e where e.user_id=who and e.run_id=r.id)
$$;
revoke all on function public.shapes_cognitive_samples(uuid) from public,anon,authenticated;
grant execute on function public.shapes_cognitive_samples(uuid) to service_role;

create or replace function public.shapes_cognitive_action(who uuid,p_action text,p_data jsonb)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare tz text; today date; counts jsonb; unlocked boolean; precision_value double precision; consistency_value double precision;
 adaptability_value double precision; coverage integer; samples_count integer; snapshot jsonb; trial public.shapes_cognitive_trials%rowtype;
 e jsonb; eid uuid; rid uuid; mode_id integer; duration integer; placed integer; dropped integer; stamp bigint; result_kind text;
 seq integer[]; refs double precision[]; parts integer[]; used integer; days_idle integer; last_day date; raw_adapt double precision;
begin
 if who is null then raise exception 'Accesso richiesto'; end if;
 select timezone into tz from public.shapes_social_profiles where user_id=who;
 if tz is null or not exists(select 1 from pg_timezone_names where name=tz) then tz='UTC';end if;
 today=(now() at time zone tz)::date;
 perform pg_advisory_xact_lock(hashtextextended('cognitive:'||who::text,0));
 if p_action='cognitive_sync' then
  if jsonb_typeof(p_data->'events') is distinct from 'array' or jsonb_array_length(p_data->'events')>20 then raise exception 'Misurazioni non valide';end if;
  for e in select value from jsonb_array_elements(p_data->'events') loop
   eid=(e->>'id')::uuid;rid=nullif(e->>'run_id','')::uuid;mode_id=(e->>'level')::integer;
   duration=(e->>'ms')::integer;placed=(e->>'successes')::integer;dropped=(e->>'releases')::integer;
   stamp=(e->>'at_ms')::bigint;result_kind=e->>'outcome';
   if eid is null or mode_id is null or duration is null or placed is null or dropped is null or stamp is null or result_kind is null
    or stamp<0 or stamp>(extract(epoch from now())*1000)::bigint+300000 then raise exception 'Misurazioni non valide';end if;
   if rid is not null and not exists(select 1 from public.shapes_social_runs where id=rid and user_id=who and level=mode_id) then raise exception 'Partita non valida';end if;
   insert into public.shapes_cognitive_events(user_id,id,run_id,level,at_ms,ms,outcome,successes,releases)
    values(who,eid,rid,mode_id,stamp,duration,result_kind,placed,dropped) on conflict do nothing;
  end loop;
  return jsonb_build_object('saved',true,'user_id',who);
 end if;
 select jsonb_agg(jsonb_build_object('level',m,'completed',n) order by m) into counts from (
  select m,count(s.id) filter(where s.outcome='completed')::integer n from unnest(array[1,2,4,7,8,9,10,11,12,13]) m
  left join public.shapes_cognitive_samples(who) s on s.level=m group by m
 ) c;
 select bool_and((value->>'completed')::integer>=3) into unlocked from jsonb_array_elements(counts);
 if p_action='cognitive_trial_start' then
  if not unlocked then raise exception 'Completa almeno 3 partite in ciascuno dei 10 livelli';end if;
  select count(*) into used from public.shapes_cognitive_trials where user_id=who and day=today;
  if used>=3 then raise exception 'Hai usato i 3 tentativi di oggi';end if;
  update public.shapes_cognitive_trials set status='failed',score=0,finished_at=now() where user_id=who and status='running';
  seq=array[(array[1,2,4])[1+floor(random()*3)::int],(array[7,8,9])[1+floor(random()*3)::int],(array[10,11,12,13])[1+floor(random()*4)::int]];
  select array_agg(reference order by ord) into refs from (
   select ord,(select percentile_cont(.5) within group(order by ms) from
    (select ms from public.shapes_cognitive_samples(who) s where s.level=u.m and outcome='completed' order by at_ms desc,id limit 20) v) reference
   from unnest(seq) with ordinality u(m,ord)
  ) r;
  if array_position(refs,null) is not null then raise exception 'Riferimenti personali insufficienti';end if;
  insert into public.shapes_cognitive_trials(user_id,day,ordinal,levels,baseline) values(who,today,used+1,seq,refs) returning * into trial;
  return jsonb_build_object('trial',to_jsonb(trial),'user_id',who);
 elsif p_action='cognitive_trial_finish' then
  select * into trial from public.shapes_cognitive_trials where id=(p_data->>'id')::uuid and user_id=who for update;
  if not found then raise exception 'Prova non trovata';end if;
  if trial.status<>'running' then return jsonb_build_object('trial',to_jsonb(trial),'user_id',who);end if;
  if p_data->>'outcome'='completed' then
   if jsonb_typeof(p_data->'times') is distinct from 'array' or jsonb_array_length(p_data->'times')<>3 then raise exception 'Tempi non validi';end if;
   select array_agg(value::integer order by ordinality) into parts from jsonb_array_elements_text(p_data->'times') with ordinality;
   if array_position(parts,null) is not null or exists(select 1 from unnest(parts) t where t<1 or t>60000)
    or (select sum(t) from unnest(parts) t)>extract(epoch from now()-trial.started_at)*1000+1000 then raise exception 'Tempi non validi';end if;
   raw_adapt=100*exp((ln(least(1.0,trial.baseline[1]/parts[1]))+ln(least(1.0,trial.baseline[2]/parts[2]))+ln(least(1.0,trial.baseline[3]/parts[3])))/3);
   update public.shapes_cognitive_trials set status='completed',times=parts,score=raw_adapt,finished_at=now() where id=trial.id returning * into trial;
  else
   update public.shapes_cognitive_trials set status='failed',score=0,finished_at=now() where id=trial.id returning * into trial;
  end if;
  return jsonb_build_object('trial',to_jsonb(trial),'user_id',who);
 elsif p_action<>'cognitive_read' then raise exception 'Operazione non valida';end if;

 -- A daily snapshot changes only at the first opening of a new calendar day.
 select profile into snapshot from public.shapes_cognitive_snapshots where user_id=who and day=today and version=1;
 if snapshot is null then
  with measured as (
   select *,row_number() over(partition by level order by at_ms desc,id) rn from public.shapes_cognitive_samples(who) where releases is not null
  ), per_level as (
   select level,100.0*sum(successes)/nullif(sum(releases),0) value,count(*) filter(where outcome='completed') n
   from measured where rn<=20 and releases>0 group by level
  ) select avg(value),count(*) filter(where n>=3) into precision_value,coverage from per_level;
  if coverage<10 then precision_value=null;end if;
  with recent as (
   select *,row_number() over(partition by level order by at_ms desc,id) rn from public.shapes_cognitive_samples(who) where outcome='completed'
  ), per_level as (
   select level,100*greatest(0,1-stddev_pop(ms)/nullif(avg(ms),0)) value,count(*) n from recent where rn<=20 group by level
  ) select avg(value),count(*) into consistency_value,samples_count from per_level where n>=3;
  if samples_count<10 then consistency_value=null;end if;
  with daily as (
   select day,max(score) value from public.shapes_cognitive_trials where user_id=who and status<>'running' and day>today-30 and day<=today group by day
  ) select avg(value),max(day) into raw_adapt,last_day from daily;
  -- Failed attempts count as zero but do not reset inactivity.
  last_day=coalesce((select max(day) from public.shapes_cognitive_trials where user_id=who and status='completed' and day>today-30 and day<=today),last_day);
  if last_day is not null then
   days_idle=today-last_day;
   adaptability_value=raw_adapt*greatest(.7,1-.3*greatest(0,days_idle-3)/27.0);
  end if;
  if not unlocked then precision_value=null;consistency_value=null;adaptability_value=null;end if;
  snapshot=jsonb_build_object('day',today,'version',1,'precision',round(precision_value::numeric,1),'consistency',round(consistency_value::numeric,1),
   'adaptability',round(adaptability_value::numeric,1),'precision_levels',coalesce(coverage,0),'counts',counts,'unlocked',unlocked);
  insert into public.shapes_cognitive_snapshots(user_id,day,profile) values(who,today,snapshot);
 end if;
 select count(*) into used from public.shapes_cognitive_trials where user_id=who and day=today;
 return jsonb_build_object('user_id',who,'profile',snapshot,'counts',counts,'unlocked',unlocked,'used',used,'day',today,
  'last_trial',(select to_jsonb(t) from public.shapes_cognitive_trials t where user_id=who order by started_at desc,id limit 1));
end $$;
revoke all on function public.shapes_cognitive_action(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.shapes_cognitive_action(uuid,text,jsonb) to service_role;
