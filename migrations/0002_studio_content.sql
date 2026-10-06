INSERT INTO settings(key,value) VALUES
('brand_name','Controlex Media'),
('tagline','Independent thinking. Connected outcomes.'),
('hero_eyebrow','Creative minds. Business instincts.'),
('hero_line_one','Make your'),('hero_line_two','next move'),('hero_line_three','matter.'),
('hero_description','We turn growing businesses into brands people notice, websites people use, and experiences that move things forward.'),
('about_heading','Good design gets attention. The right design gets you somewhere.'),
('about_body','We connect strategy, identity, and technology so every part of your digital presence pulls in the same direction. One thoughtful team. A clear plan. Work built around your business.'),
('location','Based in Pakistan. Working across borders.'),
('contact_heading','Something on your mind? Let’s make it happen.'),
('contact_body','A new brand, a better website, or a bigger ambition. Tell us where you want to go, and we’ll work out the next move together.'),
('seo_title','Controlex Media — Brands, websites & digital growth'),
('seo_description','A creative technology studio for growing businesses. Controlex Media connects brand strategy, web development, and digital growth from Pakistan.'),
('process_json','[{"title":"Find the real brief","body":"We listen, ask useful questions, and agree on the business outcome before opening a design file."},{"title":"Make the direction clear","body":"Positioning, structure, and a visual direction. You see the thinking early and shape it with us."},{"title":"Build with intention","body":"We turn the direction into a working experience, with thoughtful details and regular checkpoints."},{"title":"Launch. Learn. Improve.","body":"We test, hand over, and help you understand what to measure and what to do next."}]');

INSERT INTO services(id,slug,title,short_description,content,icon,sort_order,status,seo_description) VALUES
('svc-brand','brand-strategy','Brand strategy & identity','Find your point of difference. Then make it impossible to miss.','We clarify who you serve, what makes you different, and how your brand should feel. Then we create an identity system your team can use consistently across every touchpoint.\n\nTypical scope: discovery, positioning, visual identity, brand guidelines, and launch assets. Every engagement begins with an agreed brief and deliverables.','brand',1,'published','Brand positioning and visual identity for growing businesses.'),
('svc-web','websites-development','Websites & development','Beautiful on the surface. Purposeful all the way through.','We design and build websites around the decisions your visitors need to make. Clear content, accessible interfaces, fast pages, and a manageable foundation come together as one experience.\n\nTypical scope: site strategy, UX, interface design, development, content setup, testing, and handover. Integrations are scoped before work starts.','web',2,'published','Purposeful, fast, accessible websites built for growing businesses.'),
('svc-growth','digital-growth','Digital growth & content','Turn a digital presence into a direction for growth.','We connect content and campaigns to a useful business goal. We start with your audience and existing channels, build a focused plan, and agree how progress will be measured.\n\nTypical scope: channel strategy, content planning, creative assets, campaign setup, and reporting. Ad spend and third-party tools are quoted separately.','growth',3,'published','Content strategy and digital growth planning for your business.');

INSERT INTO projects(id,slug,title,category,summary,problem,solution,results,is_concept,art,featured,status,sort_order) VALUES
('project-commerce','a-clearer-storefront','A clearer storefront','E-commerce / Digital experience','A concept exploring how a focused product story can turn browsing into a better buying experience.','Small retailers often have compelling products and confusing online stores. This studio exploration asks how a clearer hierarchy could improve discovery.','A quiet visual system, a simplified catalogue, and useful product details bring the product story to the front.','Design exploration only. No client engagement, live deployment, or measured commercial results are claimed.',1,'commerce',1,'published',1),
('project-identity','an-identity-with-direction','An identity with direction','Brand strategy / Visual identity','An expressive brand concept with a simple system that works everywhere.','A growing business needs an identity that can stretch across social content, packaging, and a digital storefront.','A bold typographic idea, a distinctive colour pair, and a repeatable graphic language make the system coherent.','Design exploration only. The work demonstrates a visual approach; it is not a commissioned client case study.',1,'identity',1,'published',2);

INSERT INTO packages(id,title,description,features_json,recommended,status,sort_order) VALUES
('pkg-foundation','Find your foundation','For businesses ready to bring their brand and online presence into focus.','["Discovery & direction","Brand identity essentials","A focused business website","Launch support & handover"]',0,'published',1),
('pkg-launch','Make your next move','A connected brand and website engagement, built around your next stage.','["Brand strategy & identity system","Custom website design & development","Content structure & launch assets","SEO foundations & analytics setup","Training & handover"]',1,'published',2),
('pkg-partner','Keep moving forward','An ongoing creative partnership for a business with momentum.','["A prioritised monthly roadmap","Design & content support","Website improvements","Regular progress reviews"]',0,'published',3);

INSERT INTO faqs(id,question,answer,sort_order,status) VALUES
('faq-1','Can we start with just one service?','Yes. We can start with a focused brief and build from there. We’ll recommend a scope that matches the outcome you need.',1,'published'),
('faq-2','How do you price a project?','We agree the scope, deliverables, milestones, and fee before work begins. Packages describe starting points, not fixed quotes. PKR and USD projects are quoted in the agreed currency.',2,'published'),
('faq-3','Do you work with businesses outside Pakistan?','Yes. We work remotely with clear checkpoints and a shared project plan. Time zones and communication expectations are agreed at the start.',3,'published'),
('faq-4','What happens after launch?','You receive a handover appropriate to your project. Ongoing support, content, and improvements can be scoped as a separate partnership.',4,'published');

INSERT INTO pages(id,slug,title,blocks_json,status) VALUES
('page-home','home','Home','[]','published'),('page-about','about','About','[]','draft'),
('page-privacy','privacy','Privacy policy','[]','draft'),('page-terms','terms','Terms','[]','draft');
-- Intentionally no fabricated testimonials, social handles, admins, leads, orders, or fixed prices.
