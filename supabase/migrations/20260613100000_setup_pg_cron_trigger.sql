-- Supabase pg_cron trigger: replaces GitHub Actions schedule delay with precise 01:00 UTC dispatch.
-- Extensions are enabled once per project; this migration is idempotent.

CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- The GitHub OAuth token must be stored in Vault BEFORE this cron job is useful.
-- Run once (not in migration, token is sensitive):
--   SELECT vault.create_secret('<github_oauth_token>', 'github_dispatch_pat', 'GitHub token for youtube-tracker dispatch');

-- Remove existing job if re-running migration
SELECT cron.unschedule('trigger-youtube-tracker') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'trigger-youtube-tracker'
);

-- Daily 01:00 UTC → calls GitHub workflow_dispatch API via pg_net
-- Token is read at runtime from Vault (never stored in plaintext here)
SELECT cron.schedule(
  'trigger-youtube-tracker',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://api.github.com/repos/Million-IMP/youtube-ranking-tracker/actions/workflows/tracker.yml/dispatches',
    headers := json_build_object(
      'Authorization',       'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'github_dispatch_pat'),
      'Accept',              'application/vnd.github+json',
      'X-GitHub-Api-Version','2022-11-28',
      'Content-Type',        'application/json'
    )::jsonb,
    body    := '{"ref":"master"}'::jsonb
  );
  $$
);
