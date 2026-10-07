import { Hono } from "hono";
import type { AdminEnv } from "../security/admin";
import { validCsrf } from "../security/admin";
import { AdminLayout } from "./views";

export function imageType(bytes: Uint8Array): string | null {
  if (bytes.length < 16) return null;
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value))
    return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if (
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}
export const mediaRoutes = new Hono<AdminEnv>();
mediaRoutes.get("/media", async (c) => {
  const media = await c.env.DB.prepare(
    "SELECT * FROM media WHERE archived_at IS NULL ORDER BY created_at DESC LIMIT 200",
  ).all<{ id: string; alt_text: string; byte_size: number }>();
  return c.html(
    <AdminLayout
      user={c.get("user")}
      csrf={c.get("csrf")}
      title="Media library"
    >
      <p class="admin-intro">
        Public website images and logos only. PNG, JPEG or WebP, up to 10 MB.
        Large images are resized in your browser where supported. Do not upload
        private documents.
      </p>
      {!c.env.MEDIA && (
        <p class="form-alert">
          Configure the R2 MEDIA binding before uploading.
        </p>
      )}
      <form
        class="admin-form"
        method="post"
        action="/admin/media"
        enctype="multipart/form-data"
      >
        <input type="hidden" name="_csrf" value={c.get("csrf")} />
        <label>
          Image
          <input
            type="file"
            name="image"
            accept="image/png,image/jpeg,image/webp"
            required
            data-image-upload="true"
          />
        </label>
        <label>
          Alternative text / asset name
          <input name="alt_text" required maxlength={300} />
        </label>
        <button class="button button-orange" type="submit">
          Upload image
        </button>
      </form>
      <div class="media-grid">
        {media.results.map((image) => (
          <article class="media-card" key={image.id}>
            <img
              src={`/media/${image.id}`}
              alt={image.alt_text}
              width="320"
              height="220"
              loading="lazy"
            />
            <form method="post" action={`/admin/media/${image.id}`}>
              <input type="hidden" name="_csrf" value={c.get("csrf")} />
              <label>
                Alternative text
                <input
                  name="alt_text"
                  value={image.alt_text}
                  required
                  maxlength={300}
                />
              </label>
              <p class="small-note">
                {Math.ceil(image.byte_size / 1024)} KB · Image ID: {image.id}
              </p>
              <button type="submit">Save description</button>
            </form>
            <form
              class="archive-form"
              method="post"
              action={`/admin/media/${image.id}/archive`}
            >
              <input type="hidden" name="_csrf" value={c.get("csrf")} />
              <button type="submit">Archive unused image</button>
            </form>
          </article>
        ))}
      </div>
    </AdminLayout>,
  );
});
mediaRoutes.post("/media", async (c) => {
  const body = await c.req.parseBody();
  if (!validCsrf(c, body)) return c.text("Request rejected.", 403);
  if (!c.env.MEDIA) return c.text("R2 MEDIA binding is required.", 503);
  const file = body.image,
    alt = String(body.alt_text || "").trim();
  if (
    !(file instanceof File) ||
    !alt ||
    alt.length > 300 ||
    !file.size ||
    file.size > 10 * 1024 * 1024
  )
    return c.text(
      "Choose an image up to 10 MB and provide alternative text.",
      400,
    );
  const bytes = new Uint8Array(await file.arrayBuffer()),
    mime = imageType(bytes);
  if (!mime || file.type !== mime)
    return c.text(
      "Only verified PNG, JPEG and WebP images are supported. SVG/HTML uploads are rejected.",
      400,
    );
  const id = crypto.randomUUID(),
    objectKey = `images/${id}`;
  await c.env.MEDIA.put(objectKey, bytes, {
    httpMetadata: { contentType: mime },
  });
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO media(id,object_key,mime_type,byte_size,alt_text,uploaded_by) VALUES(?,?,?,?,?,?)",
      ).bind(id, objectKey, mime, file.size, alt, c.get("user").id),
      c.env.DB.prepare(
        "INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id) VALUES(?,?,'upload','media',?)",
      ).bind(crypto.randomUUID(), c.get("user").id, id),
    ]);
  } catch (error) {
    await c.env.MEDIA.delete(objectKey);
    throw error;
  }
  return c.redirect("/admin/media", 303);
});
mediaRoutes.post("/media/:id", async (c) => {
  const body = await c.req.parseBody();
  if (!validCsrf(c, body)) return c.text("Request rejected.", 403);
  const alt = String(body.alt_text || "").trim();
  if (!alt || alt.length > 300)
    return c.text("A useful alternative text is required.", 400);
  await c.env.DB.prepare(
    "UPDATE media SET alt_text=? WHERE id=? AND archived_at IS NULL",
  )
    .bind(alt, c.req.param("id"))
    .run();
  return c.redirect("/admin/media", 303);
});
mediaRoutes.post("/media/:id/archive", async (c) => {
  const body = await c.req.parseBody();
  if (!validCsrf(c, body)) return c.text("Request rejected.", 403);
  const id = c.req.param("id");
  const used = await c.env.DB.prepare(
    "SELECT id FROM projects WHERE cover_media_id=? OR EXISTS(SELECT 1 FROM json_each(projects.media_json) WHERE value=?) UNION ALL SELECT id FROM services WHERE media_id=? UNION ALL SELECT id FROM testimonials WHERE media_id=? UNION ALL SELECT key AS id FROM settings WHERE key='logo_media_id' AND value=? UNION ALL SELECT id FROM pages WHERE og_media_id=? LIMIT 1",
  )
    .bind(id, id, id, id, id, id)
    .first();
  if (used)
    return c.text(
      "This image is referenced by content or branding. Remove its references before archiving.",
      409,
    );
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE media SET archived_at=CURRENT_TIMESTAMP WHERE id=?",
    ).bind(id),
    c.env.DB.prepare(
      "INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id) VALUES(?,?,'archive','media',?)",
    ).bind(crypto.randomUUID(), c.get("user").id, id),
  ]);
  return c.redirect("/admin/media", 303);
});
