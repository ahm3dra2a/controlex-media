export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  ENVIRONMENT: "local" | "production";
  SITE_URL: string;
  ALLOW_LOCAL_INQUIRIES?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
};

export type Service = {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  content: string;
  icon: string;
  sort_order: number;
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
};
