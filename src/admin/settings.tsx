import { Hono } from "hono";
import { z } from "zod";
import type { AdminEnv } from "../security/admin";
import { validCsrf } from "../security/admin";
import { AdminLayout } from "./views";

const fields: Record<
  string,
  { label: string; area?: boolean; group: string; limit?: number }
> = {
  brand_line_one: {
    label: "Wordmark first line",
    group: "Brand identity",
    limit: 60,
  },
  brand_line_two: {
    label: "Wordmark second line",
    group: "Brand identity",
    limit: 60,
  },
  brand_name: { label: "Business name", group: "Brand identity", limit: 160 },
  primary_top: {
    label: "Primary gradient top (#RRGGBB)",
    group: "Brand identity",
    limit: 7,
  },
  primary_bottom: {
    label: "Primary gradient bottom (#RRGGBB)",
    group: "Brand identity",
    limit: 7,
  },
  hero_eyebrow: { label: "Hero eyebrow", group: "Homepage" },
  hero_line_one: { label: "Hero line 1", group: "Homepage" },
  hero_line_two: { label: "Hero line 2", group: "Homepage" },
  hero_line_three: { label: "Hero line 3", group: "Homepage" },
  hero_description: {
    label: "Hero description",
    group: "Homepage",
    area: true,
  },
  about_heading: { label: "Studio heading", group: "Homepage" },
  about_body: { label: "Studio description", group: "Homepage", area: true },
  studio_title: { label: "Studio statement", group: "Homepage" },
  studio_body: {
    label: "Studio supporting text",
    group: "Homepage",
    area: true,
  },
  contact_heading: { label: "Contact heading", group: "Homepage" },
  contact_body: {
    label: "Contact introduction",
    group: "Homepage",
    area: true,
  },
  tagline: { label: "Tagline", group: "Homepage" },
  location: { label: "Business location", group: "Contact & footer" },
  contact_email: { label: "Inquiry email", group: "Contact & footer" },
  contact_phone: { label: "Business telephone", group: "Contact & footer" },
  footer_note: { label: "Footer note", group: "Contact & footer" },
  legal_name: { label: "Legal business name", group: "Contact & footer" },
  privacy_email: { label: "Privacy contact email", group: "Contact & footer" },
  retention_notice: {
    label: "Inquiry retention policy",
    group: "Contact & footer",
    area: true,
  },
  payment_instructions: {
    label: "Invoice payment instructions",
    group: "Payments",
    area: true,
    limit: 6000,
  },
  seo_title: { label: "Homepage SEO title", group: "SEO", limit: 160 },
  seo_description: {
    label: "Homepage SEO description",
    group: "SEO",
    area: true,
    limit: 320,
  },
};
const toggles = ["work", "services", "about", "process", "packages", "faq"];
function links(value: string) {
  return value
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      const [label, url] = line.split("|").map((part) => part.trim());
      if (
        !label ||
        label.length > 80 ||
        !url ||
        (!/^\/(?!\/)[^\s]*$/.test(url) && !/^https:\/\//.test(url))
      )
        throw new Error(
          "Navigation links must use Label | /path or Label | https://address.",
        );
      if (url.startsWith("https://")) {
        const parsed = new URL(url);
        if (parsed.username || parsed.password)
          throw new Error("Link credentials are not permitted.");
      }
      return { label, url };
    });
}
export const settingsRoutes = new Hono<AdminEnv>();
settingsRoutes.use("/settings", async (c, next) => {
  if (c.get("user").role !== "owner")
    return c.text("Owner access required.", 403);
  await next();
});
settingsRoutes.get("/settings", async (c) => {
  const data = await c.env.DB.prepare("SELECT key,value FROM settings").all<{
    key: string;
    value: string;
  }>();
  const settings = Object.fromEntries(
    data.results.map((row) => [row.key, row.value]),
  );
  const media = await c.env.DB.prepare(
    "SELECT id,alt_text FROM media WHERE archived_at IS NULL ORDER BY created_at DESC",
  ).all<{ id: string; alt_text: string }>();
  const nav = JSON.parse(settings.navigation_json || "[]") as {
    label: string;
    url: string;
  }[];
  const footer = JSON.parse(
    settings.footer_links_json ||
      '[{"label":"Privacy","url":"/privacy"},{"label":"Terms","url":"/terms"}]',
  ) as { label: string; url: string }[];
  const process = JSON.parse(settings.process_json || "[]") as {
    title: string;
    body: string;
  }[];
  return c.html(
    <AdminLayout
      user={c.get("user")}
      csrf={c.get("csrf")}
      title="Branding & website settings"
    >
      <p class="admin-intro">
        Upload your actual logo in the media library, then select it here. No
        invented logo is used when this is blank.
      </p>
      <form class="admin-form" method="post" action="/admin/settings">
        <input type="hidden" name="_csrf" value={c.get("csrf")} />
        <label>
          Logo image
          <select name="logo_media_id">
            <option value="">Text wordmark only</option>
            {media.results.map((image) => (
              <option
                key={image.id}
                value={image.id}
                selected={settings.logo_media_id === image.id}
              >
                {image.alt_text}
              </option>
            ))}
          </select>
        </label>
        {Array.from(
          new Set(Object.values(fields).map((field) => field.group)),
        ).map((group) => (
          <fieldset key={group}>
            <legend>{group}</legend>
            {Object.entries(fields)
              .filter(([, field]) => field.group === group)
              .map(([key, field]) => (
                <label key={key} for={`setting-${key}`}>
                  {field.label}
                  {field.area ? (
                    <textarea
                      id={`setting-${key}`}
                      name={key}
                      rows={4}
                      maxlength={field.limit || 4000}
                    >
                      {settings[key] || ""}
                    </textarea>
                  ) : (
                    <input
                      id={`setting-${key}`}
                      name={key}
                      value={
                        settings[key] ||
                        (key === "primary_top"
                          ? "#FF451D"
                          : key === "primary_bottom"
                            ? "#FF5E00"
                            : "")
                      }
                      maxlength={field.limit || 4000}
                    />
                  )}
                </label>
              ))}
          </fieldset>
        ))}
        <fieldset>
          <legend>Navigation & homepage sections</legend>
          <label>
            Navigation links (one Label | /path per line)
            <textarea name="navigation" rows={5}>
              {nav.map((link) => `${link.label} | ${link.url}`).join("\n")}
            </textarea>
          </label>
          <label>
            Footer links
            <textarea name="footer_links" rows={4}>
              {footer.map((link) => `${link.label} | ${link.url}`).join("\n")}
            </textarea>
          </label>
          {toggles.map((section) => (
            <label class="checkbox-label" key={section}>
              <input
                type="checkbox"
                name={`show_${section}`}
                value="1"
                checked={settings[`show_${section}`] !== "0"}
              />
              {`Show ${section} section`}
            </label>
          ))}
        </fieldset>
        <label>
          Process steps (one Title | Description per line)
          <textarea name="process_steps" rows={8}>
            {process.map((step) => `${step.title} | ${step.body}`).join("\n")}
          </textarea>
        </label>
        <button class="button button-orange" type="submit">
          Save website settings
        </button>
      </form>
    </AdminLayout>,
  );
});
settingsRoutes.post("/settings", async (c) => {
  const body = await c.req.parseBody();
  if (!validCsrf(c, body)) return c.text("Request rejected.", 403);
  const values: Record<string, string> = {};
  try {
    for (const [key, field] of Object.entries(fields)) {
      const value = body[key];
      if (typeof value !== "string" || value.length > (field.limit || 4000))
        throw new Error(`${field.label}: invalid or too long.`);
      values[key] = value.trim();
    }
    if (!values.brand_name || !values.brand_line_one || !values.brand_line_two)
      throw new Error("Business name and both wordmark lines are required.");
    for (const key of ["primary_top", "primary_bottom"])
      if (!/^#[a-fA-F0-9]{6}$/.test(values[key]))
        throw new Error("Use six-digit hexadecimal colours.");
    for (const key of ["contact_email", "privacy_email"])
      if (values[key] && !z.email().safeParse(values[key]).success)
        throw new Error("Use a valid email address.");
    values.navigation_json = JSON.stringify(
      links(String(body.navigation || "")),
    );
    values.footer_links_json = JSON.stringify(
      links(String(body.footer_links || "")),
    );
    const steps = String(body.process_steps || "")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [title, ...parts] = line.split("|");
        const text = parts.join("|").trim();
        if (!title.trim() || !text || title.length > 160 || text.length > 2000)
          throw new Error("Process steps need Title | Description.");
        return { title: title.trim(), body: text };
      });
    if (steps.length > 10)
      throw new Error("Use no more than ten process steps.");
    values.process_json = JSON.stringify(steps);
    for (const toggle of toggles)
      values[`show_${toggle}`] = body[`show_${toggle}`] === "1" ? "1" : "0";
    values.logo_media_id = String(body.logo_media_id || "");
    if (
      values.logo_media_id &&
      !(await c.env.DB.prepare(
        "SELECT id FROM media WHERE id=? AND archived_at IS NULL",
      )
        .bind(values.logo_media_id)
        .first())
    )
      throw new Error("Selected logo is unavailable.");
  } catch (error) {
    return c.text(
      error instanceof Error ? error.message : "Invalid settings",
      400,
    );
  }
  await c.env.DB.batch([
    ...Object.entries(values).map(([key, value]) =>
      c.env.DB.prepare(
        "INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP",
      ).bind(key, value),
    ),
    c.env.DB.prepare(
      "INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id) VALUES(?,?,'update','settings','website')",
    ).bind(crypto.randomUUID(), c.get("user").id),
  ]);
  return c.redirect("/admin/settings", 303);
});
