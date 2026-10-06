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

export function Mark() {
  return (
    <svg
      width="35"
      height="35"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="8" fill="#FF451D" />
      <path
        d="M28 12H18a8 8 0 0 0 0 16h10M24 18h-7m7 4h-7"
        stroke="white"
        stroke-width="3.5"
        stroke-linecap="square"
      />
    </svg>
  );
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
}: {
  content: SiteContent;
  title: string;
  description: string;
  path?: string;
  siteUrl: string;
  children: Child;
  noindex?: boolean;
  turnstile?: boolean;
}) {
  const canonical = new URL(path, siteUrl).href;
  const settings = content.settings;
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
        <meta property="og:image" content={new URL("/og.png", siteUrl).href} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={new URL("/og.png", siteUrl).href} />
        {noindex && <meta name="robots" content="noindex,nofollow" />}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="stylesheet" href="/site.css" />
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
            <a
              class="brand"
              href="/"
              aria-label={`${settings.brand_name} home`}
            >
              <Mark />
              <span>
                controlex<span class="brand-small">media</span>
              </span>
            </a>
            <nav class="desktop-nav" aria-label="Main navigation">
              <a href="/#work">Our work</a>
              <a href="/#services">What we do</a>
              <a href="/#about">The studio</a>
              <a class="nav-cta" href="/contact">
                Let’s talk <Arrow diagonal />
              </a>
            </nav>
            <details class="mobile-menu">
              <summary>
                Menu <span aria-hidden="true">+</span>
              </summary>
              <nav aria-label="Mobile navigation">
                <a href="/#work">Our work</a>
                <a href="/#services">What we do</a>
                <a href="/#about">The studio</a>
                <a href="/contact">Let’s talk ↗</a>
              </nav>
            </details>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer class="footer">
          <div class="wrap">
            <div class="footer-top">
              <a class="brand" href="/">
                <Mark />
                <span>
                  controlex<span class="brand-small">media</span>
                </span>
              </a>
              <p>{settings.location}</p>
            </div>
            <div class="footer-bottom">
              <p>
                © {new Date().getFullYear()} {settings.brand_name}
              </p>
              <div class="footer-links">
                <a href="/privacy">Privacy</a>
                <a href="/terms">Terms</a>
                {content.socials.map((social) => {
                  const url = safeExternalUrl(social.url);
                  return url ? (
                    <a
                      key={social.id}
                      href={url}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
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
  return (
    <div class={`project-art art-${project.art}`} aria-hidden="true">
      {project.art === "commerce" ? (
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
