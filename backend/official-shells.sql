-- Extend only the existing official mode allowlists. No records or permissions change.
alter table public.ten_shapes_scores drop constraint ten_shapes_scores_level_check;
alter table public.ten_shapes_scores add constraint ten_shapes_scores_level_check check(level between 1 and 19);
alter table public.shapes_social_runs drop constraint shapes_social_runs_level_check;
alter table public.shapes_social_runs add constraint shapes_social_runs_level_check check(level in(1,2,4,7,8,9,10,11,12,13,17,18,19));
do $upgrade$
declare f record; definition text;
begin
 for f in select oid from pg_proc where pronamespace='public'::regnamespace and proname in('shapes_social_best_challenge','shapes_social_legacy_score') loop
  definition=pg_get_functiondef(f.oid);
  definition=replace(definition,'not in(1,2,4,7,8,9,10,11,12,13,14,17,18)','not in(1,2,4,7,8,9,10,11,12,13,14,17,18,19)');
  definition=replace(definition,'not in(1,2,4,7,8,9,10,11,12,13,17,18)','not in(1,2,4,7,8,9,10,11,12,13,17,18,19)');
  execute definition;
 end loop;
end $upgrade$;
