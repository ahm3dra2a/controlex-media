import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { loadContent } from "../data/content";
import type { AdminEnv } from "../security/admin";
import {
  localAdminAllowed,
  login,
  logout,
  requireAdmin,
  validCsrf,
} from "../security/admin";
import { isSameOrigin } from "../security/inquiry";
import type { Project } from "../types";
import { Layout, ProjectArt } from "../views/components";
import { businessRoutes } from "./business";
import { mediaRoutes } from "./media";
import { parseRecord, resources } from "./resources";
import { settingsRoutes } from "./settings";
import { AdminLayout, Editor, Login } from "./views";

export const admin = new Hono<AdminEnv>();
admin.get("/login", (c) => {
  if (!localAdminAllowed(c.env, c.req.raw))
    return c.text(
      "Use your invited Cloudflare Access identity to access /admin.",
      401,
    );
  return c.html(<Login ready={Boolean(c.env.LOCAL_ADMIN_PASSWORD_HASH)} />);
});
admin.post("/login", bodyLimit({ maxSize: 4000 }), async (c) => {
  if (!isSameOrigin(c.req.raw)) return c.text("Request origin rejected.", 403);
  const data = await c.req.parseBody();
  if (
    typeof data.email !== "string" ||
    typeof data.password !== "string" ||
    !(await login(c, data.email, data.password))
  )
    return c.html(
      <Login
        ready={Boolean(c.env.LOCAL_ADMIN_PASSWORD_HASH)}
        error="Sign-in failed. Check your details or try again later."
      />,
      401,
    );
  return c.redirect("/admin", 303);
});
admin.use("*", requireAdmin);
admin.use("*", bodyLimit({ maxSize: 10 * 1024 * 1024 + 64000 }));
admin.post("/logout", async (c) => {
  const data = await c.req.parseBody();
  if (!validCsrf(c, data)) return c.text("Request rejected.", 403);
  logout(c);
  return c.redirect(
    localAdminAllowed(c.env, c.req.raw)
      ? "/admin/login"
      : `https://${c.env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/logout`,
    303,
  );
});
admin.get("/", async (c) => {
  const counts = await c.env.DB.batch([
    c.env.DB.prepare(
      "SELECT count(*) AS n FROM services WHERE archived_at IS NULL",
    ),
    c.env.DB.prepare(
      "SELECT count(*) AS n FROM projects WHERE archived_at IS NULL",
    ),
    c.env.DB.prepare(
      "SELECT count(*) AS n FROM leads WHERE status='new' AND archived_at IS NULL",
    ),
    c.env.DB.prepare(
      "SELECT count(*) AS n FROM orders WHERE status IN ('pending','awaiting_verification') AND archived_at IS NULL",
    ),
  ]);
  return c.html(
    <AdminLayout
      user={c.get("user")}
      csrf={c.get("csrf")}
      title="Studio overview"
    >
      <p class="admin-intro">
        Manage what your clients see and what your studio needs to follow up.
      </p>
      <div class="dashboard-grid">
        {[
          "Published service system",
          "Showcase projects",
          "New project inquiries",
          "Open orders",
        ].map((label, index) => (
          <article key={label} class="dashboard-stat">
            <strong>
              {String((counts[index].results[0] as { n: number }).n)}
            </strong>
            <span>{label}</span>
          </article>
        ))}
      </div>
      <div class="admin-panel">
        <h2>Your website, in your hands.</h2>
        <p>
          Use the navigation to create content, keep drafts, publish approved
          work, upload your logo, and manage inquiries. Archive items safely
          instead of deleting client records.
        </p>
        <a class="button button-orange" href="/admin/content/projects">
          Manage the showcase
        </a>
      </div>
    </AdminLayout>,
  );
});
admin.get("/content/:kind", async (c) => {
  const key = c.req.param("kind"),
    resource = Object.hasOwn(resources, key) ? resources[key] : undefined;
  if (!resource) return c.notFound();
  const rows = await c.env.DB.prepare(
    `SELECT * FROM ${key} WHERE archived_at IS NULL ORDER BY ${resource.fields.some((f) => f.name === "sort_order") ? "sort_order," : ""} created_at DESC LIMIT 200`,
  ).all<Record<string, unknown>>();
  return c.html(
    <AdminLayout
      user={c.get("user")}
      csrf={c.get("csrf")}
      title={resource.title}
    >
      <div class="admin-actions">
        <a class="button button-orange" href={`/admin/content/${key}/new`}>
          Add {resource.singular.toLowerCase()}
        </a>
        <p>Open an item to edit, publish, reorder or archive it.</p>
      </div>
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Status</th>
              <th>Order</th>
              <th>Last updated</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.results.map((row) => (
              <tr key={String(row.id)}>
                <td>
                  {String(
                    row.title || row.question || row.platform || row.name,
                  )}
                </td>
                <td>
                  {String(row.status || (row.enabled ? "active" : "disabled"))}
                </td>
                <td>{String(row.sort_order || 0)}</td>
                <td>{String(row.updated_at)}</td>
                <td>
                  <a href={`/admin/content/${key}/${row.id}`}>Edit →</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.results.length && (
          <p class="admin-empty">
            No items yet. Add your first {resource.singular.toLowerCase()}.
          </p>
        )}
      </div>
    </AdminLayout>,
  );
});
admin.get("/content/:kind/:id/preview", async (c) => {
  const key = c.req.param("kind");
  if (!(Object.hasOwn(resources, key) ? resources[key] : undefined))
    return c.notFound();
  const row = await c.env.DB.prepare(`SELECT * FROM ${key} WHERE id=?`)
    .bind(c.req.param("id"))
    .first<Record<string, unknown>>();
  if (!row) return c.notFound();
  const content = await loadContent(c.env.DB);
  const text =
    key === "pages"
      ? (JSON.parse(String(row.blocks_json)) as { text: string }[])
          .map((v) => v.text)
          .join("\n\n")
      : String(row.content || row.summary || "");
  return c.html(
    <Layout
      content={content}
      siteUrl={c.env.SITE_URL}
      title={`Draft preview — ${row.title}`}
      description="Private draft preview"
      noindex
    >
      <section class="section wrap simple-page">
        <p class="eyebrow">Private preview · {String(row.status)}</p>
        <h1>{String(row.title)}</h1>
        {key === "projects" && (
          <ProjectArt project={row as unknown as Project} />
        )}
        <div class="prose">
          {text.split(/\n\s*\n/).map((line, i) => (
            <p key={`${i}-${line.slice(0, 20)}`}>{line}</p>
          ))}
        </div>
      </section>
    </Layout>,
  );
});
admin.get("/content/:kind/:id", async (c) => {
  const key = c.req.param("kind"),
    resource = Object.hasOwn(resources, key) ? resources[key] : undefined;
  if (!resource) return c.notFound();
  const id = c.req.param("id");
  const row =
    id === "new"
      ? { is_concept: 1, enabled: 1, status: "draft" }
      : await c.env.DB.prepare(
          `SELECT * FROM ${key} WHERE id=? AND archived_at IS NULL`,
        )
          .bind(id)
          .first<Record<string, unknown>>();
  if (!row) return c.notFound();
  const media = await c.env.DB.prepare(
    "SELECT id,alt_text FROM media WHERE archived_at IS NULL ORDER BY created_at DESC LIMIT 200",
  ).all<{ id: string; alt_text: string }>();
  const services = await c.env.DB.prepare(
    "SELECT id,title FROM services WHERE archived_at IS NULL ORDER BY sort_order",
  ).all<{ id: string; title: string }>();
  const selected =
    key === "projects" && id !== "new"
      ? await c.env.DB.prepare(
          "SELECT service_id FROM project_services WHERE project_id=?",
        )
          .bind(id)
          .all<{ service_id: string }>()
      : { results: [] };
  return c.html(
    <AdminLayout
      user={c.get("user")}
      csrf={c.get("csrf")}
      title={`${id === "new" ? "Add" : "Edit"} ${resource.singular.toLowerCase()}`}
    >
      <Editor
        keyName={key}
        resource={resource}
        record={row}
        csrf={c.get("csrf")}
        media={media.results}
        services={services.results}
        selectedServices={selected.results.map((v) => v.service_id)}
      />
    </AdminLayout>,
  );
});
admin.post("/content/:kind/:id", async (c) => {
  const key = c.req.param("kind"),
    resource = Object.hasOwn(resources, key) ? resources[key] : undefined;
  if (!resource) return c.notFound();
  if (Number(c.req.header("Content-Length") || 0) > 64000)
    return c.text("Content too large.", 413);
  const body = await c.req.parseBody();
  if (!validCsrf(c, body))
    return c.text("Request rejected. Reload the editor and try again.", 403);
  let values: Record<string, string | number | null>;
  try {
    values = parseRecord(resource, body);
  } catch (error) {
    return c.text(
      error instanceof Error ? error.message : "Invalid fields",
      400,
    );
  }
  const creating = c.req.param("id") === "new",
    id = creating ? crypto.randomUUID() : c.req.param("id");
  const old = creating
    ? null
    : await c.env.DB.prepare(
        `SELECT * FROM ${key} WHERE id=? AND archived_at IS NULL`,
      )
        .bind(id)
        .first<Record<string, unknown>>();
  if (!creating && !old) return c.notFound();
  const revision = Number(body._revision);
  if (!Number.isSafeInteger(revision) || revision < 0)
    return c.text("Invalid edit revision.", 400);
  if (old && Number(old.revision) !== revision)
    return c.text(
      "This item changed in another editor. Reload it before saving.",
      409,
    );
  if (values.slug) {
    const duplicate = await c.env.DB.prepare(
      `SELECT id FROM ${key} WHERE slug=? AND id<>?`,
    )
      .bind(values.slug, id)
      .first();
    if (duplicate)
      return c.text(
        "That URL slug is already in use. Choose a different slug.",
        400,
      );
  }
  for (const name of ["media_id", "cover_media_id", "og_media_id"]) {
    if (
      values[name] &&
      !(await c.env.DB.prepare(
        "SELECT id FROM media WHERE id=? AND archived_at IS NULL",
      )
        .bind(values[name])
        .first())
    )
      return c.text("Selected image is unavailable.", 400);
  }
  if (key === "projects") {
    const ids = JSON.parse(String(values.media_json || "[]")) as string[];
    const count = await c.env.DB.prepare(
      "SELECT count(*) AS n FROM media WHERE archived_at IS NULL AND id IN (SELECT value FROM json_each(?))",
    )
      .bind(JSON.stringify(ids))
      .first<{ n: number }>();
    if (count?.n !== new Set(ids).size)
      return c.text("A gallery image is unavailable.", 400);
  }
  const columns = Object.keys(values),
    statements: D1PreparedStatement[] = [];
  if (old)
    statements.push(
      c.env.DB.prepare(
        `INSERT INTO content_revisions(id,entity_type,entity_id,snapshot_json,actor_id) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM ${key} WHERE id=? AND revision=?)`,
      ).bind(
        crypto.randomUUID(),
        key,
        id,
        JSON.stringify(old),
        c.get("user").id,
        id,
        revision,
      ),
    );
  const mutation = creating
    ? c.env.DB.prepare(
        `INSERT INTO ${key}(id,${columns.join(",")}) VALUES(?${",?".repeat(columns.length)})`,
      ).bind(id, ...Object.values(values))
    : c.env.DB.prepare(
        `UPDATE ${key} SET ${columns.map((column) => `${column}=?`).join(",")},revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND revision=?`,
      ).bind(...Object.values(values), id, revision);
  statements.push(mutation);
  const auditId = crypto.randomUUID();
  statements.push(
    c.env.DB.prepare(
      "INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id) SELECT ?,?,?,?,? WHERE changes()=1",
    ).bind(auditId, c.get("user").id, creating ? "create" : "update", key, id),
  );
  if (key === "projects") {
    const services = await c.env.DB.prepare(
      "SELECT id FROM services WHERE archived_at IS NULL",
    ).all<{ id: string }>();
    const selected = services.results
      .filter((service) => body[`service_${service.id}`] === "1")
      .map((service) => service.id);
    statements.push(
      c.env.DB.prepare(
        "DELETE FROM project_services WHERE project_id=? AND EXISTS(SELECT 1 FROM audit_log WHERE id=?)",
      ).bind(id, auditId),
    );
    statements.push(
      c.env.DB.prepare(
        "INSERT OR IGNORE INTO project_services(project_id,service_id) SELECT ?,value FROM json_each(?) WHERE EXISTS(SELECT 1 FROM audit_log WHERE id=?)",
      ).bind(id, JSON.stringify(selected), auditId),
    );
  }
  const result = await c.env.DB.batch(statements);
  if (!result[old ? 1 : 0].meta.changes)
    return c.text("Concurrent edit detected. Reload before saving.", 409);
  return c.redirect(`/admin/content/${key}/${id}`, 303);
});
admin.post("/content/:kind/:id/archive", async (c) => {
  const key = c.req.param("kind");
  if (!(Object.hasOwn(resources, key) ? resources[key] : undefined))
    return c.notFound();
  const body = await c.req.parseBody();
  if (!validCsrf(c, body)) return c.text("Request rejected.", 403);
  const result = await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE ${key} SET archived_at=CURRENT_TIMESTAMP,revision=revision+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND revision=? AND archived_at IS NULL`,
    ).bind(c.req.param("id"), Number(body._revision)),
    c.env.DB.prepare(
      "INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id) SELECT ?,?,'archive',?,? WHERE changes()=1",
    ).bind(crypto.randomUUID(), c.get("user").id, key, c.req.param("id")),
  ]);
  if (!result[0].meta.changes)
    return c.text("Item changed or already archived. Reload the list.", 409);
  return c.redirect(`/admin/content/${key}`, 303);
});
admin.route("/", settingsRoutes);
admin.route("/", mediaRoutes);
admin.route("/", businessRoutes);
