-- Social V1, additive installation on the EXISTING CoDriver project.
-- Run once as postgres after reviewing docs/SOCIAL-V1.md. No existing rows deleted.
begin;
create schema if not exists shapes_private;
revoke all on schema shapes_private from public, anon, authenticated;
grant usage on schema shapes_private to service_role;

create table public.shapes_social_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check(char_length(nickname) between 2 and 20),
  country text not null check(country ~ '^[A-Z]{2}$'),
  preferences jsonb not null default '{"challenges":true,"digest":true,"digest_time":"19:00","show_name":true,"analytics":false}',
  timezone text not null default 'UTC', created_at timestamptz not null default now(),
  last_digest_date date
);
create table public.shapes_social_runs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.shapes_social_profiles(user_id) on delete cascade,
  level smallint not null check(level in(1,2,4,7,8,9,10,11,12,13)),
  rules text not null, challenge_code text, started_at timestamptz not null default now(),
  status text not null default 'started' check(status in('started','completed','aborted')),
  time_ms integer check(time_ms between 1500 and 60000), result jsonb
);
create index shapes_runs_user_time on public.shapes_social_runs(user_id,started_at desc);
create table public.shapes_social_challenges (
  code text primary key default replace(gen_random_uuid()::text,'-',''),
  user_id uuid not null references public.shapes_social_profiles(user_id) on delete cascade,
  run_id uuid not null references public.shapes_social_runs(id),
  parent_code text references public.shapes_social_challenges(code),
  created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '30 days',
  status text not null default 'active' check(status in('active','revoked')), unique(user_id,run_id)
);
alter table public.shapes_social_runs add constraint shapes_runs_challenge_fk foreign key(challenge_code) references public.shapes_social_challenges(code);
create index shapes_runs_challenge on public.shapes_social_runs(challenge_code) where challenge_code is not null;
create index shapes_challenges_parent on public.shapes_social_challenges(parent_code) where parent_code is not null;
create index shapes_challenges_run on public.shapes_social_challenges(run_id);
create table public.shapes_social_notices (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.shapes_social_profiles(user_id) on delete cascade,
  dedupe_key text not null unique, title text not null, body text not null,
  code text, payload jsonb not null default '{}', created_at timestamptz not null default now()
);
create index shapes_notices_user_time on public.shapes_social_notices(user_id,created_at desc);
create table public.shapes_social_achievements (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.shapes_social_profiles(user_id) on delete cascade,
  run_id uuid not null references public.shapes_social_runs(id), level smallint not null, kind text not null,
  title text not null, time_ms integer not null, priority integer not null,
  created_at timestamptz not null default now(), unique(run_id,kind)
);
create index shapes_achievements_user on public.shapes_social_achievements(user_id,created_at desc);
create table public.shapes_social_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.shapes_social_profiles(user_id) on delete cascade,
  name text not null, level smallint, code text, created_at timestamptz not null default now()
);
create index shapes_events_name_time on public.shapes_social_events(name,created_at);
create index shapes_events_user_time on public.shapes_social_events(user_id,created_at desc);

-- A change log, not a daily full copy of the leaderboard. The baseline cannot
-- reconstruct any point before installation; ranking_changes explicitly checks it.
create table shapes_private.ranking_baseline (id boolean primary key default true check(id), started_at timestamptz not null default now());
insert into shapes_private.ranking_baseline default values;
create table shapes_private.score_history (
  id bigint generated always as identity primary key,
  player_id uuid not null, level smallint not null, time_ms integer, score_updated_at timestamptz,
  captured_at timestamptz not null default clock_timestamp(), deleted boolean not null default false
);
create index shapes_history_lookup on shapes_private.score_history(player_id,level,captured_at desc,id desc);
create index shapes_history_time on shapes_private.score_history(captured_at);
insert into shapes_private.score_history(player_id,level,time_ms,score_updated_at)
select player_id,level,time_ms,updated_at from public.ten_shapes_scores;
create function shapes_private.track_score() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='DELETE' then
  insert into shapes_private.score_history(player_id,level,deleted) values(old.player_id,old.level,true); return old;
 end if;
 if tg_op='INSERT' or old.time_ms is distinct from new.time_ms or old.updated_at is distinct from new.updated_at then
  insert into shapes_private.score_history(player_id,level,time_ms,score_updated_at) values(new.player_id,new.level,new.time_ms,new.updated_at);
 end if;return new;
end $$;
create trigger shapes_social_score_history after insert or update or delete on public.ten_shapes_scores for each row execute function shapes_private.track_score();

create function shapes_private.rank_at(at_time timestamptz)
returns table(player_id uuid,level smallint,rank_position bigint,total bigint,band integer)
language sql stable security invoker set search_path='' as $$
 with latest as (
  select distinct on(h.player_id,h.level) h.* from shapes_private.score_history h where h.captured_at<=at_time
  order by h.player_id,h.level,h.captured_at desc,h.id desc
 ), ranked as (
  select l.player_id,l.level,row_number() over(partition by l.level order by l.time_ms,l.score_updated_at,l.player_id) pos,
  count(*) over(partition by l.level) n from latest l where not l.deleted
 ) select r.player_id,r.level,r.pos,r.n,case when r.pos*100.0/r.n<=1 then 1 when r.pos*100.0/r.n<=5 then 5 when r.pos*100.0/r.n<=10 then 10 else 0 end from ranked r;
$$;
create function shapes_private.ranking_changes(who uuid, at_time timestamptz default clock_timestamp()) returns jsonb
language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('level',n.level,'rank',n.rank_position,'before_rank',o.rank_position,
 'total',n.total,'before_total',o.total,'delta',o.rank_position-n.rank_position,'band',n.band,'band_before',o.band)
 order by abs(o.rank_position-n.rank_position) desc,n.level),'[]'::jsonb)
 from shapes_private.rank_at(at_time) n join shapes_private.rank_at(at_time-interval '24 hours') o using(player_id,level)
 where n.player_id=who and (n.rank_position<>o.rank_position or n.band<>o.band)
 and at_time-interval '24 hours'>=(select started_at from shapes_private.ranking_baseline);
$$;

create function public.shapes_social_action(p_user uuid,p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 p public.shapes_social_profiles%rowtype; r public.shapes_social_runs%rowtype; c public.shapes_social_challenges%rowtype;
 target public.shapes_social_runs%rowtype; result_data jsonb; changes jsonb; code_value text; ms integer; old_ms integer;
 level_value smallint; pos bigint; population bigint; band_value integer; previous_band integer:=0; outcome text; difference integer;
 is_record boolean; achievements jsonb; k integer; title_value text; event_name text; preferences_value jsonb;
begin
 if p_user is null then raise exception 'Accesso richiesto';end if;
 if p_action='profile' then
  if length(p_data->>'nickname') not between 2 and 20 or p_data->>'nickname' !~ '^[[:alnum:] _.-]+$' or p_data->>'country' !~ '^[A-Z]{2}$' then raise exception 'Profilo non valido';end if;
  if not exists(select 1 from pg_timezone_names where name=p_data->>'timezone') then raise exception 'Fuso orario non valido';end if;
  preferences_value=p_data->'preferences';
  if preferences_value->>'digest_time' !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'Orario non valido';end if;
  foreach event_name in array array['challenges','digest','show_name','analytics'] loop
   if jsonb_typeof(preferences_value->event_name) is distinct from 'boolean' then raise exception 'Preferenze non valide';end if;
  end loop;
  preferences_value=jsonb_build_object('challenges',preferences_value->'challenges','digest',preferences_value->'digest','digest_time',preferences_value->'digest_time','show_name',preferences_value->'show_name','analytics',preferences_value->'analytics');
  insert into public.shapes_social_profiles(user_id,nickname,country,preferences,timezone)
  values(p_user,p_data->>'nickname',p_data->>'country',preferences_value,p_data->>'timezone')
  on conflict(user_id) do update set nickname=excluded.nickname,country=excluded.country,timezone=excluded.timezone,
  preferences=case when coalesce((p_data->>'update_preferences')::boolean,false) then excluded.preferences else shapes_social_profiles.preferences end;
  update public.ten_shapes_scores set nickname=p_data->>'nickname',country=p_data->>'country' where player_id=p_user;
  return (select jsonb_build_object('preferences',preferences) from public.shapes_social_profiles where user_id=p_user);
 end if;
 -- Serializes submissions and rate limits by authenticated account, never by a supplied UUID.
 select * into p from public.shapes_social_profiles where user_id=p_user for update;
 if not found then raise exception 'Salva il profilo prima di continuare';end if;
 if p_action='run_start' then
  if (select count(*) from public.shapes_social_runs where user_id=p_user and started_at>now()-interval '1 minute')>=20 then raise exception 'Troppi tentativi. Attendi un minuto';end if;
  level_value=(p_data->>'level')::smallint;
  if p_data->>'rules' is distinct from 'shapes-0.21.27-social1' then raise exception 'Versione delle regole incompatibile';end if;
  code_value=p_data->>'code';
  if code_value is not null then
   select * into c from public.shapes_social_challenges where code=code_value and status='active' and expires_at>now();
   if not found then raise exception 'Sfida inesistente o scaduta';end if;
   select * into target from public.shapes_social_runs where id=c.run_id;
   if target.rules<>p_data->>'rules' or target.level<>level_value then raise exception 'Livello o versione incompatibili';end if;
   if c.user_id=p_user then raise exception 'Non puoi accettare la tua stessa sfida';end if;
  end if;
  insert into public.shapes_social_runs(user_id,level,rules,challenge_code) values(p_user,level_value,p_data->>'rules',code_value) returning * into r;
  if code_value is not null and (p.preferences->>'analytics')::boolean then insert into public.shapes_social_events(user_id,name,level,code) values(p_user,'challenge_started',level_value,code_value);end if;
  return jsonb_build_object('id',r.id);
 elsif p_action='run_abort' then
  update public.shapes_social_runs set status='aborted' where id=(p_data->>'id')::uuid and user_id=p_user and status='started';return '{}';
 elsif p_action='run_finish' then
  select * into r from public.shapes_social_runs where id=(p_data->>'id')::uuid and user_id=p_user for update;
  if not found then raise exception 'Tentativo non valido';end if;
  if r.status='completed' then return r.result;end if;
  ms=(p_data->>'time_ms')::integer;
  if ms is null or r.status<>'started' or ms not between 1500 and 60000 or now()-r.started_at>interval '10 minutes'
    or extract(epoch from (clock_timestamp()-r.started_at))*1000<ms+2500 then raise exception 'Risultato non valido o tentativo scaduto';end if;
  select time_ms into old_ms from public.ten_shapes_scores where player_id=p_user and level=r.level;
  select band into previous_band from shapes_private.rank_at(clock_timestamp()) where player_id=p_user and level=r.level;
  is_record=old_ms is null or ms<old_ms;
  if is_record then
   insert into public.ten_shapes_scores(player_id,nickname,country,level,time_ms,playing_hand,updated_at)
   values(p_user,p.nickname,p.country,r.level,ms,case when p_data->>'hand' in('left','right') then p_data->>'hand' else null end,clock_timestamp())
   on conflict(player_id,level) do update set time_ms=least(ten_shapes_scores.time_ms,excluded.time_ms),playing_hand=excluded.playing_hand,updated_at=excluded.updated_at;
  end if;
  select rank_position,total,band into pos,population,band_value from shapes_private.rank_at(clock_timestamp()) where player_id=p_user and level=r.level;
  if old_ms is null then
   insert into public.shapes_social_achievements(user_id,run_id,level,kind,title,time_ms,priority) values(p_user,r.id,r.level,'first','Primo completamento',ms,30);
  elsif is_record then
   insert into public.shapes_social_achievements(user_id,run_id,level,kind,title,time_ms,priority) values(p_user,r.id,r.level,'record','Nuovo record personale',ms,50);
   if old_ms-ms>=500 and ms<=old_ms*.95 then insert into public.shapes_social_achievements(user_id,run_id,level,kind,title,time_ms,priority) values(p_user,r.id,r.level,'improvement','Miglioramento di almeno il 5%',ms,60);end if;
  end if;
  foreach k in array array[10,5,1] loop
   if band_value>0 and band_value<=k and (coalesce(previous_band,0)=0 or previous_band>k) then
    insert into public.shapes_social_achievements(user_id,run_id,level,kind,title,time_ms,priority) values(p_user,r.id,r.level,'top_'||k,'Ingresso nella Top '||k||'%',ms,100-k);
   end if;
  end loop;
  if r.challenge_code is not null then
   select * into c from public.shapes_social_challenges where code=r.challenge_code for update;
   if c.status<>'active' or c.expires_at<=now() then raise exception 'Sfida scaduta';end if;
   select * into target from public.shapes_social_runs where id=c.run_id;
   difference=(round(ms/10.0)-round(target.time_ms/10.0))::integer*10;
   outcome=case when difference<0 then 'won' when difference=0 then 'tie' else 'lost' end;
   if outcome='won' then
    -- One real overtake per challenger/target; improving again is not another overtake.
    -- A rematch creates a new target and can produce a new notification.
    insert into public.shapes_social_challenges(user_id,run_id,parent_code) values(p_user,r.id,c.code) on conflict(user_id,run_id) do nothing;
    select code into code_value from public.shapes_social_challenges where run_id=r.id and user_id=p_user;
    insert into public.shapes_social_notices(user_id,dedupe_key,title,body,code)
    select c.user_id,'overtake:'||c.code||':'||p_user,
    case when (p.preferences->>'show_name')::boolean then p.nickname else 'Un giocatore' end||' ti ha superato!',
    'Tempo: '||to_char(ms/1000.0,'FM990.00')||' s · Tu: '||to_char(target.time_ms/1000.0,'FM990.00')||' s',code_value
    from public.shapes_social_profiles owner where owner.user_id=c.user_id and (owner.preferences->>'challenges')::boolean
    on conflict(dedupe_key) do nothing;
   end if;
   if (p.preferences->>'analytics')::boolean then
    insert into public.shapes_social_events(user_id,name,level,code) values(p_user,'challenge_completed',r.level,c.code);
    if outcome='won' then insert into public.shapes_social_events(user_id,name,level,code) values(p_user,'challenge_won',r.level,c.code);end if;
   end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('title',a.title,'kind',a.kind) order by a.priority desc),'[]') into achievements from public.shapes_social_achievements a where run_id=r.id;
  result_data=jsonb_build_object('saved',is_record,'best_ms',least(old_ms,ms),'rank',pos,'total',population,'percentile',100.0*(population-pos)/nullif(population,0),'outcome',outcome,'difference_ms',difference,'achievements',achievements);
  update public.shapes_social_runs set status='completed',time_ms=ms,result=result_data where id=r.id;return result_data;
 elsif p_action='challenge_create' then
  select * into r from public.shapes_social_runs where id=(p_data->>'run_id')::uuid and user_id=p_user and status='completed';
  if not found then raise exception 'Serve un risultato verificato';end if;
  if p_data->>'parent_code' is not null and p_data->>'parent_code' is distinct from r.challenge_code then raise exception 'Rivincita non valida';end if;
  insert into public.shapes_social_challenges(user_id,run_id,parent_code) values(p_user,r.id,r.challenge_code) on conflict(user_id,run_id) do nothing;
  select * into c from public.shapes_social_challenges where user_id=p_user and run_id=r.id;
  if c.expires_at<=now() or c.status<>'active' then raise exception 'Sfida scaduta: completa una nuova partita';end if;
  if (p.preferences->>'analytics')::boolean then
   insert into public.shapes_social_events(id,user_id,name,level,code) values(r.id,p_user,'challenge_created',r.level,c.code) on conflict(id) do nothing;
  end if;return jsonb_build_object('code',c.code);
 elsif p_action='challenge_get' then
  select * into c from public.shapes_social_challenges where code=p_data->>'code' and status='active' and expires_at>now();
  if not found then raise exception 'Sfida inesistente o scaduta';end if;
  select * into r from public.shapes_social_runs where id=c.run_id;
  if r.rules<>'shapes-0.21.27-social1' then raise exception 'Versione delle regole incompatibile';end if;
  return (select jsonb_build_object('code',c.code,'nickname',case when (q.preferences->>'show_name')::boolean then q.nickname else 'Un giocatore' end,'level',r.level,'time_ms',r.time_ms,'rules',r.rules,'expires_at',c.expires_at) from public.shapes_social_profiles q where user_id=c.user_id);
 elsif p_action='ranking_changes' then
  return jsonb_build_object('changes',shapes_private.ranking_changes(p_user));
 elsif p_action='inbox' then
  return jsonb_build_object('notices',(select coalesce(jsonb_agg(to_jsonb(n)),'[]') from (select title,body,code,created_at from public.shapes_social_notices where user_id=p_user order by created_at desc limit 50)n),
   'achievements',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from(select title,level,time_ms,created_at from public.shapes_social_achievements where user_id=p_user order by created_at desc,priority desc limit 100)a));
 elsif p_action='event' then
  if not (p.preferences->>'analytics')::boolean then return '{}';end if;
  event_name=p_data->>'name';
  if event_name not in('result_viewed','share_clicked','share_handoff','challenge_link_opened','rematch_share_clicked','rematch_shared','achievement_share_clicked','achievement_shared') or event_name is null then raise exception 'Evento non consentito';end if;
  if (select count(*) from public.shapes_social_events where user_id=p_user and created_at>now()-interval '1 minute')>=60 then return '{}';end if;
  insert into public.shapes_social_events(id,user_id,name,level,code) values((p_data->>'event_id')::uuid,p_user,event_name,(p_data->>'level')::smallint,left(p_data->>'code',32)) on conflict(id) do nothing;
  return '{}';
 end if;
 raise exception 'Operazione non supportata';
end $$;

-- Existing Overall/stage score path, now authenticated at the Edge and atomic.
create function public.shapes_social_legacy_score(who uuid,nick text,cc text,mode_id integer,ms integer,hand text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare old_ms integer;
begin
 perform 1 from public.shapes_social_profiles where user_id=who for update;
 if not found then raise exception 'Profilo social richiesto';end if;
 if mode_id not in(1,2,4,7,8,9,10,11,12,13,14) or ms<1500 or ms>(case when mode_id=14 then 600000 else 60000 end) then raise exception 'Risultato non valido';end if;
 select time_ms into old_ms from public.ten_shapes_scores where player_id=who and level=mode_id;
 if old_ms<=ms then return jsonb_build_object('saved',false,'best_ms',old_ms);end if;
 insert into public.ten_shapes_scores(player_id,nickname,country,level,time_ms,playing_hand,updated_at)
 values(who,nick,cc,mode_id,ms,hand,clock_timestamp()) on conflict(player_id,level) do update
 set time_ms=excluded.time_ms,playing_hand=excluded.playing_hand,updated_at=excluded.updated_at
 where excluded.time_ms<ten_shapes_scores.time_ms;
 return jsonb_build_object('saved',true,'best_ms',ms);
end $$;

-- Full population ranking: no 10,000-row truncation at the REST layer.
create function public.shapes_social_rank_read(mode_id integer,scope_value text,who uuid,cc text,candidate integer default null) returns jsonb
language sql stable security invoker set search_path='' as $$
 with base as materialized (
  select player_id,nickname,country,time_ms,playing_hand,updated_at,is_demo,demo_friend
  from public.ten_shapes_scores where level=mode_id and (candidate is null or player_id<>who)
  union all select who,'Giocatore',cc,candidate,null,now(),false,false where candidate is not null
 ), scoped as (
  select * from base where scope_value='world' or (scope_value='national' and country=cc) or (scope_value='friends' and (demo_friend or player_id=who))
 ), ranked as materialized (
  select *,row_number() over(order by time_ms,updated_at,player_id) rank from scoped
 ), mine as (select * from ranked where player_id=who)
 select jsonb_build_object('scores',(select coalesce(jsonb_agg(to_jsonb(r) order by rank),'[]') from ranked r where rank<=50),
 'total',(select count(*) from ranked),'has_demo',(select coalesce(bool_or(is_demo),false) from ranked),'scope',scope_value,
 'my_rank',(select rank from mine),'my_score',(select to_jsonb(m) from mine m),
 'my_context',(select coalesce(jsonb_agg(to_jsonb(r) order by rank),'[]') from ranked r where (select rank from mine)>50 and r.rank between greatest(51,(select rank from mine)-3) and (select rank from mine)+3),
 'leader',(select to_jsonb(r) from ranked r where rank=1),'runner_up',(select to_jsonb(r) from ranked r where rank=2));
$$;

create function public.shapes_social_digest(at_time timestamptz default clock_timestamp()) returns integer
language plpgsql security invoker set search_path='' as $$
declare p public.shapes_social_profiles%rowtype; local_now timestamp; changes jsonb; body_value text; n integer:=0;
begin
 -- A single worker, including when cron overlaps a manual retry.
 if not pg_try_advisory_xact_lock(74219331) then return 0;end if;
 for p in select * from public.shapes_social_profiles where (preferences->>'digest')::boolean loop
  local_now=at_time at time zone p.timezone;
  if local_now::time<(p.preferences->>'digest_time')::time or p.last_digest_date=local_now::date then continue;end if;
  changes=shapes_private.ranking_changes(p.user_id,at_time);
  if jsonb_array_length(changes)>0 then
   select string_agg('Livello '||case (x->>'level')::int when 4 then 3 when 7 then 4 when 8 then 5 when 9 then 6 when 10 then 7 when 11 then 8 when 12 then 9 when 13 then 10 else (x->>'level')::int end||': '||case when (x->>'delta')::int>0 then '+' else '' end||(x->>'delta')||' posizioni',' · ')
   into body_value from (select value x from jsonb_array_elements(changes) limit 2) top_changes;
   insert into public.shapes_social_notices(user_id,dedupe_key,title,body,payload)
   values(p.user_id,'digest:'||p.user_id||':'||local_now::date,'La tua classifica è cambiata',body_value,changes) on conflict(dedupe_key) do nothing;n=n+1;
  end if;
  update public.shapes_social_profiles set last_digest_date=local_now::date where user_id=p.user_id;
 end loop;
 delete from public.shapes_social_events where created_at<at_time-interval '90 days';
 return n;
end $$;

-- No clients can call these RPCs or read private operational tables directly.
do $$ declare t text;begin
 foreach t in array array['shapes_social_profiles','shapes_social_runs','shapes_social_challenges','shapes_social_notices','shapes_social_achievements','shapes_social_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
alter table shapes_private.score_history enable row level security;
alter table shapes_private.ranking_baseline enable row level security;
grant all on all tables in schema shapes_private to service_role;
grant usage,select on all sequences in schema shapes_private to service_role;
revoke all on all functions in schema shapes_private from public,anon,authenticated;
grant execute on all functions in schema shapes_private to service_role;
revoke all on function public.shapes_social_action(uuid,text,jsonb),public.shapes_social_digest(timestamptz),public.shapes_social_legacy_score(uuid,text,text,integer,integer,text),public.shapes_social_rank_read(integer,text,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.shapes_social_action(uuid,text,jsonb),public.shapes_social_digest(timestamptz),public.shapes_social_legacy_score(uuid,text,text,integer,integer,text),public.shapes_social_rank_read(integer,text,uuid,text,integer) to service_role;
commit;
