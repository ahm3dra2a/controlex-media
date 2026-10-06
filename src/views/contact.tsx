import type { SiteContent } from "../types";
import { Arrow } from "./components";

export function Contact({
  content,
  siteKey,
  error,
  values = {},
  ready = true,
}: {
  content: SiteContent;
  siteKey?: string;
  error?: string;
  values?: Record<string, string>;
  ready?: boolean;
}) {
  return (
    <section class="section contact-page">
      <div class="wrap contact-grid">
        <div>
          <p class="eyebrow">A conversation, not a commitment</p>
          <h1>
            Tell us about
            <br />
            your <em>next move.</em>
          </h1>
          <p class="contact-intro">{content.settings.contact_body}</p>
          <p class="contact-location">{content.settings.location}</p>
          <p class="small-note">
            No payment is collected here. We’ll agree the scope, timing, and
            price with you first.
          </p>
        </div>
        <div>
          {error && (
            <div class="form-alert" role="alert">
              {error}
            </div>
          )}
          {!ready ? (
            <div class="form-alert">
              Project inquiries are temporarily unavailable. Please check back
              soon.
            </div>
          ) : (
            <form method="post" action="/api/inquiries" class="inquiry-form">
              <div class="field-grid">
                <label>
                  Your name <span>*</span>
                  <input
                    name="name"
                    autocomplete="name"
                    required
                    minlength={2}
                    maxlength={100}
                    value={values.name || ""}
                  />
                </label>
                <label>
                  Email address <span>*</span>
                  <input
                    type="email"
                    name="email"
                    autocomplete="email"
                    required
                    maxlength={254}
                    value={values.email || ""}
                  />
                </label>
              </div>
              <label>
                Company <span class="optional">(optional)</span>
                <input
                  name="company"
                  autocomplete="organization"
                  maxlength={160}
                  value={values.company || ""}
                />
              </label>
              <div class="field-grid">
                <label>
                  What can we help with? <span>*</span>
                  <select name="service" required>
                    <option value="">Choose a service</option>
                    {content.services.map((service) => (
                      <option
                        key={service.id}
                        value={service.id}
                        selected={values.service === service.id}
                      >
                        {service.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Budget direction <span>*</span>
                  <select name="budget" required>
                    {[
                      "Not sure yet",
                      "Under PKR 100,000",
                      "PKR 100,000–300,000",
                      "PKR 300,000+",
                      "USD project",
                    ].map((budget) => (
                      <option key={budget} selected={values.budget === budget}>
                        {budget}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                A little about your project <span>*</span>
                <textarea
                  name="message"
                  required
                  minlength={30}
                  maxlength={4000}
                  rows={6}
                  placeholder="What are you working on? What would a good outcome look like?"
                >
                  {values.message || ""}
                </textarea>
              </label>
              <div class="honeypot" aria-hidden="true">
                <label>
                  Website
                  <input name="website" tabindex={-1} autocomplete="off" />
                </label>
              </div>
              <label class="checkbox-label">
                <input type="checkbox" name="consent" value="yes" required />
                <span>
                  I agree to the <a href="/privacy">privacy notice</a> and
                  consent to being contacted about this inquiry.
                </span>
              </label>
              {siteKey && (
                <div
                  class="cf-turnstile"
                  data-sitekey={siteKey}
                  data-action="inquiry"
                  data-theme="light"
                />
              )}
              <button class="button button-orange" type="submit">
                Send your project inquiry <Arrow diagonal />
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export function ThankYou() {
  return (
    <section class="section wrap simple-page">
      <p class="eyebrow">The first step is in</p>
      <h1>
        A good place
        <br />
        to <em>begin.</em>
      </h1>
      <p>
        Thanks for telling us about your project. Your inquiry has been saved
        for the studio to review.
      </p>
      <a class="button button-orange" href="/">
        Back to the studio <Arrow />
      </a>
    </section>
  );
}
