import { z } from "zod";
import { parseMoney } from "../payments/money";

export type Field = {
  name: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "number"
    | "select"
    | "checkbox"
    | "lines"
    | "tags"
    | "blocks"
    | "media"
    | "gallery";
  required?: boolean;
  options?: string[];
  max?: number;
  min?: number;
  hint?: string;
};
export type Resource = { title: string; singular: string; fields: Field[] };
const title: Field = {
  name: "title",
  label: "Title",
  required: true,
  max: 160,
};
const slug: Field = {
  name: "slug",
  label: "URL slug",
  required: true,
  max: 90,
  hint: "Lowercase words separated by hyphens.",
};
const status: Field = {
  name: "status",
  label: "Publication",
  type: "select",
  options: ["draft", "published", "disabled"],
};
const order: Field = {
  name: "sort_order",
  label: "Display order",
  type: "number",
  min: 0,
};
const seo: Field[] = [
  { name: "seo_title", label: "SEO title", max: 160 },
  {
    name: "seo_description",
    label: "SEO description",
    type: "textarea",
    max: 320,
  },
];
const text = (name: string, label: string, required = false): Field => ({
  name,
  label,
  type: "textarea",
  required,
  max: 16000,
});

export const resources: Record<string, Resource> = {
  services: {
    title: "Services",
    singular: "Service",
    fields: [
      title,
      slug,
      {
        name: "short_description",
        label: "Short description",
        required: true,
        max: 600,
      },
      text("content", "Service content", true),
      {
        name: "icon",
        label: "Icon",
        type: "select",
        options: ["brand", "web", "growth"],
      },
      { name: "media_id", label: "Service image", type: "media" },
      {
        name: "price_minor",
        label: "Price (optional)",
        type: "number",
        min: 0,
        hint: "Enter the price in the selected currency. Leave blank for quoted work.",
      },
      {
        name: "currency",
        label: "Currency",
        type: "select",
        options: ["PKR", "USD"],
      },
      { name: "cta_label", label: "Button label", max: 80 },
      ...seo,
      status,
      order,
    ],
  },
  projects: {
    title: "Showcase",
    singular: "Project",
    fields: [
      title,
      slug,
      { name: "client", label: "Client (leave blank for concepts)", max: 160 },
      { name: "industry", label: "Industry", max: 120 },
      { name: "category", label: "Category", required: true, max: 160 },
      text("summary", "Summary", true),
      text("problem", "Problem", true),
      text("solution", "Solution", true),
      text("results", "Results / honest outcome", true),
      { name: "technologies_json", label: "Technologies", type: "tags" },
      {
        name: "media_json",
        label: "Gallery images",
        type: "gallery",
        hint: "Select up to 40 uploaded images.",
      },
      { name: "cover_media_id", label: "Cover image", type: "media" },
      { name: "external_url", label: "Live project URL (HTTPS)", max: 1000 },
      text("testimonial", "Project testimonial"),
      {
        name: "is_concept",
        label: "Studio concept (not a commissioned client project)",
        type: "checkbox",
      },
      {
        name: "art",
        label: "Concept artwork",
        type: "select",
        options: ["commerce", "identity", "platform", "editorial"],
      },
      { name: "featured", label: "Featured on homepage", type: "checkbox" },
      ...seo,
      status,
      order,
    ],
  },
  packages: {
    title: "Packages",
    singular: "Package",
    fields: [
      title,
      text("description", "Description", true),
      {
        name: "price_minor",
        label: "Price (optional)",
        type: "number",
        min: 1,
        hint: "Enter the price in the selected currency. Leave blank for a custom quote.",
      },
      {
        name: "currency",
        label: "Currency",
        type: "select",
        options: ["PKR", "USD"],
      },
      {
        name: "features_json",
        label: "Features",
        type: "lines",
        hint: "One feature per line.",
      },
      { name: "recommended", label: "Recommended package", type: "checkbox" },
      {
        name: "payment_mode",
        label: "Next step",
        type: "select",
        options: ["inquiry", "invoice"],
      },
      { name: "cta_label", label: "Button label", max: 80 },
      status,
      order,
    ],
  },
  faqs: {
    title: "FAQs",
    singular: "FAQ",
    fields: [
      { name: "question", label: "Question", required: true, max: 500 },
      text("answer", "Answer", true),
      status,
      order,
    ],
  },
  testimonials: {
    title: "Testimonials",
    singular: "Testimonial",
    fields: [
      { name: "name", label: "Client name", required: true, max: 100 },
      { name: "company", label: "Company", max: 160 },
      text("quote", "Quote", true),
      { name: "media_id", label: "Client photo", type: "media" },
      text("consent_record", "Permission / source record", true),
      status,
      order,
    ],
  },
  social_links: {
    title: "Social profiles",
    singular: "Social profile",
    fields: [
      { name: "platform", label: "Platform", required: true, max: 60 },
      { name: "handle", label: "Handle", max: 100 },
      { name: "url", label: "Profile URL (HTTPS)", required: true, max: 1000 },
      {
        name: "icon",
        label: "Icon",
        type: "select",
        options: [
          "instagram",
          "facebook",
          "linkedin",
          "youtube",
          "x",
          "tiktok",
          "link",
        ],
      },
      { name: "enabled", label: "Visible on website", type: "checkbox" },
      order,
    ],
  },
  pages: {
    title: "Pages",
    singular: "Page",
    fields: [
      title,
      slug,
      {
        name: "blocks_json",
        label: "Page content",
        type: "blocks",
        hint: "Separate paragraphs with a blank line.",
      },
      { name: "og_media_id", label: "Social sharing image", type: "media" },
      ...seo,
      status,
      order,
    ],
  },
  posts: {
    title: "Insights",
    singular: "Post",
    fields: [
      title,
      slug,
      { name: "excerpt", label: "Excerpt", required: true, max: 600 },
      text("content", "Article", true),
      ...seo,
      status,
    ],
  },
};

export function fieldValue(field: Field, value: unknown): string {
  if (field.name === "price_minor" && value !== null && value !== undefined)
    return (Number(value) / 100).toFixed(2);
  if (field.type === "blocks") {
    try {
      return (JSON.parse(String(value || "[]")) as { text?: string }[])
        .map((block) => block.text || "")
        .join("\n\n");
    } catch {
      return "";
    }
  }
  if (field.type === "lines" || field.type === "tags") {
    try {
      return (JSON.parse(String(value || "[]")) as string[]).join(
        field.type === "tags" ? ", " : "\n",
      );
    } catch {
      return "";
    }
  }
  return value === null || value === undefined ? "" : String(value);
}
export function parseRecord(
  resource: Resource,
  values: Record<string, unknown>,
): Record<string, string | number | null> {
  const output: Record<string, string | number | null> = {};
  for (const field of resource.fields) {
    if (field.type === "gallery") {
      const ids = Object.keys(values)
        .filter((key) => key.startsWith("gallery_") && values[key] === "1")
        .map((key) => key.slice(8));
      if (ids.length > 40 || ids.some((id) => id.length > 80))
        throw new Error("Choose no more than 40 gallery images.");
      output[field.name] = JSON.stringify(ids);
      continue;
    }
    const input = values[field.name];
    if (input !== undefined && typeof input !== "string")
      throw new Error(`${field.label}: invalid field format.`);
    const value = String(input || "").trim();
    if (field.type === "checkbox") {
      output[field.name] = value === "1" ? 1 : 0;
      continue;
    }
    if (field.type === "number") {
      if (!value && field.name === "price_minor") {
        output[field.name] = null;
        continue;
      }
      const number =
        field.name === "price_minor"
          ? parseMoney(value || "0")
          : Number(value || 0);
      if (
        !Number.isSafeInteger(number) ||
        number < (field.min || 0) ||
        number > 1_000_000_000_000
      )
        throw new Error(`${field.label}: use a valid whole number.`);
      output[field.name] = number;
      continue;
    }
    if (field.type === "select") {
      if (!field.options?.includes(value))
        throw new Error(`${field.label}: choose an available option.`);
      output[field.name] = value;
      continue;
    }
    if (value.length > (field.max || 16000) || (field.required && !value))
      throw new Error(`${field.label}: required or too long.`);
    if (field.name === "slug" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))
      throw new Error("Use a lowercase slug with hyphens.");
    if ((field.name === "url" || field.name === "external_url") && value) {
      const url = z.url().safeParse(value);
      if (
        !url.success ||
        !value.startsWith("https://") ||
        new URL(value).username ||
        new URL(value).password
      )
        throw new Error(
          `${field.label}: use an HTTPS URL without credentials.`,
        );
    }
    if (field.type === "lines" || field.type === "tags") {
      const entries = value
        .split(field.type === "tags" ? "," : "\n")
        .map((v) => v.trim())
        .filter(Boolean);
      if (entries.length > 40 || entries.some((v) => v.length > 300))
        throw new Error(`${field.label}: too many or overly long items.`);
      output[field.name] = JSON.stringify(entries);
      continue;
    }
    if (field.type === "blocks") {
      output[field.name] = JSON.stringify(
        value
          .split(/\n\s*\n/)
          .filter(Boolean)
          .map((text) => ({ type: "paragraph", text })),
      );
      continue;
    }
    output[field.name] = field.type === "media" ? value || null : value;
  }
  return output;
}
