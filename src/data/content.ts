import type {
  Bindings,
  Faq,
  Package,
  Project,
  Service,
  SiteContent,
  Social,
} from "../types";

export async function loadContent(db: Bindings["DB"]): Promise<SiteContent> {
  const result = await db.batch([
    db.prepare("SELECT key, value FROM settings"),
    db.prepare(
      "SELECT * FROM services WHERE status = 'published' AND archived_at IS NULL ORDER BY sort_order, id",
    ),
    db.prepare(
      "SELECT * FROM projects WHERE status = 'published' AND archived_at IS NULL AND featured = 1 ORDER BY sort_order, id LIMIT 4",
    ),
    db.prepare(
      "SELECT * FROM packages WHERE status = 'published' AND archived_at IS NULL ORDER BY sort_order, id",
    ),
    db.prepare(
      "SELECT * FROM faqs WHERE status = 'published' AND archived_at IS NULL ORDER BY sort_order, id",
    ),
    db.prepare(
      "SELECT * FROM social_links WHERE enabled = 1 AND archived_at IS NULL ORDER BY sort_order, id",
    ),
    db.prepare(
      "SELECT id,name,company,quote,media_id FROM testimonials WHERE status='published' AND archived_at IS NULL ORDER BY sort_order,id LIMIT 20",
    ),
  ]);
  return {
    settings: Object.fromEntries(
      (result[0].results as { key: string; value: string }[]).map((row) => [
        row.key,
        row.value,
      ]),
    ),
    services: result[1].results as Service[],
    projects: result[2].results as Project[],
    packages: result[3].results as Package[],
    faqs: result[4].results as Faq[],
    socials: result[5].results as Social[],
    testimonials: result[6].results as SiteContent["testimonials"],
  };
}

export function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
