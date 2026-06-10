-- 0016 — M3: blog yazıcı başvuruları (kullanıcı başvurur → admin onaylar → blog_publisher).
CREATE TABLE IF NOT EXISTS publisher_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT '',
  status kyc_status NOT NULL DEFAULT 'pending',
  reviewed_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS publisher_app_user_idx ON publisher_applications (user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS publisher_app_status_idx ON publisher_applications (status);
