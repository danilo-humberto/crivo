-- Apply only to an explicitly authorized destination, after migration 001.
BEGIN;
CREATE TABLE vault.invitations (
  id text PRIMARY KEY,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  issuer_id text NOT NULL REFERENCES vault.internal_users(id),
  created_at timestamptz NOT NULL DEFAULT statement_timestamp(),
  expires_at timestamptz NOT NULL DEFAULT statement_timestamp() + interval '48 hours',
  consumed_at timestamptz,
  accepted_by text REFERENCES vault.internal_users(id),
  revoked_at timestamptz,
  CHECK (expires_at > created_at),
  CHECK ((consumed_at IS NULL) = (accepted_by IS NULL)),
  CHECK (consumed_at IS NULL OR revoked_at IS NULL)
);
INSERT INTO vault.schema_migrations(version) VALUES (2);
COMMIT;
