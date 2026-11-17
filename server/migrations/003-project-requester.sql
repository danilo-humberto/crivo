BEGIN;
ALTER TABLE vault.projects
  ADD COLUMN requester text NOT NULL DEFAULT '' CHECK (char_length(requester) <= 120),
  ADD COLUMN requester_department text NOT NULL DEFAULT '' CHECK (char_length(requester_department) <= 120),
  ADD COLUMN show_requester boolean NOT NULL DEFAULT false;
INSERT INTO vault.schema_migrations(version) VALUES (3);
COMMIT;
