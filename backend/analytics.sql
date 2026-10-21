-- Server-only aggregate report. No raw identities returned.
-- Opt-in users only; this is NOT a population-wide growth estimate.
with counts as (
 select count(distinct user_id) filter(where name='result_viewed') players,
 count(distinct user_id) filter(where name in('share_clicked','achievement_share_clicked','rematch_share_clicked')) sharers,
 count(*) filter(where name='challenge_link_opened') link_open_events,
 count(distinct (user_id,code)) filter(where name='challenge_link_opened') unique_opens,
 count(distinct (user_id,code)) filter(where name='challenge_started') unique_starts,
 count(*) filter(where name='rematch_shared') rematch_handoffs,
 count(*) filter(where name in('share_handoff','achievement_shared')) share_handoffs
 from public.shapes_social_events where created_at>=now()-interval '30 days'
), attributed as (
 select count(distinct p.user_id) acquired_from_link
 from public.shapes_social_profiles p join public.shapes_social_events e on e.user_id=p.user_id
 where e.name='challenge_link_opened' and e.created_at between p.created_at and p.created_at+interval '10 minutes'
 and p.created_at>=now()-interval '30 days'
)
select *,round(100.0*sharers/nullif(players,0),2) share_start_percent,
 round(100.0*unique_starts/nullif(unique_opens,0),2) link_to_game_percent
from counts cross join attributed;
-- acquired_from_link = new browser account opening a link within ten minutes,
-- not a verified new person or an install. Sharing handoff does not prove delivery.
-- push_sent/push_opened/ranking_digest_sent remain absent until real push exists.
