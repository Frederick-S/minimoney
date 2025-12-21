# Quick Start Guide

Get the subscription billing Edge Function up and running in 5 minutes.

## Prerequisites

- Supabase project with database tables set up
- Supabase CLI installed: `npm install -g supabase`
- Service role key from Supabase Dashboard (Settings > API)

## 1. Deploy the Function

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
cd supabase/functions
supabase functions deploy process-subscription-bills
```

## 2. Test the Function

```bash
# Health check
curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills/health

# Dry run (preview)
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'

# Actual execution
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 3. Set Up Cron Job

Open Supabase SQL Editor and run:

```sql
-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule hourly execution
SELECT cron.schedule(
  'process-subscription-bills-hourly',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

Replace:
- `YOUR_PROJECT_REF` with your project reference
- `YOUR_SERVICE_ROLE_KEY` with your service role key

## 4. Verify

```sql
-- Check cron job is registered
SELECT * FROM cron.job WHERE jobname = 'process-subscription-bills-hourly';

-- Check execution logs (after first run)
SELECT * FROM subscription_billing_logs ORDER BY execution_start DESC LIMIT 5;
```

## Done! 🎉

The function will now run automatically every hour to process subscription bills.

## Next Steps

- Review [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment guide
- Review [TESTING.md](./TESTING.md) for comprehensive testing scenarios
- Review [README.md](./process-subscription-bills/README.md) for full documentation
- Set up monitoring and alerting

## Troubleshooting

**Function not deploying?**
- Ensure you're logged in: `supabase login`
- Verify project link: `supabase link --project-ref YOUR_PROJECT_REF`

**Cron job not running?**
- Check if pg_cron is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
- Verify job exists: `SELECT * FROM cron.job;`
- Manually trigger function to test

**No subscriptions processed?**
- Check if subscriptions exist with today's billing date
- Verify user timezone preferences are set
- Use dry-run mode to see what would be processed

## Support

For detailed documentation, see:
- [README.md](./process-subscription-bills/README.md) - Full documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
- [TESTING.md](./TESTING.md) - Testing guide
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - Implementation details
