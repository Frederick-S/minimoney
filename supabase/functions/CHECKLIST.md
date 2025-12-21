# Deployment Checklist

Use this checklist to ensure proper deployment and configuration of the subscription billing Edge Function.

## Pre-Deployment

- [ ] **Database Schema**: All required tables exist
  - [ ] `subscriptions` table
  - [ ] `expenses` table with `subscription_id` column
  - [ ] `categories` table with subscription category
  - [ ] `user_preferences` table
  - [ ] `subscription_billing_logs` table

- [ ] **Subscription Category**: Verify subscription category exists
  ```sql
  SELECT * FROM categories WHERE name = 'subscription';
  ```

- [ ] **Test Data**: Create test subscriptions for validation
  - [ ] At least one subscription with `next_billing_date = CURRENT_DATE`
  - [ ] Test user has timezone preference set

- [ ] **Supabase CLI**: Installed and configured
  ```bash
  npm install -g supabase
  supabase --version
  ```

- [ ] **Service Role Key**: Retrieved from Supabase Dashboard
  - [ ] Navigate to: Settings > API
  - [ ] Copy `service_role` key (keep secure!)

## Deployment

- [ ] **Login to Supabase**
  ```bash
  supabase login
  ```

- [ ] **Link Project**
  ```bash
  supabase link --project-ref YOUR_PROJECT_REF
  ```

- [ ] **Deploy Edge Function**
  ```bash
  cd supabase/functions
  supabase functions deploy process-subscription-bills
  ```

- [ ] **Verify Deployment**: Function appears in Supabase Dashboard
  - [ ] Navigate to: Edge Functions
  - [ ] See `process-subscription-bills` listed

## Testing

- [ ] **Health Check**
  ```bash
  curl https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills/health
  ```
  - [ ] Returns HTTP 200
  - [ ] Response contains `"status": "healthy"`

- [ ] **Dry Run Test**
  ```bash
  curl -X POST \
    https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
    -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d '{"dryRun": true}'
  ```
  - [ ] Returns HTTP 200
  - [ ] Shows subscriptions that would be processed
  - [ ] Count matches expected subscriptions

- [ ] **Actual Execution Test**
  ```bash
  curl -X POST \
    https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-subscription-bills \
    -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d '{}'
  ```
  - [ ] Returns HTTP 200
  - [ ] `success: true`
  - [ ] `successCount` > 0
  - [ ] `failedCount` = 0

- [ ] **Verify Expenses Created**
  ```sql
  SELECT * FROM expenses 
  WHERE date = CURRENT_DATE 
    AND subscription_id IS NOT NULL
  ORDER BY created_at DESC;
  ```
  - [ ] Expenses exist for processed subscriptions
  - [ ] Amounts are correct
  - [ ] Dates are correct

- [ ] **Verify Subscriptions Updated**
  ```sql
  SELECT id, name, next_billing_date 
  FROM subscriptions 
  WHERE next_billing_date > CURRENT_DATE
  ORDER BY next_billing_date;
  ```
  - [ ] `next_billing_date` updated to future date
  - [ ] Dates are correct based on frequency

- [ ] **Verify Execution Logged**
  ```sql
  SELECT * FROM subscription_billing_logs 
  ORDER BY execution_start DESC 
  LIMIT 1;
  ```
  - [ ] Log entry exists
  - [ ] Status is 'completed'
  - [ ] Counts are correct

## Cron Job Setup

- [ ] **Update setup-cron.sql**
  - [ ] Replace `YOUR_PROJECT_REF` with actual project reference
  - [ ] Replace `YOUR_SERVICE_ROLE_KEY` with actual service role key

- [ ] **Enable pg_cron Extension**
  ```sql
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  ```
  - [ ] Run in Supabase SQL Editor
  - [ ] No errors

- [ ] **Schedule Cron Job**
  ```sql
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
  - [ ] Run in Supabase SQL Editor
  - [ ] No errors

- [ ] **Verify Cron Job Registered**
  ```sql
  SELECT * FROM cron.job WHERE jobname = 'process-subscription-bills-hourly';
  ```
  - [ ] Job exists
  - [ ] `active` is true
  - [ ] Schedule is '0 * * * *'

## Monitoring Setup

- [ ] **View Function Logs**
  - [ ] Navigate to: Edge Functions > process-subscription-bills > Logs
  - [ ] Can see execution logs
  - [ ] Can filter by level (INFO, ERROR)

- [ ] **Create Monitoring Queries**
  - [ ] Save success rate query
  - [ ] Save execution time query
  - [ ] Save failed subscriptions query
  - [ ] Document query locations

- [ ] **Set Up Alerting** (Optional)
  - [ ] Configure email notifications
  - [ ] Set up Slack/Discord webhooks
  - [ ] Define alert thresholds
  - [ ] Test alert delivery

## Post-Deployment

- [ ] **Monitor First Execution**
  - [ ] Wait for next hour (when cron runs)
  - [ ] Check execution logs
  - [ ] Verify expenses created
  - [ ] Check for errors

- [ ] **Verify Cron Job History**
  ```sql
  SELECT * FROM cron.job_run_details 
  WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-subscription-bills-hourly')
  ORDER BY start_time DESC 
  LIMIT 10;
  ```
  - [ ] Executions are happening hourly
  - [ ] No failures

- [ ] **Review First 24 Hours**
  - [ ] Check all 24 executions completed
  - [ ] Review success rates
  - [ ] Investigate any failures
  - [ ] Verify timezone handling

- [ ] **Document Configuration**
  - [ ] Record project reference
  - [ ] Document cron schedule
  - [ ] Note any custom configuration
  - [ ] Update team documentation

## Security Review

- [ ] **Service Role Key Security**
  - [ ] Not committed to version control
  - [ ] Stored securely (password manager, secrets vault)
  - [ ] Access limited to authorized personnel
  - [ ] Rotation plan documented

- [ ] **Function Permissions**
  - [ ] Function uses service role (admin access)
  - [ ] Validates user_id before operations
  - [ ] No SQL injection vulnerabilities
  - [ ] Error messages don't leak sensitive data

- [ ] **Database Security**
  - [ ] RLS policies exist on tables
  - [ ] Service role bypasses RLS (expected)
  - [ ] Regular backups configured
  - [ ] Audit logging enabled

## Performance Review

- [ ] **Execution Time**
  ```sql
  SELECT 
    AVG(EXTRACT(EPOCH FROM (execution_end - execution_start))) as avg_seconds,
    MAX(EXTRACT(EPOCH FROM (execution_end - execution_start))) as max_seconds
  FROM subscription_billing_logs
  WHERE execution_start > NOW() - INTERVAL '7 days';
  ```
  - [ ] Average < 30 seconds
  - [ ] Max < 60 seconds

- [ ] **Success Rate**
  ```sql
  SELECT 
    ROUND(100.0 * SUM(success_count) / NULLIF(SUM(processed_count), 0), 2) as success_rate
  FROM subscription_billing_logs
  WHERE execution_start > NOW() - INTERVAL '7 days';
  ```
  - [ ] Success rate > 95%

- [ ] **Database Indexes**
  ```sql
  SELECT * FROM pg_indexes 
  WHERE tablename IN ('subscriptions', 'expenses', 'user_preferences');
  ```
  - [ ] Index on `subscriptions.next_billing_date`
  - [ ] Index on `expenses.subscription_id`
  - [ ] Index on `user_preferences(user_id, category, key)`

## Troubleshooting

- [ ] **Review Troubleshooting Guide**
  - [ ] Read TESTING.md troubleshooting section
  - [ ] Read DEPLOYMENT.md troubleshooting section
  - [ ] Understand common issues

- [ ] **Test Error Scenarios**
  - [ ] Missing category (should fail gracefully)
  - [ ] Invalid timezone (should default to UTC)
  - [ ] Database connection issues (should retry)

- [ ] **Document Known Issues**
  - [ ] Record any issues encountered
  - [ ] Document solutions applied
  - [ ] Update team knowledge base

## Maintenance Plan

- [ ] **Regular Reviews**
  - [ ] Weekly: Check execution logs
  - [ ] Monthly: Review success rates
  - [ ] Quarterly: Performance optimization

- [ ] **Update Schedule**
  - [ ] Plan for function updates
  - [ ] Test updates in staging first
  - [ ] Document update procedures

- [ ] **Backup Plan**
  - [ ] Document how to disable cron job
  - [ ] Document manual processing procedure
  - [ ] Plan for rollback if needed

## Sign-Off

- [ ] **Deployment Completed By**: _________________ Date: _________
- [ ] **Testing Verified By**: _________________ Date: _________
- [ ] **Monitoring Configured By**: _________________ Date: _________
- [ ] **Documentation Updated By**: _________________ Date: _________

## Notes

Use this space to record any deployment-specific notes, issues encountered, or custom configuration:

```
___________________________________________________________________
___________________________________________________________________
___________________________________________________________________
___________________________________________________________________
___________________________________________________________________
```

## Next Steps

After completing this checklist:

1. Monitor the function for the first week
2. Review and optimize based on actual usage
3. Set up additional monitoring/alerting as needed
4. Train team members on monitoring and troubleshooting
5. Schedule regular maintenance reviews

## Support Resources

- **Documentation**: See README.md, DEPLOYMENT.md, TESTING.md
- **Supabase Docs**: https://supabase.com/docs/guides/functions
- **pg_cron Docs**: https://github.com/citusdata/pg_cron
- **Team Contact**: [Add your team's contact info]
