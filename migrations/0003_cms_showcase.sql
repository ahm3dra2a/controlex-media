ALTER TABLE projects ADD COLUMN cover_media_id TEXT REFERENCES media(id);
ALTER TABLE pages ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN invoice_token TEXT;
CREATE UNIQUE INDEX orders_invoice_token ON orders(invoice_token);
ALTER TABLE orders ADD COLUMN customer_email TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN note TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN archived_at TEXT;
ALTER TABLE services ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE packages ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE faqs ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE testimonials ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE social_links ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pages ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
CREATE TABLE payment_claims (
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id),
  provider TEXT NOT NULL CHECK(provider IN ('bank','easypaisa','jazzcash','payoneer')),
  reference TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE content_revisions (
  id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
  actor_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO project_services(project_id,service_id) VALUES ('project-commerce','svc-web'),('project-identity','svc-brand');
INSERT INTO projects(id,slug,title,category,summary,problem,solution,results,is_concept,art,featured,status,sort_order) VALUES
('project-brand-system','retail-brand-system','A brand that travels','Brand identity / Campaign system','An original studio concept for a coherent retail identity across packaging, a website, and a launch campaign.','How can a new retail brand feel consistent wherever people discover it?','A repeatable layout system, a clear visual hierarchy, and a flexible set of brand applications.','Studio concept. No client commission or commercial performance is claimed.',1,'editorial',0,'published',3),
('project-service-site','service-business-website','A simpler route to an inquiry','Website / Service business','A studio exploration of a focused website for a growing professional service business.','Potential clients need to understand the offering and make contact without navigating a maze of pages.','A clear service architecture, useful proof, accessible forms, and a short path from discovery to a project brief.','Studio concept. Not a live client engagement or a measured conversion result.',1,'platform',0,'published',4),
('project-growth-content','content-with-direction','Content with a direction','Digital growth / Content strategy','An original concept for a coordinated content system around a product launch.','A collection of individual posts rarely communicates a clear product story.','A campaign narrative, reusable content pillars, and a structured sequence from awareness to a useful next action.','Studio concept. No live campaign or paid advertising results are claimed.',1,'editorial',0,'published',5),
('project-growth-launch','connected-launch','A connected launch','Digital growth / Launch strategy','A studio exploration joining landing-page content, campaign creative, and a focused launch plan.','Disconnected creative and messaging can leave a launch without a clear next step.','One value proposition carried through campaign assets, a focused landing page, and a measurement plan.','Studio concept. No client campaign, paid media spend, or attributed revenue is claimed.',1,'platform',0,'published',6);
INSERT INTO project_services(project_id,service_id) VALUES ('project-brand-system','svc-brand'),('project-service-site','svc-web'),('project-growth-content','svc-growth'),('project-growth-launch','svc-growth'),('project-growth-launch','svc-web');
INSERT OR IGNORE INTO settings(key,value) VALUES
('brand_line_one','controlex'),('brand_line_two','media'),('logo_media_id',''),
('footer_note','Independent thinking. Connected outcomes.'),
('navigation_json','[{"label":"Showcase","url":"/work"},{"label":"Services","url":"/#services"},{"label":"Studio","url":"/#about"}]'),
('payment_instructions','Payment instructions are supplied with your agreed quote.'),
('studio_title','Clear thinking. Thoughtful craft. Shared momentum.'),
('studio_body','We start with the right questions and build a direction around your business. Each decision connects strategy, design, and technology to a useful outcome.');
