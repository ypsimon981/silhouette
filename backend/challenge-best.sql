-- A server-owned leaderboard result, never an arbitrary client time or player ID.
create or replace function public.shapes_social_best_challenge(who uuid,mode_id integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare s public.ten_shapes_scores%rowtype; r public.shapes_social_runs%rowtype; c jsonb;
begin
 perform 1 from public.shapes_social_profiles where user_id=who for update;
 if not found then raise exception 'Salva il profilo prima di continuare';end if;
 if mode_id not in(1,2,4,7,8,9,10,11,12,13) then raise exception 'Le sfide sono disponibili sui singoli livelli';end if;
 select * into s from public.ten_shapes_scores where player_id=who and level=mode_id;
 if not found then raise exception 'Completa una partita online per registrare il tuo record in questo livello';end if;
 select * into r from public.shapes_social_runs x where x.user_id=who and x.level=mode_id
 and x.status='completed' and x.time_ms=s.time_ms and x.rules='shapes-0.21.27-social1'
 and not exists(select 1 from public.shapes_social_challenges old where old.run_id=x.id and (old.status<>'active' or old.expires_at<=now()))
 order by x.started_at desc limit 1;
 if not found then
  -- A snapshot of a REAL owned score (e.g. a stage completed in Overall).
  -- Explicit provenance; this does not create an invented played attempt.
  insert into public.shapes_social_runs(user_id,level,rules,status,time_ms,result)
  values(who,mode_id,'shapes-0.21.27-social1','completed',s.time_ms,
    jsonb_build_object('source','leaderboard_snapshot','score_updated_at',s.updated_at)) returning * into r;
 end if;
 c=public.shapes_social_action(who,'challenge_create',jsonb_build_object('run_id',r.id));
 return c||jsonb_build_object('level',mode_id,'time_ms',s.time_ms);
end $$;
revoke all on function public.shapes_social_best_challenge(uuid,integer) from public,anon,authenticated;
grant execute on function public.shapes_social_best_challenge(uuid,integer) to service_role;
