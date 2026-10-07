import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { loadContent } from "./data/content";
import { consumeLimit, hashSubject, isSameOrigin } from "./security/inquiry";
import type { Bindings, Project } from "./types";
import { Arrow, ContactBanner, Layout, ProjectArt } from "./views/components";

export const publicRoutes = new Hono<{ Bindings: Bindings }>();
function ProjectGrid({ projects }: { projects: Project[] }) {
  return (
    <div class="project-grid">
      {projects.map((project) => (
        <a class="project-card" href={`/work/${project.slug}`} key={project.id}>
          <ProjectArt project={project} />
          <div class="project-meta">
            <div>
              <p class="project-category">
                {project.category} ·{" "}
                {project.is_concept ? "Studio concept" : "Client project"}
              </p>
              <h3>{project.title}</h3>
              <p>{project.summary}</p>
            </div>
            <Arrow diagonal />
          </div>
        </a>
      ))}
    </div>
  );
}
publicRoutes.get("/theme.css", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT key,value FROM settings WHERE key IN ('primary_top','primary_bottom')",
  ).all<{ key: string; value: string }>();
  const values = Object.fromEntries(
    rows.results.map((row) => [row.key, row.value]),
  );
  const color = (value: string | undefined, fallback: string) =>
    value && /^#[a-f0-9]{6}$/i.test(value) ? value : fallback;
  c.header("Content-Type", "text/css; charset=utf-8");
  return c.body(
    `:root{--orange:${color(values.primary_top, "#FF451D")};--orange-end:${color(values.primary_bottom, "#FF5E00")}}`,
  );
});
publicRoutes.get("/media/:id", async (c) => {
  if (!c.env.MEDIA) return c.notFound();
  const meta = await c.env.DB.prepare(
    "SELECT object_key,mime_type FROM media WHERE id=? AND archived_at IS NULL",
  )
    .bind(c.req.param("id"))
    .first<{ object_key: string; mime_type: string }>();
  if (!meta) return c.notFound();
  const object = await c.env.MEDIA.get(meta.object_key);
  if (!object) return c.notFound();
  c.header("Content-Type", meta.mime_type);
  c.header("X-Content-Type-Options", "nosniff");
  return c.body(object.body);
});
publicRoutes.get("/work", async (c) => {
  const content = await loadContent(c.env.DB);
  const projects = await c.env.DB.prepare(
    "SELECT * FROM projects WHERE status='published' AND archived_at IS NULL ORDER BY sort_order,id LIMIT 200",
  ).all<Project>();
  return c.html(
    <Layout
      nonce={c.get("secureHeadersNonce")}
      content={content}
      siteUrl={c.env.SITE_URL}
      path="/work"
      title={`Showcase — ${content.settings.brand_name}`}
      description="Explore brand identities, websites and digital growth ideas from Controlex Media."
    >
      <section class="section wrap showcase-page">
        <p class="eyebrow">Ideas made visible</p>
        <h1>
          Different disciplines.
          <br />
          <em>One clear direction.</em>
        </h1>
        <p class="standfirst">
          A closer look at how strategy, design and technology come together.
          Explore each service, then get into the details.
        </p>
        <nav class="showcase-tabs" aria-label="Showcase services">
          <a aria-current="page" href="/work">
            All work
          </a>
          {content.services.map((service) => (
            <a key={service.id} href={`/services/${service.slug}/showcase`}>
              {service.title} <Arrow diagonal />
            </a>
          ))}
        </nav>
        <ProjectGrid projects={projects.results} />
        {!projects.results.length && (
          <p>Our next projects are being prepared. Talk to us about yours.</p>
        )}
      </section>
      <ContactBanner content={content} />
    </Layout>,
  );
});
publicRoutes.get("/services/:slug/showcase", async (c) => {
  const content = await loadContent(c.env.DB);
  const service = content.services.find(
    (row) => row.slug === c.req.param("slug"),
  );
  if (!service) return c.notFound();
  const projects = await c.env.DB.prepare(
    "SELECT p.* FROM projects p JOIN project_services ps ON ps.project_id=p.id WHERE ps.service_id=? AND p.status='published' AND p.archived_at IS NULL ORDER BY p.sort_order,p.id LIMIT 200",
  )
    .bind(service.id)
    .all<Project>();
  return c.html(
    <Layout
      nonce={c.get("secureHeadersNonce")}
      content={content}
      siteUrl={c.env.SITE_URL}
      path={`/services/${service.slug}/showcase`}
      title={`${service.title} showcase — ${content.settings.brand_name}`}
      description={service.short_description}
    >
      <section class="section wrap showcase-page">
        <a class="text-link" href="/work">
          ← All showcases
        </a>
        <p class="eyebrow">Service showcase</p>
        <h1>{service.title}</h1>
        <p class="standfirst">{service.short_description}</p>
        <nav class="showcase-tabs" aria-label="Showcase services">
          {content.services.map((item) => (
            <a
              key={item.id}
              aria-current={item.id === service.id ? "page" : undefined}
              href={`/services/${item.slug}/showcase`}
            >
              {item.title}
            </a>
          ))}
        </nav>
        <ProjectGrid projects={projects.results} />
        {!projects.results.length && (
          <p>Work in this discipline is being prepared for publication.</p>
        )}
        <a
          class="button button-orange showcase-more"
          href={`/contact?service=${service.id}`}
        >
          Discuss your project <Arrow diagonal />
        </a>
      </section>
    </Layout>,
  );
});
publicRoutes.get("/page/:slug", async (c) => {
  const page = await c.env.DB.prepare(
    "SELECT * FROM pages WHERE slug=? AND status='published' AND archived_at IS NULL",
  )
    .bind(c.req.param("slug"))
    .first<{
      slug: string;
      title: string;
      blocks_json: string;
      seo_title: string;
      seo_description: string;
    }>();
  if (!page) return c.notFound();
  const content = await loadContent(c.env.DB);
  return c.html(
    <Layout
      nonce={c.get("secureHeadersNonce")}
      content={content}
      siteUrl={c.env.SITE_URL}
      path={`/page/${page.slug}`}
      title={page.seo_title || `${page.title} — ${content.settings.brand_name}`}
      description={page.seo_description || page.title}
    >
      <section class="section wrap simple-page">
        <h1>{page.title}</h1>
        <div class="prose">
          {(JSON.parse(page.blocks_json) as { text: string }[]).map(
            (block, i) => (
              <p key={`${i}`}>{block.text}</p>
            ),
          )}
        </div>
      </section>
    </Layout>,
  );
});
publicRoutes.get("/insights", async (c) => {
  const content = await loadContent(c.env.DB);
  const posts = await c.env.DB.prepare(
    "SELECT slug,title,excerpt FROM posts WHERE status='published' AND archived_at IS NULL ORDER BY created_at DESC LIMIT 100",
  ).all<{ slug: string; title: string; excerpt: string }>();
  return c.html(
    <Layout
      nonce={c.get("secureHeadersNonce")}
      content={content}
      siteUrl={c.env.SITE_URL}
      path="/insights"
      title={`Insights — ${content.settings.brand_name}`}
      description="Studio notes on brands, websites and digital growth."
    >
      <section class="section wrap simple-page">
        <p class="eyebrow">Studio notes</p>
        <h1>Ideas worth sharing.</h1>
        <div class="insights-grid">
          {posts.results.map((post) => (
            <a key={post.slug} href={`/insights/${post.slug}`}>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <span class="text-link">Read the note ↗</span>
            </a>
          ))}
        </div>
        {!posts.results.length && (
          <p class="standfirst">Our first studio notes are being prepared.</p>
        )}
      </section>
    </Layout>,
  );
});
publicRoutes.get("/insights/:slug", async (c) => {
  const post = await c.env.DB.prepare(
    "SELECT title,content,excerpt,seo_title,seo_description FROM posts WHERE slug=? AND status='published' AND archived_at IS NULL",
  )
    .bind(c.req.param("slug"))
    .first<{
      title: string;
      content: string;
      excerpt: string;
      seo_title: string;
      seo_description: string;
    }>();
  if (!post) return c.notFound();
  const content = await loadContent(c.env.DB);
  return c.html(
    <Layout
      nonce={c.get("secureHeadersNonce")}
      content={content}
      siteUrl={c.env.SITE_URL}
      path={`/insights/${c.req.param("slug")}`}
      title={post.seo_title || post.title}
      description={post.seo_description || post.excerpt}
    >
      <article class="section wrap simple-page">
        <a class="text-link" href="/insights">
          ← Studio notes
        </a>
        <h1>{post.title}</h1>
        <p class="standfirst">{post.excerpt}</p>
        <div class="prose">
          {post.content.split(/\n\s*\n/).map((line, i) => (
            <p key={`${i}`}>{line}</p>
          ))}
        </div>
      </article>
    </Layout>,
  );
});

type Invoice = {
  id: string;
  invoice_token: string;
  amount_minor: number;
  currency: string;
  status: string;
  package_snapshot_json: string;
};
async function invoice(db: D1Database, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return db
    .prepare(
      "SELECT id,invoice_token,amount_minor,currency,status,package_snapshot_json FROM orders WHERE invoice_token=? AND archived_at IS NULL",
    )
    .bind(token)
    .first<Invoice>();
}
publicRoutes.use("/invoice/*", bodyLimit({ maxSize: 4000 }));
publicRoutes.get("/invoice/:token", async (c) => {
  const order = await invoice(c.env.DB, c.req.param("token"));
  if (!order) return c.notFound();
  const content = await loadContent(c.env.DB);
  const snapshot = JSON.parse(order.package_snapshot_json) as { title: string };
  return c.html(
    <Layout
      nonce={c.get("secureHeadersNonce")}
      content={content}
      siteUrl={c.env.SITE_URL}
      title="Your project invoice"
      description="Private project invoice."
      noindex
    >
      <section class="section wrap simple-page">
        <p class="eyebrow">Private project invoice</p>
        <h1>{snapshot.title}</h1>
        <p class="invoice-total">
          {new Intl.NumberFormat("en", {
            style: "currency",
            currency: order.currency,
          }).format(order.amount_minor / 100)}
        </p>
        <p class="standfirst">Status: {order.status.replaceAll("_", " ")}</p>
        {order.status === "paid" ? (
          <p>Payment verified by the studio. Thank you.</p>
        ) : (
          ["pending", "awaiting_verification"].includes(order.status) && (
            <>
              <div class="prose">
                {content.settings.payment_instructions
                  .split(/\n/)
                  .map((line, i) => (
                    <p key={`${i}`}>{line}</p>
                  ))}
              </div>
              <p class="small-note">
                Use the account instructions agreed with the studio. Share the
                transaction reference after transferring. The studio verifies
                receipt before marking this invoice paid.
              </p>
              <form
                class="inquiry-form"
                method="post"
                action={`/invoice/${order.invoice_token}`}
              >
                <label>
                  Payment method
                  <select name="provider" required>
                    <option value="bank">Bank transfer</option>
                    <option value="easypaisa">Easypaisa</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="payoneer">Payoneer</option>
                  </select>
                </label>
                <label>
                  Transaction reference
                  <input
                    name="reference"
                    required
                    minlength={4}
                    maxlength={160}
                  />
                </label>
                <button type="submit" class="button button-orange">
                  Submit for verification
                </button>
              </form>
            </>
          )
        )}
      </section>
    </Layout>,
  );
});
publicRoutes.post("/invoice/:token", async (c) => {
  if (!isSameOrigin(c.req.raw)) return c.text("Request origin rejected.", 403);
  const order = await invoice(c.env.DB, c.req.param("token"));
  if (!order) return c.notFound();
  if (!["pending", "awaiting_verification"].includes(order.status))
    return c.text("This invoice is closed.", 409);
  const subject = await hashSubject(
    `${c.req.header("CF-Connecting-IP") || "local"}:invoice:${order.id}`,
  );
  if (!(await consumeLimit(c.env.DB, subject)))
    return c.text("Too many submissions. Try again later.", 429);
  const body = await c.req.parseBody();
  const provider = String(body.provider || ""),
    reference = String(body.reference || "").trim();
  if (
    !["bank", "easypaisa", "jazzcash", "payoneer"].includes(provider) ||
    reference.length < 4 ||
    reference.length > 160
  )
    return c.text(
      "Choose a payment method and valid transaction reference.",
      400,
    );
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO payment_claims(id,order_id,provider,reference) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM orders WHERE id=? AND status IN ('pending','awaiting_verification'))",
    ).bind(crypto.randomUUID(), order.id, provider, reference, order.id),
    c.env.DB.prepare(
      "UPDATE orders SET status='awaiting_verification',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'",
    ).bind(order.id),
  ]);
  return c.redirect(`/invoice/${order.invoice_token}`, 303);
});
