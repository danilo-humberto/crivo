-- Synthetic identity for the development-only entry point. No production data.
INSERT INTO vault.internal_users (id, auth_subject, name, cpf, active)
VALUES ('crivo-dev-user', 'crivo-dev-user', 'Pessoa de desenvolvimento', '01234567890', true);

-- Runtime has DML only; bootstrap/migrations remain with the container owner.
CREATE ROLE crivo_app LOGIN PASSWORD 'crivo_app_local_only';
GRANT CONNECT ON DATABASE crivo_dev TO crivo_app;
GRANT USAGE ON SCHEMA vault TO crivo_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA vault TO crivo_app;
REVOKE INSERT, UPDATE, DELETE ON vault.schema_migrations FROM crivo_app;
