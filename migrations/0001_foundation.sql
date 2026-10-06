PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY, access_subject TEXT UNIQUE, email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('owner','editor')), status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','active','disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE media (
  id TEXT PRIMARY KEY, object_key TEXT NOT NULL UNIQUE, mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK(byte_size > 0 AND byte_size <= 10485760),
  width INTEGER, height INTEGER, alt_text TEXT NOT NULL, uploaded_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, archived_at TEXT
);
CREATE TABLE pages (
  id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
  blocks_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(blocks_json)),
  seo_title TEXT, seo_description TEXT, og_media_id TEXT REFERENCES media(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, archived_at TEXT
);
CREATE TABLE services (
  id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, short_description TEXT NOT NULL,
  content TEXT NOT NULL, icon TEXT NOT NULL, media_id TEXT REFERENCES media(id),
  price_minor INTEGER CHECK(price_minor >= 0), currency TEXT CHECK(currency IN ('PKR','USD')),
  cta_label TEXT NOT NULL DEFAULT 'Discuss your project', seo_title TEXT, seo_description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','disabled')), sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, archived_at TEXT
);
CREATE INDEX services_public ON services(status, archived_at, sort_order);
CREATE TABLE projects (
  id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, client TEXT, industry TEXT,
  category TEXT NOT NULL, summary TEXT NOT NULL, problem TEXT NOT NULL, solution TEXT NOT NULL, results TEXT NOT NULL,
  technologies_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(technologies_json)),
  media_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(media_json)),
  external_url TEXT, testimonial TEXT, is_concept INTEGER NOT NULL DEFAULT 0 CHECK(is_concept IN (0,1)),
  art TEXT NOT NULL DEFAULT 'commerce' CHECK(art IN ('commerce','identity','platform','editorial')),
  featured INTEGER NOT NULL DEFAULT 0 CHECK(featured IN (0,1)), seo_title TEXT, seo_description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','disabled')), sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, archived_at TEXT
);
CREATE INDEX projects_public ON projects(status, archived_at, featured, sort_order);
CREATE TABLE project_services (project_id TEXT NOT NULL REFERENCES projects(id), service_id TEXT NOT NULL REFERENCES services(id), PRIMARY KEY(project_id, service_id));
CREATE TABLE packages (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL, price_minor INTEGER CHECK(price_minor > 0),
  currency TEXT NOT NULL DEFAULT 'PKR' CHECK(currency IN ('PKR','USD')),
  features_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(features_json)),
  recommended INTEGER NOT NULL DEFAULT 0 CHECK(recommended IN (0,1)),
  payment_mode TEXT NOT NULL DEFAULT 'inquiry' CHECK(payment_mode IN ('inquiry','invoice','checkout')),
  cta_label TEXT NOT NULL DEFAULT 'Discuss this package',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','disabled')), sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, archived_at TEXT,
  CHECK(payment_mode <> 'checkout' OR price_minor IS NOT NULL)
);
CREATE INDEX packages_public ON packages(status, archived_at, sort_order);
CREATE TABLE testimonials (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, company TEXT, quote TEXT NOT NULL, media_id TEXT REFERENCES media(id),
  consent_record TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','disabled')),
  sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, archived_at TEXT
);
CREATE TABLE faqs (
  id TEXT PRIMARY KEY, question TEXT NOT NULL, answer TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, archived_at TEXT
);
CREATE TABLE social_links (
  id TEXT PRIMARY KEY, platform TEXT NOT NULL, handle TEXT, url TEXT NOT NULL, icon TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)), sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, archived_at TEXT
);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE leads (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, company TEXT NOT NULL DEFAULT '',
  service_id TEXT NOT NULL REFERENCES services(id), budget TEXT NOT NULL, message TEXT NOT NULL,
  consent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','qualified','closed','spam')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, archived_at TEXT
);
CREATE INDEX leads_inbox ON leads(status, created_at);
CREATE TABLE orders (
  id TEXT PRIMARY KEY, package_id TEXT REFERENCES packages(id), lead_id TEXT REFERENCES leads(id),
  amount_minor INTEGER NOT NULL CHECK(amount_minor > 0), currency TEXT NOT NULL CHECK(currency IN ('PKR','USD')),
  package_snapshot_json TEXT NOT NULL CHECK(json_valid(package_snapshot_json)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','awaiting_verification','paid','failed','refunded','cancelled')),
  provider TEXT, provider_reference TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_reference)
);
CREATE TABLE payment_events (
  id TEXT PRIMARY KEY, provider TEXT NOT NULL, event_id TEXT NOT NULL, order_id TEXT NOT NULL REFERENCES orders(id),
  amount_minor INTEGER NOT NULL CHECK(amount_minor > 0), currency TEXT NOT NULL CHECK(currency IN ('PKR','USD')),
  status TEXT NOT NULL CHECK(status IN ('paid','failed','refunded')), verified_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(provider,event_id)
);
CREATE TABLE posts (
  id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, excerpt TEXT NOT NULL, content TEXT NOT NULL,
  seo_title TEXT, seo_description TEXT, author_id TEXT REFERENCES users(id), published_at TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, archived_at TEXT
);
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id), action TEXT NOT NULL,
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE rate_limits (
  subject TEXT NOT NULL, window INTEGER NOT NULL, attempts INTEGER NOT NULL CHECK(attempts BETWEEN 1 AND 5),
  PRIMARY KEY(subject,window)
);
