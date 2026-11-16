/*
# FAQ items table with seed content

Plain-English summary: creates the FAQ table shown on the website and fills it with the five starting questions. The admin panel will manage these later.

1. New Tables
- `faq_items`: question, answer, display order.

2. Seed data
- Five starter questions covering submission and delivery, payment, file compatibility, turnaround and file privacy. Fixed ids keep the seed safe to re-run.

3. Security
- Row level security is enabled.
- Anyone (including visitors who are not signed in) can read the FAQ, because it is public content.
- Nobody on the public API can change it. Edits will go through the admin panel with the service role.
*/

CREATE TABLE IF NOT EXISTS faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS faq_items_sort_order_idx ON faq_items (sort_order);

ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON faq_items TO anon, authenticated;
GRANT ALL ON faq_items TO service_role;

DROP POLICY IF EXISTS "public_read_faq_items" ON faq_items;
CREATE POLICY "public_read_faq_items" ON faq_items FOR SELECT
  TO anon, authenticated USING (true);

INSERT INTO faq_items (id, question, answer, sort_order) VALUES
  ('00000000-0000-4000-8000-000000000001', 'How do I submit a file and how do I receive it?',
   'Upload your original file and complete the short submission form. After a technical review, we send you a quotation and payment instructions. Once payment is confirmed, the completed file is released to you through a secure, time-limited download link.', 1),
  ('00000000-0000-4000-8000-000000000002', 'How and when do I pay?',
   'Payment is made by card through a secure payment link that we send to you after reviewing your file. We do not release the completed file until payment has been received.', 2),
  ('00000000-0000-4000-8000-000000000003', 'Will my file work on my ECU or TCU?',
   'Compatibility depends on the ECU or TCU, the vehicle and the original file. Every submission is reviewed individually before any work starts, and we will tell you if a requested service is not available for your file.', 3),
  ('00000000-0000-4000-8000-000000000004', 'How long does it take?',
   'Turnaround depends on the service, the complexity of the file and the current workload. You receive the expected timing with your quotation.', 4),
  ('00000000-0000-4000-8000-000000000005', 'Who can see my files?',
   'Your files are stored in a private, access-controlled location. They are never published on public pages or shared folders, and download links expire after a short time. Files are kept only as long as needed and are deleted according to our retention policy.', 5)
ON CONFLICT (id) DO NOTHING;
