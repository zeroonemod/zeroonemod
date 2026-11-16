/*
# Contact messages and partner access requests

Plain-English summary: stores messages sent through the Contact form and partner access requests sent through the B2B form. Neither form creates an account or grants partner access; requests wait for admin review.

1. New Tables
- `contact_messages`: name, email, subject, message, privacy consent time, and a status (new, replied, closed).
- `partner_requests`: company name, contact name, email, phone, country, message, privacy consent time, and a status (pending, approved, rejected).

2. Indexes
- Email plus creation time on both tables, used for the per-email hourly request limit.

3. Security
- Row level security is enabled on both tables.
- No policies are added and no public or signed-in role is granted access. Visitors cannot read, change or delete these rows through the public API.
- Only the server-side request function (service role) writes to these tables. The admin panel will read them later through the same server-side path.

4. Notes
- Statements are idempotent and safe to re-run.
*/

CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  consent_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'replied', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contact_messages_email_created_idx ON contact_messages (lower(email), created_at DESC);

CREATE TABLE IF NOT EXISTS partner_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  country text NOT NULL,
  message text,
  consent_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_requests_email_created_idx ON partner_requests (lower(email), created_at DESC);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_requests ENABLE ROW LEVEL SECURITY;

GRANT ALL ON contact_messages TO service_role;
GRANT ALL ON partner_requests TO service_role;
