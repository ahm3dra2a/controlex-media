import type { SiteContent } from "../types";
import {
  Arrow,
  Asterisk,
  ContactBanner,
  ProjectArt,
  SectionLabel,
} from "./components";

export function Home({ content }: { content: SiteContent }) {
  const s = content.settings;
  const process = JSON.parse(s.process_json) as {
    title: string;
    body: string;
  }[];
  return (
    <>
      <section class="hero">
        <div class="wrap">
          <div class="hero-topline">
            <p class="eyebrow">
              <span class="signal" />
              {s.hero_eyebrow}
            </p>
            <span class="hero-index">Independent creative studio / PK</span>
          </div>
          <div class="hero-grid">
            <div class="hero-copy">
              <h1>
                {s.hero_line_one}
                <br />
                {s.hero_line_two}
                <br />
                <span>{s.hero_line_three}</span>
              </h1>
              <p>{s.hero_description}</p>
              <a class="button button-orange" href="/contact">
                Let’s build something <Arrow diagonal />
              </a>
            </div>
            <div class="hero-art" aria-hidden="true">
              <div class="art-coordinate">CM — FUTURE IN MOTION</div>
              <div class="orbit orbit-one" />
              <div class="orbit orbit-two" />
              <div class="orbit orbit-three" />
              <div class="orbit-core" />
              <div class="hero-art-cross">+</div>
              <div class="art-bottom">
                <span>
                  Strategy × Creativity
                  <br />× Technology
                </span>
                <span class="art-star">
                  <Asterisk />
                </span>
              </div>
            </div>
          </div>
          <div class="hero-foot">
            <span>From a first impression to your next milestone.</span>
            <a href="#work">
              Explore our thinking <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
      </section>
      <div class="discipline-strip" aria-hidden="true">
        <div>
          BRAND STRATEGY{" "}
          <span>
            <Asterisk />
          </span>{" "}
          DIGITAL EXPERIENCES{" "}
          <span>
            <Asterisk />
          </span>{" "}
          CREATIVE TECHNOLOGY{" "}
          <span>
            <Asterisk />
          </span>{" "}
          NEXT MOVES{" "}
          <span>
            <Asterisk />
          </span>
        </div>
      </div>
      <section class="section work-section" id="work">
        <div class="wrap">
          <SectionLabel number="01">A glimpse of our thinking</SectionLabel>
          <div class="section-heading">
            <h2>
              Ideas with
              <br />
              <em>somewhere to go.</em>
            </h2>
            <p>
              Different challenges. Connected thinking.
              <br />
              Explore our original studio concepts.
            </p>
          </div>
          <div class="project-grid">
            {content.projects.map((project) => (
              <a
                class="project-card"
                key={project.id}
                href={`/work/${project.slug}`}
              >
                <ProjectArt project={project} />
                <div class="project-meta">
                  <div>
                    <p class="project-category">
                      {project.category} ·{" "}
                      {project.is_concept ? "Studio concept" : "Client project"}
                    </p>
                    <h3>{project.title}</h3>
                  </div>
                  <span class="project-link">
                    <Arrow diagonal />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
      <section class="section services-section" id="services">
        <div class="wrap">
          <SectionLabel number="02">What we bring to the table</SectionLabel>
          <div class="section-heading">
            <h2>
              Built to stand out.
              <br />
              <em>Designed to connect.</em>
            </h2>
            <p>
              We join the dots between where your
              <br />
              business is and where it could be.
            </p>
          </div>
          <div class="services-list">
            {content.services.map((service, i) => (
              <a
                class="service-row"
                href={`/services/${service.slug}`}
                key={service.id}
              >
                <span class="service-number">0{i + 1}</span>
                <h3>{service.title}</h3>
                <p>{service.short_description}</p>
                <span class="service-arrow">
                  <Arrow diagonal />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
      <section class="section about-section" id="about">
        <div class="wrap about-grid">
          <div class="about-art" aria-hidden="true">
            <span class="about-art-top">
              THINK CLEAR.
              <br />
              MAKE BOLD.
            </span>
            <div class="about-symbol">
              c<span>m</span>
            </div>
            <span class="about-art-bottom">
              ONE TEAM. CONNECTED THINKING. ↗
            </span>
          </div>
          <div class="about-copy">
            <SectionLabel number="03">A little about us</SectionLabel>
            <h2>{s.about_heading}</h2>
            <p>{s.about_body}</p>
            <div class="principles">
              <span>Curiosity first.</span>
              <span>Clarity always.</span>
              <span>Craft in every detail.</span>
            </div>
            <a class="text-link" href="/contact">
              Meet your next creative partner <Arrow diagonal />
            </a>
          </div>
        </div>
      </section>
      <section class="section process-section" id="process">
        <div class="wrap">
          <SectionLabel number="04">From the first conversation</SectionLabel>
          <div class="section-heading">
            <h2>
              Big thinking.
              <br />
              <em>Clear next steps.</em>
            </h2>
            <p>
              A shared direction, an open conversation,
              <br />
              and a little momentum at every stage.
            </p>
          </div>
          <ol class="process-grid">
            {process.map((step, i) => (
              <li key={step.title}>
                <span class="process-number">
                  0{i + 1}
                  <span aria-hidden="true">
                    <Arrow diagonal />
                  </span>
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section class="section packages-section" id="packages">
        <div class="wrap">
          <SectionLabel number="05">Room for your next chapter</SectionLabel>
          <div class="section-heading">
            <h2>
              A starting point.
              <br />
              <em>Made yours.</em>
            </h2>
            <p>
              Every business has a different next move.
              <br />
              We scope and quote yours before we begin.
            </p>
          </div>
          <div class="packages-grid">
            {content.packages.map((pkg) => (
              <article
                class={`package-card ${pkg.recommended ? "recommended" : ""}`}
                key={pkg.id}
              >
                {pkg.recommended ? (
                  <span class="package-label">A connected approach</span>
                ) : (
                  <span class="package-label">Built around your brief</span>
                )}
                <h3>{pkg.title}</h3>
                <p>{pkg.description}</p>
                <div class="package-price">
                  {pkg.price_minor
                    ? new Intl.NumberFormat("en", {
                        style: "currency",
                        currency: pkg.currency,
                        maximumFractionDigits: 0,
                      }).format(pkg.price_minor / 100)
                    : "Let’s scope it together"}
                </div>
                <ul>
                  {(JSON.parse(pkg.features_json) as string[]).map(
                    (feature) => (
                      <li key={feature}>
                        <span aria-hidden="true">
                          <Arrow diagonal />
                        </span>
                        {feature}
                      </li>
                    ),
                  )}
                </ul>
                <a
                  class="button button-outline"
                  href={`/contact?package=${pkg.id}`}
                >
                  Discuss this package <Arrow diagonal />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section class="section faq-section">
        <div class="wrap faq-grid">
          <div>
            <SectionLabel number="06">A few useful answers</SectionLabel>
            <h2>
              Before you
              <br />
              <em>say hello.</em>
            </h2>
          </div>
          <div>
            {content.faqs.map((faq) => (
              <details class="faq" key={faq.id}>
                <summary>
                  {faq.question}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <ContactBanner content={content} />
    </>
  );
}
