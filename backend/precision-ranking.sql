-- Additive, authenticated leaderboard for the independent 30-second challenge.
begin;
create table if not exists public.shapes_precision_runs (
 id uuid primary key, user_id uuid not null references public.shapes_social_profiles(user_id) on delete cascade,
 started_at timestamptz not null default now(), finished_at timestamptz,
 placed integer check(placed between 0 and 300), errors integer check(errors between 0 and 3000),
 check((finished_at is null and placed is null and errors is null) or (finished_at is not null and placed is not null and errors is not null))
);
create index if not exists shapes_precision_runs_owner on public.shapes_precision_runs(user_id,started_at desc);
create table if not exists public.shapes_precision_scores (
 user_id uuid primary key references public.shapes_social_profiles(user_id) on delete cascade,
 placed integer not null check(placed between 0 and 300),errors integer not null check(errors between 0 and 3000),
 run_id uuid not null references public.shapes_precision_runs(id),achieved_at timestamptz not null default now()
);
create index if not exists shapes_precision_score_order on public.shapes_precision_scores(placed desc,errors asc,achieved_at,user_id);
alter table public.shapes_precision_runs enable row level security;
alter table public.shapes_precision_scores enable row level security;
revoke all on public.shapes_precision_runs,public.shapes_precision_scores from public,anon,authenticated;
grant select,insert,update,delete on public.shapes_precision_runs,public.shapes_precision_scores to service_role;
create or replace function public.shapes_precision_action(who uuid,p_action text,p_data jsonb) returns jsonb
language plpgsql security invoker set search_path=public,pg_temp as $$
declare run public.shapes_precision_runs%rowtype; v_id uuid;v_placed integer;v_errors integer;cc text;answer jsonb;
begin
 if who is null or not exists(select 1 from public.shapes_social_profiles where user_id=who) then raise exception 'Accesso richiesto';end if;
 if p_action='precision_start' then
  perform pg_advisory_xact_lock(hashtextextended('precision:'||who::text,0));
  v_id=(p_data->>'id')::uuid;if v_id is null then raise exception 'Partita non valida';end if;
  if not exists(select 1 from public.shapes_precision_runs where id=v_id) and (select count(*) from public.shapes_precision_runs where user_id=who and started_at>now()-interval '1 minute')>=20 then raise exception 'Attendi prima di riprovare';end if;
  insert into public.shapes_precision_runs(id,user_id) values(v_id,who) on conflict(id) do nothing;
  select * into run from public.shapes_precision_runs where id=v_id and user_id=who;
  if not found then raise exception 'Partita non valida';end if;
  return jsonb_build_object('user_id',who,'id',run.id);
 elsif p_action='precision_finish' then
  select * into run from public.shapes_precision_runs where id=(p_data->>'id')::uuid and user_id=who for update;
  if not found then raise exception 'Partita non trovata';end if;
  if run.finished_at is null then
   if now()-run.started_at<interval '29 seconds' then raise exception 'Partita non ancora conclusa';end if;
   if jsonb_typeof(p_data->'placed') is distinct from 'number' or jsonb_typeof(p_data->'errors') is distinct from 'number' then raise exception 'Risultato non valido';end if;
   if (p_data->>'placed')::numeric%1<>0 or (p_data->>'errors')::numeric%1<>0 then raise exception 'Risultato non valido';end if;
   v_placed=(p_data->>'placed')::integer;v_errors=(p_data->>'errors')::integer;
   if v_placed not between 0 and 300 or v_errors not between 0 and 3000 then raise exception 'Risultato non valido';end if;
   update public.shapes_precision_runs set finished_at=now(),placed=v_placed,errors=v_errors where id=run.id;
   insert into public.shapes_precision_scores as s(user_id,placed,errors,run_id) values(who,v_placed,v_errors,run.id)
    on conflict(user_id) do update set placed=excluded.placed,errors=excluded.errors,run_id=excluded.run_id,achieved_at=excluded.achieved_at
    where excluded.placed>s.placed or (excluded.placed=s.placed and excluded.errors<s.errors);
  end if;
  return jsonb_build_object('user_id',who,'saved',true,'record',(select to_jsonb(s) from public.shapes_precision_scores s where user_id=who));
 elsif p_action<>'precision_rank' then raise exception 'Operazione non valida';end if;
 if coalesce(p_data->>'scope','world') not in ('world','national') then raise exception 'Ambito non valido';end if;
 select country into cc from public.shapes_social_profiles where user_id=who;
 with ranked as (
  select s.user_id as player_id,p.nickname,p.country,s.placed,s.errors,
   round(100.0*s.placed/nullif(s.placed+s.errors,0)) as precision,
   rank() over(order by s.placed desc,s.errors asc) as rank,
   row_number() over(order by s.placed desc,s.errors asc,s.achieved_at,s.user_id) as rn
  from public.shapes_precision_scores s join public.shapes_social_profiles p on p.user_id=s.user_id
  where coalesce(p_data->>'scope','world')='world' or p.country=cc
 ) select jsonb_build_object('user_id',who,'country',cc,'total',(select count(*) from ranked),
  'scores',(select coalesce(jsonb_agg(to_jsonb(r)-'rn' order by rn),'[]') from ranked r where rn<=50),
  'my_score',(select to_jsonb(r)-'rn' from ranked r where player_id=who),'my_rank',(select rank from ranked where player_id=who),
  'leader',(select to_jsonb(r)-'rn' from ranked r where rn=1),
  'my_context',(select coalesce(jsonb_agg(to_jsonb(r)-'rn' order by rn),'[]') from ranked r where rn>50 and abs(rn-(select rn from ranked where player_id=who))<=2)
 ) into answer;
 return answer;
end $$;
revoke all on function public.shapes_precision_action(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.shapes_precision_action(uuid,text,jsonb) to service_role;
commit;
