export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  ENVIRONMENT: "local" | "production";
  SITE_URL: string;
  ALLOW_LOCAL_INQUIRIES?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  LOCAL_ADMIN_EMAIL?: string;
  LOCAL_ADMIN_PASSWORD_HASH?: string;
  LOCAL_SESSION_SECRET?: string;
  MEDIA?: R2Bucket;
};

export type Service = {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  content: string;
  icon: string;
  sort_order: number;
  media_id?: string | null;
  price_minor?: number | null;
  currency?: string;
  cta_label?: string;
  seo_title: string | null;
  seo_description: string | null;
};
export type Project = {
  id: string;
  title: string;
  slug: string;
  category: string;
  summary: string;
  problem: string;
  solution: string;
  results: string;
  is_concept: number;
  art: string;
  cover_media_id?: string | null;
  media_json: string;
  services?: string[];
  seo_title?: string | null;
  seo_description?: string | null;
  client?: string;
  industry?: string;
  technologies_json?: string;
  external_url?: string;
  testimonial?: string;
};
export type Package = {
  id: string;
  title: string;
  description: string;
  price_minor: number | null;
  currency: string;
  features_json: string;
  recommended: number;
  payment_mode: string;
  cta_label?: string;
};
export type Faq = { id: string; question: string; answer: string };
export type Social = {
  id: string;
  platform: string;
  url: string;
  icon: string;
};
export type SiteContent = {
  settings: Record<string, string>;
  services: Service[];
  projects: Project[];
  packages: Package[];
  faqs: Faq[];
  socials: Social[];
  testimonials: {
    id: string;
    name: string;
    company: string;
    quote: string;
    media_id: string | null;
  }[];
};
