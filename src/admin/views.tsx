import type { Child } from "hono/jsx";
import type { AdminUser } from "../security/admin";
import { Arrow } from "../views/components";
import type { Resource } from "./resources";
import { fieldValue, resources } from "./resources";

export function AdminLayout({
  user,
  csrf,
  title,
  children,
}: {
  user: AdminUser;
  csrf: string;
  title: string;
  children: Child;
}) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="robots" content="noindex,nofollow" />
        <title>{title} — Controlex admin</title>
        <link rel="stylesheet" href="/site.css" />
        <link rel="stylesheet" href="/admin.css" />
        <link rel="stylesheet" href="/theme.css" />
        <script src="/admin.js" defer />
      </head>
      <body class="admin-body">
        <a class="skip-link" href="#admin-main">
          Skip to content
        </a>
        <header class="admin-header">
          <a class="admin-brand" href="/admin">
            controlex <span>studio manager</span>
          </a>
          <a href="/" target="_blank" rel="noopener">
            View website ↗
          </a>
          <span>
            {user.email} · {user.role}
          </span>
          <form method="post" action="/admin/logout">
            <input type="hidden" name="_csrf" value={csrf} />
            <button type="submit">Sign out</button>
          </form>
        </header>
        <div class="admin-shell">
          <nav class="admin-nav" aria-label="Admin navigation">
            <a href="/admin">Overview</a>
            {Object.entries(resources).map(([key, resource]) => (
              <a key={key} href={`/admin/content/${key}`}>
                {resource.title}
              </a>
            ))}
            <a href="/admin/media">Media library</a>
            <a href="/admin/leads">Project inquiries</a>
            {user.role === "owner" && (
              <>
                <a href="/admin/orders">Orders & invoices</a>
                <a href="/admin/settings">Branding & settings</a>
                <a href="/admin/users">Administrators</a>
                <a href="/admin/audit">Activity history</a>
              </>
            )}
          </nav>
          <main id="admin-main" class="admin-main">
            <h1>{title}</h1>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
export function Login({ ready, error }: { ready: boolean; error?: string }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="robots" content="noindex,nofollow" />
        <title>Studio sign in — Controlex Media</title>
        <link rel="stylesheet" href="/site.css" />
        <link rel="stylesheet" href="/admin.css" />
      </head>
      <body class="admin-body">
        <main class="login-panel">
          <a class="admin-brand" href="/">
            controlex
            <br />
            media
          </a>
          <h1>Studio sign in</h1>
          {error && (
            <p class="form-alert" role="alert">
              {error}
            </p>
          )}
          {ready ? (
            <form class="inquiry-form" method="post" action="/admin/login">
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  required
                  autocomplete="username"
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  maxlength={200}
                  autocomplete="current-password"
                />
              </label>
              <button class="button button-orange" type="submit">
                Sign in <Arrow />
              </button>
            </form>
          ) : (
            <p>
              Local administrator setup is required. Run the documented admin
              setup command, then restart the development server. Production
              access uses an invited Cloudflare Access identity.
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
export function Editor({
  resource,
  keyName,
  record,
  csrf,
  media,
  services,
  selectedServices,
  error,
}: {
  resource: Resource;
  keyName: string;
  record: Record<string, unknown>;
  csrf: string;
  media: { id: string; alt_text: string }[];
  services: { id: string; title: string }[];
  selectedServices: string[];
  error?: string;
}) {
  const id = String(record.id || "new");
  return (
    <>
      <a class="text-link" href={`/admin/content/${keyName}`}>
        ← Back to {resource.title.toLowerCase()}
      </a>
      {error && (
        <p class="form-alert" role="alert">
          {error}
        </p>
      )}
      <form
        class="admin-form"
        method="post"
        action={`/admin/content/${keyName}/${id}`}
      >
        <input type="hidden" name="_csrf" value={csrf} />
        <input
          type="hidden"
          name="_revision"
          value={String(record.revision || 0)}
        />
        {resource.fields.map((field) => {
          if (field.type === "gallery") {
            const selected = JSON.parse(
              String(record[field.name] || "[]"),
            ) as string[];
            return (
              <fieldset key={field.name}>
                <legend>{field.label}</legend>
                <p>Select uploaded images for this case study.</p>
                <div class="gallery-picker">
                  {media.map((asset) => (
                    <label class="checkbox-label" key={asset.id}>
                      <input
                        type="checkbox"
                        name={`gallery_${asset.id}`}
                        value="1"
                        checked={selected.includes(asset.id)}
                      />
                      <img src={`/media/${asset.id}`} alt="" loading="lazy" />
                      {asset.alt_text}
                    </label>
                  ))}
                </div>
                {!media.length && (
                  <a href="/admin/media" class="text-link">
                    Upload your first image in the media library →
                  </a>
                )}
              </fieldset>
            );
          }
          const value = fieldValue(field, record[field.name]);
          return (
            <label
              key={field.name}
              for={`field-${field.name}`}
              class={field.type === "checkbox" ? "checkbox-label" : ""}
            >
              {field.type === "checkbox" ? (
                <>
                  <input
                    type="checkbox"
                    id={`field-${field.name}`}
                    name={field.name}
                    value="1"
                    checked={value === "1"}
                  />
                  <span>{field.label}</span>
                </>
              ) : (
                <>
                  <span>
                    {field.label}
                    {field.required ? " *" : ""}
                  </span>
                  {field.type === "select" ? (
                    <select id={`field-${field.name}`} name={field.name}>
                      {field.options?.map((option) => (
                        <option key={option} selected={value === option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "media" ? (
                    <select id={`field-${field.name}`} name={field.name}>
                      <option value="">No image</option>
                      {media.map((asset) => (
                        <option
                          key={asset.id}
                          value={asset.id}
                          selected={value === asset.id}
                        >
                          {asset.alt_text}
                        </option>
                      ))}
                    </select>
                  ) : ["textarea", "lines", "tags", "blocks"].includes(
                      field.type || "",
                    ) ? (
                    <textarea
                      id={`field-${field.name}`}
                      name={field.name}
                      rows={
                        field.name === "blocks_json" || field.name === "content"
                          ? 9
                          : 4
                      }
                      required={field.required}
                      maxlength={field.max || 16000}
                    >
                      {value}
                    </textarea>
                  ) : (
                    <input
                      id={`field-${field.name}`}
                      name={field.name}
                      value={value}
                      type={field.type === "number" ? "number" : "text"}
                      required={field.required}
                      min={
                        field.name === "price_minor"
                          ? (field.min || 0) / 100
                          : field.min
                      }
                      step={field.name === "price_minor" ? "0.01" : undefined}
                      maxlength={field.max || 1000}
                    />
                  )}{" "}
                  {field.hint && <small>{field.hint}</small>}
                </>
              )}
            </label>
          );
        })}
        {keyName === "projects" && (
          <fieldset>
            <legend>Show in these service showcases</legend>
            {services.map((service) => (
              <label class="checkbox-label" key={service.id}>
                <input
                  type="checkbox"
                  name={`service_${service.id}`}
                  value="1"
                  checked={selectedServices.includes(service.id)}
                />
                {service.title}
              </label>
            ))}
          </fieldset>
        )}
        <div class="admin-actions">
          <button class="button button-orange" type="submit">
            Save {resource.singular.toLowerCase()}
          </button>
          {id !== "new" &&
            ["projects", "services", "pages", "posts"].includes(keyName) && (
              <a
                class="button button-outline"
                target="_blank"
                rel="noopener"
                href={`/admin/content/${keyName}/${id}/preview`}
              >
                Preview
              </a>
            )}
        </div>
      </form>
      {id !== "new" && (
        <form
          class="archive-form"
          method="post"
          action={`/admin/content/${keyName}/${id}/archive`}
        >
          <input type="hidden" name="_csrf" value={csrf} />
          <input
            type="hidden"
            name="_revision"
            value={String(record.revision || 0)}
          />
          <button class="danger-button" type="submit">
            Archive {resource.singular.toLowerCase()}
          </button>
          <p>
            Archived items disappear from public pages. Existing records and
            references are preserved.
          </p>
        </form>
      )}
    </>
  );
}
