# Production Security Deployment Checklist

## Required Supabase secrets

Set these with the Supabase CLI or Dashboard secrets manager; never expose them as `VITE_*` variables:

```bash
supabase secrets set GEMINI_API_KEY="..."
supabase secrets set APP_ORIGIN="https://your-app.example"
supabase secrets set TELEGRAM_BOT_TOKEN="..."
supabase secrets set TELEGRAM_WEBHOOK_SECRET="generate-a-long-random-value"
supabase secrets set TELEGRAM_ALLOWED_CHAT_ID="your-telegram-chat-id"
supabase secrets set TELEGRAM_FINANCE_USER_ID="the-auth-users-uuid-to-link"
```

Deploy the protected AI gateway and token-scoped shared-trip service:

```bash
supabase functions deploy ai-gateway
# Shared links are intentionally capability-based, so this endpoint accepts
# unauthenticated visitors but authorizes only an exact high-entropy share token.
supabase functions deploy shared-trip --no-verify-jwt
```

Then apply every migration, including `supabase/migrations/011_phase1_security_hardening.sql`, through your normal Supabase migration workflow. Do not deploy the frontend before the migration and shared-trip function are live.

Deploy Telegram only after all four Telegram secrets above are present. Configure Telegram with the same secret token:

```bash
supabase functions deploy telegram-bot --no-verify-jwt
# Telegram setWebhook must include secret_token equal to TELEGRAM_WEBHOOK_SECRET.
```

## PWA assets

The required `public/pwa-192x192.png` and `public/pwa-512x512.png` manifest icons are now included and should be deployed with the static site.

## Apply storage hardening

Run `supabase/storage_setup.sql` in the Supabase SQL editor. It removes public client write/update/delete policies from `emc-documents` while preserving public read access to published learning material.

## Verify deployed RLS (do not rely solely on source files)

Run the following in the Supabase SQL editor and confirm every user-data table has `rowsecurity = true`:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;
```

Then use two real test users to prove that User A cannot select, insert for, update, or delete User B's transactions, goals, budgets, debts, mutual funds, statements, categories, or payment methods.

## Release checks

```bash
npm run lint
npm test
npm run build
```

Do not deploy until all checks pass. Rotate any Gemini/OpenAI/Telegram tokens that were previously entered in the browser or committed to client deployment settings.
