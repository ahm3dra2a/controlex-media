import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { loadContent } from "./data/content";
import {
  canSkipTurnstile,
  consumeLimit,
  hashSubject,
  inquirySchema,
  isSameOrigin,
  verifyTurnstile,
} from "./security/inquiry";
import type { Bindings, Project } from "./types";
import { Arrow, ContactBanner, Layout, ProjectArt } from "./views/components";
import { Contact, ThankYou } from "./views/contact";
import { Home } from "./views/home";

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://challenges.cloudflare.com"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'", "https://challenges.cloudflare.com"],
      frameSrc: ["https://challenges.cloudflare.com"],
      objectSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
    referrerPolicy: "strict-origin-when-cross-origin",
    permissionsPolicy: { camera: [], microphone: [], geolocation: [] },
  }),
);

app.use("*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});

app.get("/api/health", async (c) => {
  await c.env.DB.prepare("SELECT id FROM services LIMIT 1").first();
  return c.json({
    status: "ok",
    database: "reachable",
    phase: 1,
    environment: c.env.ENVIRONMENT,
  });
});

app.use(
  "/api/inquiries",
  bodyLimit({
    maxSize: 64000,
    onError: (c) => c.text("Request too large.", 413),
  }),
);

app.get("/", async (c) => {
  const content = await loadContent(c.env.DB);
  return c.html(
    <Layout
      content={content}
      siteUrl={c.env.SITE_URL}
      title={content.settings.seo_title}
      description={content.settings.seo_description}
    >
      <Home content={content} />
    </Layout>,
  );
});

app.get("/services/:slug", async (c) => {
  const content = await loadContent(c.env.DB);
  const service = content.services.find(
    (row) => row.slug === c.req.param("slug"),
  );
  if (!service) return c.notFound();
  return c.html(
    <Layout
      content={content}
      siteUrl={c.env.SITE_URL}
      path={`/services/${service.slug}`}
      title={
        service.seo_title || `${service.title} — ${content.settings.brand_name}`
      }
      description={service.seo_description || service.short_description}
    >
      <section class="section wrap simple-page">
        <a class="text-link" href="/#services">
          ← All services
        </a>
        <p class="eyebrow">What we do</p>
        <h1>{service.title}</h1>
        <p class="standfirst">{service.short_description}</p>
        <div class="prose">
          {service.content
            .replaceAll("\\n", "\n")
            .split("\n\n")
            .map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
        </div>
        <a class="button button-orange" href={`/contact?service=${service.id}`}>
          Discuss your project <Arrow diagonal />
        </a>
      </section>
      <ContactBanner content={content} />
    </Layout>,
  );
});

app.get("/work/:slug", async (c) => {
  const content = await loadContent(c.env.DB);
  const project = await c.env.DB.prepare(
    "SELECT * FROM projects WHERE slug = ? AND status = 'published' AND archived_at IS NULL",
  )
    .bind(c.req.param("slug"))
    .first<Project>();
  if (!project) return c.notFound();
  return c.html(
    <Layout
      content={content}
      siteUrl={c.env.SITE_URL}
      path={`/work/${project.slug}`}
      title={`${project.title} — ${content.settings.brand_name}`}
      description={project.summary}
    >
      <section class="section wrap case-page">
        <a class="text-link" href="/#work">
          ← Back to our thinking
        </a>
        <p class="eyebrow">
          {project.category} ·{" "}
          {project.is_concept ? "Studio concept" : "Client project"}
        </p>
        <h1>{project.title}</h1>
        <p class="standfirst">{project.summary}</p>
        <ProjectArt project={project} />
        <div class="case-grid">
          {[
            { title: "The question", body: project.problem },
            { title: "Our direction", body: project.solution },
            { title: "The outcome", body: project.results },
          ].map((section) => (
            <div key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </div>
          ))}
        </div>
      </section>
      <ContactBanner content={content} />
    </Layout>,
  );
});

app.get("/contact", async (c) => {
  const content = await loadContent(c.env.DB);
  const local = canSkipTurnstile(c.env, c.req.raw);
  const ready =
    local || Boolean(c.env.TURNSTILE_SITE_KEY && c.env.TURNSTILE_SECRET_KEY);
  return c.html(
    <Layout
      content={content}
      siteUrl={c.env.SITE_URL}
      path="/contact"
      title={`Start a project — ${content.settings.brand_name}`}
      description="Tell us about your business, your project, and your next move."
      turnstile={!local && ready}
    >
      <Contact
        content={content}
        ready={ready}
        siteKey={local ? undefined : c.env.TURNSTILE_SITE_KEY}
        values={{ service: c.req.query("service") || "" }}
      />
    </Layout>,
  );
});

app.post("/api/inquiries", async (c) => {
  if (!isSameOrigin(c.req.raw)) return c.text("Request origin rejected.", 403);
  const type = c.req.header("Content-Type") || "";
  if (!type.startsWith("application/x-www-form-urlencoded"))
    return c.text("Unsupported request format.", 415);
  const rawBody = await c.req.text();
  const subject = await hashSubject(
    `${c.req.header("CF-Connecting-IP") || "local"}:inquiry`,
  );
  if (!(await consumeLimit(c.env.DB, subject))) {
    c.header("Retry-After", "600");
    return c.text("Too many inquiries. Please try again in 10 minutes.", 429);
  }
  const values = Object.fromEntries(new URLSearchParams(rawBody));
  const parsed = inquirySchema.safeParse(values);
  const content = await loadContent(c.env.DB);
  const fail = (message: string) =>
    c.html(
      <Layout
        content={content}
        siteUrl={c.env.SITE_URL}
        path="/contact"
        title="Review your inquiry — Controlex Media"
        description="Review your project inquiry."
        noindex
        turnstile={!canSkipTurnstile(c.env, c.req.raw)}
      >
        <Contact
          content={content}
          error={message}
          values={values}
          siteKey={
            canSkipTurnstile(c.env, c.req.raw)
              ? undefined
              : c.env.TURNSTILE_SITE_KEY
          }
        />
      </Layout>,
      400,
    );
  if (!parsed.success)
    return fail(
      "Please check all required fields. Your project description should contain between 30 and 4,000 characters, and you must accept the privacy notice.",
    );
  const data = parsed.data;
  if (data.website) return c.text("Submission rejected.", 400);
  if (!content.services.some((service) => service.id === data.service))
    return fail("Please choose an available service.");
  if (!canSkipTurnstile(c.env, c.req.raw)) {
    if (!c.env.TURNSTILE_SECRET_KEY || !c.env.TURNSTILE_SITE_KEY)
      return c.text("Inquiries are temporarily unavailable.", 503);
    let verified = false;
    try {
      verified = await verifyTurnstile(
        data["cf-turnstile-response"] || "",
        c.env,
      );
    } catch {
      return c.text(
        "Verification service unavailable. Please try again later.",
        503,
      );
    }
    if (!verified)
      return fail("Please complete the anti-spam verification again.");
  }
  await c.env.DB.prepare(
    "INSERT INTO leads(id,name,email,company,service_id,budget,message) VALUES(?,?,?,?,?,?,?)",
  )
    .bind(
      crypto.randomUUID(),
      data.name,
      data.email,
      data.company,
      data.service,
      data.budget,
      data.message,
    )
    .run();
  // Best-effort bounded-state cleanup; it cannot change the successful submission.
  c.executionCtx.waitUntil(
    c.env.DB.prepare("DELETE FROM rate_limits WHERE window < ?")
      .bind(Math.floor(Date.now() / 600000) - 6)
      .run(),
  );
  return c.redirect("/thank-you", 303);
});

app.get("/thank-you", async (c) => {
  const content = await loadContent(c.env.DB);
  return c.html(
    <Layout
      content={content}
      siteUrl={c.env.SITE_URL}
      path="/thank-you"
      title="Inquiry received — Controlex Media"
      description="Your project inquiry was received."
      noindex
    >
      <ThankYou />
    </Layout>,
  );
});

app.get("/privacy", async (c) => {
  const content = await loadContent(c.env.DB);
  return c.html(
    <Layout
      content={content}
      siteUrl={c.env.SITE_URL}
      path="/privacy"
      title="Privacy notice — Controlex Media"
      description="How project inquiry information is handled."
      noindex
    >
      <section class="section wrap simple-page prose">
        <p class="eyebrow">Development privacy notice · 6 October 2026</p>
        <h1>
          Your information.
          <br />
          Handled with care.
        </h1>
        <p>
          The inquiry form collects your name, email, optional company, service,
          budget direction, and project description so the studio can assess and
          respond to your request. Submissions are stored in the site’s
          database. A temporary hash of your network address may be used
          temporarily to limit spam.
        </p>
        <p>
          Production anti-spam checks use Cloudflare Turnstile. No advertising
          or analytics cookies are installed by this application in Phase 1.
          Cloudflare infrastructure may process technical request data.
        </p>
        <p>
          This development notice requires the business’s legal identity,
          privacy contact, retention period, and applicable jurisdiction before
          public launch. Do not submit sensitive personal or financial
          information.
        </p>
      </section>
    </Layout>,
  );
});

app.get("/terms", async (c) => {
  const content = await loadContent(c.env.DB);
  return c.html(
    <Layout
      content={content}
      siteUrl={c.env.SITE_URL}
      path="/terms"
      title="Terms — Controlex Media"
      description="Project inquiries and engagement terms."
      noindex
    >
      <section class="section wrap simple-page prose">
        <p class="eyebrow">Development terms · 6 October 2026</p>
        <h1>A clear start.</h1>
        <p>
          A project inquiry is not a contract or a payment. Scope, deliverables,
          timelines, intellectual property, fees, revisions, and cancellation
          terms must be agreed in a separate written engagement before work
          begins.
        </p>
        <p>
          Portfolio pieces marked “Studio concept” are original design
          explorations. They are not client endorsements or evidence of measured
          business results.
        </p>
        <p>
          These development terms require the legal entity details,
          jurisdiction, and review before public launch.
        </p>
      </section>
    </Layout>,
  );
});

app.get("/robots.txt", (c) =>
  c.text(
    `User-agent: *\n${c.env.ENVIRONMENT === "local" ? "Disallow: /" : "Allow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /thank-you"}\nSitemap: ${new URL("/sitemap.xml", c.env.SITE_URL).href}\n`,
  ),
);
app.get("/sitemap.xml", async (c) => {
  const content = await loadContent(c.env.DB);
  const projects = await c.env.DB.prepare(
    "SELECT slug FROM projects WHERE status = 'published' AND archived_at IS NULL",
  ).all<{ slug: string }>();
  const paths = [
    "/",
    "/contact",
    ...content.services.map(
      (service) => `/services/${encodeURIComponent(service.slug)}`,
    ),
    ...projects.results.map(
      (project) => `/work/${encodeURIComponent(project.slug)}`,
    ),
  ];
  c.header("Content-Type", "application/xml; charset=utf-8");
  return c.body(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${new URL(path, c.env.SITE_URL).href.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</loc></url>`).join("")}</urlset>`,
  );
});

// Fail closed. No fake login, development administrator or public registration.
app.all("/admin", (c) =>
  c.text("Administrator access has not been configured.", 503),
);
app.all("/admin/*", (c) =>
  c.text("Administrator access has not been configured.", 503),
);
app.all("/api/admin/*", (c) =>
  c.text("Administrator access has not been configured.", 503),
);

app.notFound(async (c) => {
  const content = await loadContent(c.env.DB);
  return c.html(
    <Layout
      content={content}
      siteUrl={c.env.SITE_URL}
      title="Page not found — Controlex Media"
      description="This page could not be found."
      noindex
    >
      <section class="section wrap simple-page">
        <p class="eyebrow">404 / A small detour</p>
        <h1>
          Let’s get you
          <br />
          <em>back on track.</em>
        </h1>
        <a class="button button-orange" href="/">
          Back to the studio <Arrow />
        </a>
      </section>
    </Layout>,
    404,
  );
});
app.onError((error, c) => {
  console.error("request_failed", { name: error.name });
  return c.text(
    "The studio is temporarily unavailable. Please try again later.",
    503,
  );
});

export default app;
