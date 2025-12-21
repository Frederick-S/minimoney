-- Setup Cron Job for Subscription Billing Processing
-- This script sets up an hourly cron job to automatically process subscription bills

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing job if it exists (for re-running this script)
SELECT cron.unschedule('process-subscription-bills-hourly') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-subscription-bills-hourly'
);

-- Schedule the Edge Function to run hourly at :00
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY with actual values
SELECT cron.schedule(
  'process-subscription-bills-hourly',  -- Job name
  '0 * * * *',                          -- Cron expression: every hour at :00
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Verify the cron job was created
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname = 'process-subscription-bills-hourly';

-- View cron job execution history (after it runs)
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-subscription-bills-hourly')
-- ORDER BY start_time DESC 
-- LIMIT 10;

-- To manually unschedule the job (if needed):
-- SELECT cron.unschedule('process-subscription-bills-hourly');

-- To manually trigger the function for testing:
-- Use curl or Postman:
-- curl -X POST \
--   https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
--   -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
--   -H "Content-Type: application/json" \
--   -d '{}'
