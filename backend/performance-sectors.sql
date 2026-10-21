-- Apply after install-social.sql. Additive; no existing score or run is rewritten.
create table if not exists public.shapes_performance_sectors (
 run_id uuid primary key references public.shapes_social_runs(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 level smallint not null, sectors integer[] not null,
 world boolean[] not null, created_at timestamptz not null default now(),
 check(array_length(sectors,1)=3 and array_position(sectors,null) is null),
 check(sectors[1]>0 and sectors[2]>0 and sectors[3]>0)
);
create index if not exists shapes_sectors_level on public.shapes_performance_sectors(level);
alter table public.shapes_performance_sectors enable row level security;
revoke all on public.shapes_performance_sectors from public,anon,authenticated;
grant select,insert on public.shapes_performance_sectors to service_role;
create or replace function public.shapes_performance_submit(who uuid, run uuid, parts integer[])
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare r public.shapes_social_runs%rowtype; saved public.shapes_performance_sectors%rowtype;
 records boolean[]; minima integer[]; has_global_reference boolean;
begin
 select * into r from public.shapes_social_runs where id=run and user_id=who;
 if not found or r.status<>'completed' then raise exception 'Tentativo non verificato';end if;
 if array_length(parts,1) is distinct from 3 or array_ndims(parts) is distinct from 1 or array_lower(parts,1)<>1 or array_position(parts,null) is not null
 or parts[1]<=0 or parts[2]<=0 or parts[3]<=0 or parts[1]::bigint+parts[2]+parts[3]<>r.time_ms then raise exception 'Intertempi non validi';end if;
 perform pg_advisory_xact_lock(73191,r.level::integer);
 select * into saved from public.shapes_performance_sectors where run_id=run;
 if found then
  if saved.sectors<>parts then raise exception 'Intertempi già registrati';end if;
  return jsonb_build_object('world',saved.world);
 end if;
 select array[min(sectors[1]),min(sectors[2]),min(sectors[3])] into minima from public.shapes_performance_sectors where level=r.level;
 select exists(select 1 from public.shapes_performance_sectors where level=r.level and user_id<>who) into has_global_reference;
 records=array[has_global_reference and parts[1]<minima[1],has_global_reference and parts[2]<minima[2],has_global_reference and parts[3]<minima[3]];
 insert into public.shapes_performance_sectors(run_id,user_id,level,sectors,world) values(run,who,r.level,parts,records);
 return jsonb_build_object('world',records);
end $$;
revoke all on function public.shapes_performance_submit(uuid,uuid,integer[]) from public,anon,authenticated;
grant execute on function public.shapes_performance_submit(uuid,uuid,integer[]) to service_role;
