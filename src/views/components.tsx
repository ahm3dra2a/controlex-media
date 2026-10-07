import { raw } from "hono/html";
import type { Child } from "hono/jsx";
import { safeExternalUrl } from "../data/content";
import type { Project, SiteContent } from "../types";

export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={diagonal ? "M5 19 19 5M5 5h14v14" : "M4 12h16m-6-6 6 6-6 6"}
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

export function Asterisk() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M12 2v20M2 12h20M5 5l14 14M5 19 19 5"
        stroke="currentColor"
        stroke-width="2.5"
      />
    </svg>
  );
}

export function Brand({ settings }: { settings: Record<string, string> }) {
  return (
    <a class="brand" href="/" aria-label={`${settings.brand_name} home`}>
      {settings.logo_media_id && (
        <img
          class="brand-logo"
          src={`/media/${settings.logo_media_id}`}
          alt=""
        />
      )}
      <span class="brand-wordmark">
        <span>{settings.brand_line_one || "controlex"}</span>
        <span>{settings.brand_line_two || "media"}</span>
      </span>
    </a>
  );
}
export function siteLinks(
  value: string | undefined,
  fallback: { label: string; url: string }[],
) {
  try {
    const parsed = JSON.parse(value || "null");
    return Array.isArray(parsed)
      ? (parsed.filter(
          (link: { label?: unknown; url?: unknown }) =>
            typeof link.label === "string" &&
            typeof link.url === "string" &&
            (/^\/(?!\/)/.test(link.url) || safeExternalUrl(link.url)),
        ) as { label: string; url: string }[])
      : fallback;
  } catch {
    return fallback;
  }
}

export function Layout({
  content,
  title,
  description,
  path = "/",
  siteUrl,
  children,
  noindex = false,
  turnstile = false,
  nonce,
  ogImage,
}: {
  content: SiteContent;
  title: string;
  description: string;
  path?: string;
  siteUrl: string;
  children: Child;
  noindex?: boolean;
  turnstile?: boolean;
  nonce?: string;
  ogImage?: string;
}) {
  const canonical = new URL(path, siteUrl).href;
  const settings = content.settings;
  const navigation = siteLinks(settings.navigation_json, [
    { label: "Showcase", url: "/work" },
    { label: "Services", url: "/#services" },
    { label: "Studio", url: "/#about" },
  ]);
  const footerLinks = siteLinks(settings.footer_links_json, [
    { label: "Privacy", url: "/privacy" },
    { label: "Terms", url: "/terms" },
  ]);
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="theme-color" content="#141412" />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta
          property="og:image"
          content={new URL(ogImage || "/og.png", siteUrl).href}
        />
        {!noindex && nonce && (
          <script type="application/ld+json" nonce={nonce}>
            {raw(
              JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Organization",
                name: settings.brand_name,
                url: siteUrl,
                ...(settings.logo_media_id
                  ? {
                      logo: new URL(`/media/${settings.logo_media_id}`, siteUrl)
                        .href,
                    }
                  : {}),
                sameAs: content.socials
                  .map((social) => safeExternalUrl(social.url))
                  .filter(Boolean),
              }).replaceAll("<", "\u003c"),
            )}
          </script>
        )}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta
          name="twitter:image"
          content={new URL(ogImage || "/og.png", siteUrl).href}
        />
        {noindex && <meta name="robots" content="noindex,nofollow" />}
        <link
          rel="icon"
          href={
            settings.logo_media_id
              ? `/media/${settings.logo_media_id}`
              : "/favicon.svg"
          }
        />
        <link rel="stylesheet" href="/site.css" />
        <link rel="stylesheet" href="/theme.css" />
        <script src="/site.js" defer />
        {turnstile && (
          <script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            async
            defer
          />
        )}
      </head>
      <body>
        <a class="skip-link" href="#main">
          Skip to content
        </a>
        <header class="header">
          <div class="wrap header-inner">
            <Brand settings={settings} />
            <nav class="desktop-nav" aria-label="Main navigation">
              {navigation.map((link) => (
                <a key={link.url} href={link.url}>
                  {link.label}
                </a>
              ))}
              <a class="nav-cta" href="/contact">
                Let’s talk <Arrow diagonal />
              </a>
            </nav>
            <details class="mobile-menu">
              <summary>
                Menu <span aria-hidden="true">+</span>
              </summary>
              <nav aria-label="Mobile navigation">
                {navigation.map((link) => (
                  <a key={link.url} href={link.url}>
                    {link.label}
                  </a>
                ))}
                <a href="/contact">Let’s talk ↗</a>
              </nav>
            </details>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer class="footer">
          <div class="wrap">
            <div class="footer-top">
              <Brand settings={settings} />
              <p>{settings.location}</p>
            </div>
            <div class="footer-bottom">
              <p>
                © {new Date().getFullYear()} {settings.brand_name}
              </p>
              <div class="footer-links">
                {footerLinks.map((link) => (
                  <a key={link.url} href={link.url}>
                    {link.label}
                  </a>
                ))}
                {content.socials.map((social) => {
                  const url = safeExternalUrl(social.url);
                  return url ? (
                    <a
                      key={social.id}
                      href={url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <SocialIcon name={social.icon} />
                      {social.platform} ↗
                    </a>
                  ) : null;
                })}
              </div>
              <a href="#main">Back to top ↑</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

export function SocialIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    instagram:
      "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M17 7h.01",
    facebook: "M14 21v-8h3l1-4h-4V7c0-1 1-2 2-2h2V2h-3c-3 0-5 2-5 5v2H7v4h3v8",
    linkedin: "M4 9v12M4 4v.01M10 21V9M10 14a5 5 0 0 1 10 0v7",
    youtube:
      "M9 8v8l7-4-7-4M5 4h14a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3",
    x: "M4 3l16 18M20 3L4 21",
    tiktok: "M14 3v13a4 4 0 1 1-4-4M14 3c0 4 3 6 6 6",
    link: "M10 13l4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M16 8l1-1a4 4 0 1 1 6 6l-4 4a4 4 0 0 1-6 0",
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={paths[name] || paths.link}
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

export function SectionLabel({
  number,
  children,
}: {
  number: string;
  children: Child;
}) {
  return (
    <p class="section-label">
      <span>{number} /</span> {children}
    </p>
  );
}

export function ProjectArt({ project }: { project: Project }) {
  if (project.cover_media_id)
    return (
      <div class="project-art uploaded-art">
        <img
          src={`/media/${project.cover_media_id}`}
          alt={project.title}
          loading="lazy"
        />
      </div>
    );
  return (
    <div class={`project-art art-${project.art}`} aria-hidden="true">
      {project.art === "platform" ? (
        <div class="platform-sheet">
          <span class="eyebrow">A connected experience</span>
          <h3>
            Clarity.
            <br />
            At every step.
          </h3>
          <div class="platform-panels">
            <span>Discover ↗</span>
            <span>Explore ↗</span>
            <span>Connect ↗</span>
          </div>
          <div class="platform-line" />
          <p>Designed around people.</p>
        </div>
      ) : project.art === "editorial" ? (
        <div class="editorial-sheet">
          <p class="eyebrow">Ideas that move people.</p>
          <h3>
            Make
            <br />
            <em>space.</em>
          </h3>
          <div class="editorial-orbit" />
          <p class="art-caption">Original thinking. A clear direction.</p>
        </div>
      ) : project.art === "commerce" ? (
        <>
          <div class="shop-sheet">
            <div class="shop-top">
              <span>Objects for everyday.</span>
              <span>Collection — 01</span>
            </div>
            <div class="shop-title">
              Less.
              <br />
              But better.
            </div>
            <div class="sculpture">
              <span />
              <span />
              <span />
            </div>
            <div class="shop-bottom">
              Considered objects. Intentional living.
              <span>Explore the collection ↗</span>
            </div>
          </div>
          <div class="art-caption">Digital experience / Studio exploration</div>
        </>
      ) : (
        <>
          <div class="identity-grid" />
          <div class="identity-word">
            NEXT
            <br />
            <span>FORM.</span>
          </div>
          <div class="identity-symbol">
            <span />
            <span />
            <span />
          </div>
          <div class="art-caption">A new perspective, by design. ↗</div>
        </>
      )}
    </div>
  );
}

export function ContactBanner({ content }: { content: SiteContent }) {
  return (
    <section class="contact-banner" id="contact">
      <div class="wrap">
        <p class="eyebrow">Your next chapter starts here</p>
        <div class="contact-banner-row">
          <h2>{content.settings.contact_heading}</h2>
          <a
            class="round-cta"
            href="/contact"
            aria-label="Start a project inquiry"
          >
            <Arrow diagonal />
          </a>
        </div>
        <p>{content.settings.contact_body}</p>
      </div>
    </section>
  );
}
