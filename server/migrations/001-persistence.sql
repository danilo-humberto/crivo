-- Apply once to an explicitly authorized database where schema vault is absent.
-- Production requires prior isolated validation and a verified recovery backup.
-- No managed-auth tables or credentials are created here.
BEGIN;
CREATE SCHEMA vault;

CREATE TABLE vault.internal_users (
  id text PRIMARY KEY CHECK (btrim(id) <> ''),
  auth_subject text NOT NULL UNIQUE CHECK (btrim(auth_subject) <> ''),
  name text NOT NULL CHECK (btrim(name) <> ''),
  cpf text NOT NULL CHECK (cpf ~ '^[0-9]{11}$' AND cpf !~ '^([0-9])\1{10}$'),
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vault.projects (
  id text PRIMARY KEY CHECK (btrim(id) <> ''),
  title text NOT NULL CHECK (btrim(title) <> ''),
  description text NOT NULL CHECK (btrim(description) <> ''),
  solution text NOT NULL CHECK (btrim(solution) <> ''),
  owner_legacy text NOT NULL CHECK (btrim(owner_legacy) <> ''),
  owner_id text REFERENCES vault.internal_users(id),
  category text NOT NULL CHECK (category IN ('Operações','Financeiro','Pessoas','Infraestrutura','Comercial')),
  status text NOT NULL CHECK (status IN ('Planejado','Em andamento','Concluído')),
  requested date NOT NULL,
  completed date,
  cost numeric NOT NULL CHECK (cost >= 0 AND cost < 'Infinity'::numeric),
  solution_url text NOT NULL DEFAULT '',
  is_public boolean NOT NULL DEFAULT false,
  show_solution_url boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  CHECK ((status = 'Concluído') = (completed IS NOT NULL)),
  CHECK (completed IS NULL OR completed >= requested)
);

CREATE TABLE vault.alternatives (
  project_id text NOT NULL REFERENCES vault.projects(id),
  position integer NOT NULL CHECK (position >= 0),
  name text NOT NULL CHECK (btrim(name) <> ''),
  cost numeric NOT NULL CHECK (cost >= 0 AND cost < 'Infinity'::numeric),
  notes text NOT NULL,
  PRIMARY KEY (project_id,position)
);

CREATE TABLE vault.reviews (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES vault.projects(id),
  name text NOT NULL CHECK (btrim(name) <> ''),
  cpf text NOT NULL CHECK (cpf ~ '^[0-9]{11}$' AND cpf !~ '^([0-9])\1{10}$'),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL CHECK (btrim(comment) <> ''),
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id,cpf)
);

CREATE TABLE vault.audit (
  id text PRIMARY KEY,
  project_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('baseline','created','updated','deleted','archived','review_hidden','review_shown')),
  happened_at timestamptz NOT NULL,
  actor_id text REFERENCES vault.internal_users(id),
  actor_legacy text NOT NULL,
  before_snapshot jsonb,
  after_snapshot jsonb,
  legacy_event jsonb,
  CHECK (before_snapshot IS NOT NULL OR after_snapshot IS NOT NULL)
);
CREATE INDEX audit_project_date ON vault.audit (project_id,happened_at DESC);

-- Source is stable per originating browser/export collection. Changed imports
-- require reconciliation instead of overwriting a previously imported source.
CREATE TABLE vault.imports (
  source text PRIMARY KEY CHECK (btrim(source) <> ''),
  digest text NOT NULL CHECK (digest ~ '^[0-9a-f]{64}$'),
  counts jsonb NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE vault.import_records (
  source text NOT NULL REFERENCES vault.imports(source),
  kind text NOT NULL CHECK (kind IN ('project','audit')),
  legacy_id text NOT NULL,
  record_id text NOT NULL,
  PRIMARY KEY (source,kind,legacy_id),
  UNIQUE (kind,record_id)
);
CREATE TABLE vault.schema_migrations (
  version integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO vault.schema_migrations(version) VALUES (1);
COMMIT;
