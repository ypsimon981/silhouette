-- Run after install-social.sql. Enable pg_cron in the dashboard first.
select cron.schedule('shapes-social-digest','* * * * *',
  $$select public.shapes_social_digest();$$);
