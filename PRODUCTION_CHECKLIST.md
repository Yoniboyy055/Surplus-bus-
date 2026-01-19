# Production Deployment Checklist

Use this checklist to ensure a complete and secure production deployment.

## Pre-Deployment

### Account & Project Setup
- [ ] Supabase account created and verified
- [ ] Production project created (separate from development)
- [ ] Project is on appropriate tier (Free/Pro/Team)
- [ ] Project region selected (choose closest to your users)
- [ ] Billing configured (if using Pro or higher)

### Environment Configuration
- [ ] `.env` file created from `.env.example`
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configured with production URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured with production anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured with production service role key
- [ ] `.env` file added to `.gitignore` (already included)
- [ ] `.env` file NOT committed to version control

### Database Preparation
- [ ] Database backup strategy defined
- [ ] Database migration rollback plan documented
- [ ] Test environment available for dry-run

## Deployment Steps

### 1. Database Migration
- [ ] `001_schema.sql` executed successfully
- [ ] `002_rls.sql` executed successfully
- [ ] `003_automation.sql` executed successfully
- [ ] No errors in SQL execution logs
- [ ] `verify_deployment.sql` run and all checks passed

### 2. Extension Verification
- [ ] `pgcrypto` extension installed and working
- [ ] `pg_cron` status verified (installed or alternative configured)
- [ ] If pg_cron not available: External cron service configured

### 3. Cron Job Setup (if pg_cron unavailable)
- [ ] External cron service selected
- [ ] Cron endpoint configured to call `process_exclusive_expiries()`
- [ ] Cron schedule set to every 10 minutes
- [ ] Test run completed successfully
- [ ] Monitoring/alerting configured for cron failures

### 4. Security Configuration

#### Authentication Settings
- [ ] Email confirmation enabled in Supabase Auth settings
- [ ] Password requirements configured (min length, complexity)
- [ ] Custom SMTP configured (not using Supabase default)
- [ ] Email templates customized
- [ ] Site URL configured correctly
- [ ] Redirect URLs whitelisted

#### API & Keys
- [ ] Service role key stored securely (use environment variables)
- [ ] Service role key never used in client-side code
- [ ] Anon key used only for client-side operations
- [ ] API rate limits reviewed and configured
- [ ] CORS settings configured appropriately

#### Row Level Security
- [ ] RLS enabled on all tables (verified via `verify_deployment.sql`)
- [ ] Test user in each role created (operator, referrer, buyer)
- [ ] Data isolation tested (users can only see their data)
- [ ] Operator privileges tested and working
- [ ] Unauthorized access attempts blocked

### 5. Data Verification
- [ ] All tables created correctly
- [ ] All indexes created
- [ ] All triggers installed and firing
- [ ] All functions created
- [ ] Initial operator account created

### 6. Business Logic Testing
- [ ] Tier calculation tested (0 pts=starter, 3 pts=proven, 7 pts=elite)
- [ ] Commission splits correct (20%, 25%, 30%)
- [ ] Deal workflow tested (NEW → QUALIFIED → OFFER_SENT → etc.)
- [ ] Exclusive window expiry tested
- [ ] Reputation system tested
- [ ] Audit logging verified
- [ ] Payout creation tested

## Post-Deployment

### Monitoring Setup
- [ ] Supabase dashboard monitoring configured
- [ ] Database performance metrics reviewed
- [ ] Query performance acceptable
- [ ] Error tracking configured
- [ ] Log aggregation set up
- [ ] Alerting rules configured

### Documentation
- [ ] Production URL documented
- [ ] Credentials stored in secure vault (1Password, etc.)
- [ ] Team members granted appropriate access
- [ ] Runbook created for common operations
- [ ] Incident response plan documented

### Backup & Recovery
- [ ] Automatic backups enabled (check Supabase settings)
- [ ] Backup retention policy configured
- [ ] Database restore tested in non-production environment
- [ ] Point-in-time recovery understood and documented

### Compliance & Legal
- [ ] Privacy policy updated for data collection
- [ ] Terms of service include platform rules
- [ ] Governance text included (from docs/00_GOVERNANCE_PROTECTION_LAYER.md)
- [ ] Mandate text available (from docs/04_MANDATE_TEXT.md)
- [ ] Required legal disclaimers displayed on UI
- [ ] GDPR compliance verified (if applicable)
- [ ] Data retention policies configured

### Performance Optimization
- [ ] Database indexes verified
- [ ] Query performance tested under load
- [ ] Connection pooling configured
- [ ] CDN configured for static assets (if applicable)

## Go-Live

### Final Checks
- [ ] All checklist items above completed
- [ ] Smoke tests passed in production
- [ ] Rollback plan ready
- [ ] Support team briefed
- [ ] Monitoring actively watched

### Launch
- [ ] DNS configured (if applicable)
- [ ] SSL/TLS certificates valid
- [ ] Application deployed
- [ ] End-to-end testing in production
- [ ] First real user transaction successful

## Post-Launch

### Immediate (First 24 Hours)
- [ ] Monitor error rates closely
- [ ] Check cron job executions
- [ ] Verify audit logs populating
- [ ] Review database performance
- [ ] Check for RLS policy issues
- [ ] Monitor user signups/activity

### First Week
- [ ] Review all error logs
- [ ] Analyze query performance
- [ ] Check backup success
- [ ] Verify all automations working
- [ ] Review security logs
- [ ] Collect user feedback

### First Month
- [ ] Performance tuning as needed
- [ ] Index optimization based on usage
- [ ] Archive old audit logs (if needed)
- [ ] Review and optimize costs
- [ ] Security audit
- [ ] Disaster recovery drill

## Rollback Trigger

Be prepared to rollback if you encounter:
- [ ] Critical security vulnerability
- [ ] Data corruption
- [ ] RLS policy failures exposing data
- [ ] Complete service outage
- [ ] Unrecoverable errors

## Rollback Procedure

If rollback is needed:
1. [ ] Stop all application traffic
2. [ ] Take database snapshot
3. [ ] Run rollback SQL (see DEPLOYMENT.md)
4. [ ] Restore previous application version
5. [ ] Verify system stability
6. [ ] Investigate root cause
7. [ ] Plan remediation

## Support Contacts

- **Supabase Support**: https://supabase.com/support
- **Emergency Contact**: [Add your team contact]
- **On-Call Engineer**: [Add rotation]

## Sign-Off

- [ ] Technical Lead approval: _________________ Date: _______
- [ ] Security Review completed: _________________ Date: _______
- [ ] Go-live approved: _________________ Date: _______

---

**Notes:**
- This checklist should be completed for each environment (staging, production)
- Keep a copy of completed checklist in your documentation
- Review and update this checklist based on lessons learned
