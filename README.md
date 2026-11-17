# ZEROONEMOD

Remote ECU and TCU file service: public website, submission wizard, customer and partner dashboard, and admin panel.

Stack: React 18, Vite, TypeScript, Tailwind CSS, React Router, Supabase (Auth, Postgres, private Storage, Edge Functions), Resend, Vercel.

## Project layout

```
src/
  components/ui        Button, Card, IconBadge, FormField, Select, SearchInput, UploadDropzone, StatusBadge, Stepper, Alert
  components/layout    SiteHeader, SiteFooter, AccountShell, CookieBanner, Wordmark (the logo)
  components/home      Homepage sections
  pages/               Public pages, login, customer pages
  features/submission  3-step wizard and partner quick form
  features/dashboard   Customer jobs, job detail, profile
  features/admin       Admin panel
  features/jobs        Shared job types, files, messages
supabase/
  migrations/          One complete schema file: tables, sequence, RLS policies, storage bucket, functions, triggers
  functions/           submit-job, submit-guest, submit-request, notify, admin-users, retention-cleanup, payment-webhook
```

## 1. Supabase

1. Create a new Supabase project (region: EU).
2. Apply the schema. Either paste `supabase/migrations/20261116100000_zeroonemod_schema.sql` (one file with everything) into the SQL editor and run it, or with the CLI:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```
3. Deploy the functions:
   ```bash
   npx supabase functions deploy submit-job submit-guest submit-request notify admin-users retention-cleanup payment-webhook
   ```
4. Set function secrets (Project Settings > Edge Functions > Secrets, or `npx supabase secrets set KEY=value`):
   - `SITE_URL=https://zeroonemod.com`
   - `NOTIFICATION_EMAIL=info@zeroonemod.com`
   - `EMAIL_FROM=ZEROONEMOD <info@zeroonemod.com>`
   - `RESEND_API_KEY=` (when Resend is ready, emails are skipped until then)
   - `CRON_SECRET=` (any long random string)
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided to functions automatically.
5. Authentication > URL Configuration: Site URL `https://zeroonemod.com`, redirect URLs `https://zeroonemod.com/**` and `http://localhost:5173/**`.
6. Authentication > Sign In / Providers > Email: turn **off** "Allow new users to sign up" (accounts are only created by submissions and partner invitations).
7. Create the admin: Authentication > Users > Add user (tick auto confirm), then run `supabase/make-admin.sql` with that email.
8. Daily file retention: in Integrations > Cron, create a job that runs daily and sends an HTTP POST to
   `https://YOUR_PROJECT_REF.supabase.co/functions/v1/retention-cleanup` with header `x-cron-secret: <CRON_SECRET>`.

## 2. Email (Resend)

1. Add and verify the domain `zeroonemod.com` in Resend, create an API key and set `RESEND_API_KEY` (step 4 above).
2. Recommended: Supabase Authentication > Emails > SMTP Settings, use Resend SMTP (`smtp.resend.com`, port 465, user `resend`, password = API key, sender `info@zeroonemod.com`). Login links, invitations and password resets then also come from your domain. Without it, Supabase's built-in mailer is limited to a few emails per hour.

## 3. Vercel

1. Import the repository in Vercel (framework: Vite). `vercel.json` handles routing, security headers and redirects.
2. Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SITE_URL=https://zeroonemod.com`.
3. Domains: add `zeroonemod.com` (primary), `www.zeroonemod.com`, `zeroonemod.net` and `www.zeroonemod.net`. All of them redirect to `https://zeroonemod.com`.

Never put `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` in Vercel or any `VITE_` variable.

## Local development

```bash
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

`npm run build` type-checks and builds. `npm run lint` runs ESLint.

## Payments

Processor independent. The admin pastes any payment link on a job and uses **Mark as paid** (card link, bank transfer, partner arrangement, other). Every payment is stored in the `payments` table.

To automate later, set `PAYMENT_PROVIDER` (stripe or redsys) and complete the adapter in `supabase/functions/payment-webhook/providers/`. Verified payments call the same `apply_payment` database function as the admin button.

## Security summary

- Row level security on every table: customers and partners see only their own jobs, files, messages and payments. Admin sees everything.
- Private storage bucket `job-files`, organised as `ZOM-000001/original/`, `ZOM-000001/additional/`, `ZOM-000001/completed/`. All downloads use signed URLs valid for 5 minutes.
- Completed files can only be downloaded once the job is paid (or partner arrangement) and delivered.
- Admin actions run through database functions that check the admin role and write to the activity log.
- Honeypot fields and rate limits on submissions, contact and partner forms. Login attempts are limited by Supabase Auth plus a short cool-down in the login form.
