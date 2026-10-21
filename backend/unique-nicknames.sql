-- Global namespace includes legacy players. Old aliases remain reserved to their owner.
create table shapes_private.nickname_owners (
 nickname_key text primary key,
 player_id uuid not null
);
create index nickname_owners_player on shapes_private.nickname_owners(player_id);
revoke all on shapes_private.nickname_owners from public,anon,authenticated;
grant all on shapes_private.nickname_owners to service_role;

-- Abort on unresolved duplicates rather than silently rename or take a name.
do $$ begin
 if exists(select 1 from (
  select lower(btrim(nickname)) k,player_id from public.ten_shapes_scores
  union select lower(btrim(nickname)),user_id from public.shapes_social_profiles
 ) names group by k having count(distinct player_id)>1) then
  raise exception 'Resolve duplicate player identities before installing nickname uniqueness';
 end if;
end $$;
insert into shapes_private.nickname_owners
select distinct lower(btrim(nickname)),player_id from public.ten_shapes_scores
union select lower(btrim(nickname)),user_id from public.shapes_social_profiles;

create function shapes_private.claim_nickname(who uuid, nick text) returns void
language plpgsql set search_path='' as $$
declare owner_id uuid;
begin
 insert into shapes_private.nickname_owners(nickname_key,player_id)
 values(lower(btrim(nick)),who) on conflict(nickname_key) do nothing;
 select player_id into owner_id from shapes_private.nickname_owners where nickname_key=lower(btrim(nick));
 if owner_id is distinct from who then
  raise exception 'Nickname già utilizzato. Scegline un altro.' using errcode='P0001';
 end if;
end $$;
revoke all on function shapes_private.claim_nickname(uuid,text) from public,anon,authenticated;
grant execute on function shapes_private.claim_nickname(uuid,text) to service_role;

create function shapes_private.guard_profile_nickname() returns trigger
language plpgsql set search_path='' as $$
begin
 new.nickname:=btrim(new.nickname);
 perform shapes_private.claim_nickname(new.user_id,new.nickname);
 return new;
end $$;
create trigger shapes_profile_nickname before insert or update of nickname,user_id
on public.shapes_social_profiles for each row execute function shapes_private.guard_profile_nickname();

create function shapes_private.guard_score_nickname() returns trigger
language plpgsql set search_path='' as $$
declare canonical text;
begin
 select nickname into canonical from public.shapes_social_profiles where user_id=new.player_id;
 new.nickname:=coalesce(canonical,btrim(new.nickname));
 perform shapes_private.claim_nickname(new.player_id,new.nickname);
 return new;
end $$;
create trigger shapes_score_nickname before insert or update of nickname,player_id
on public.ten_shapes_scores for each row execute function shapes_private.guard_score_nickname();
revoke all on function shapes_private.guard_profile_nickname(),shapes_private.guard_score_nickname() from public,anon,authenticated;
grant execute on function shapes_private.guard_profile_nickname(),shapes_private.guard_score_nickname() to service_role;
create unique index shapes_profiles_unique_nickname on public.shapes_social_profiles(lower(btrim(nickname)));
