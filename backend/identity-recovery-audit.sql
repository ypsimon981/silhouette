-- Admin-only backup for explicitly verified legacy identity recoveries.
-- Never authorize a recovery solely from a public nickname or player UUID.
create table shapes_private.identity_recovery_audit (
 id bigint generated always as identity primary key,
 source_id uuid not null,
 target_id uuid not null,
 scores_before jsonb not null,
 recovered_at timestamptz not null default now()
);
revoke all on shapes_private.identity_recovery_audit from public,anon,authenticated;
