import { Hono } from "hono";
import { z } from "zod";
import { parseMoney } from "../payments/money";
import type { AdminEnv } from "../security/admin";
import { validCsrf } from "../security/admin";
import { AdminLayout } from "./views";

export const businessRoutes = new Hono<AdminEnv>();
businessRoutes.get("/leads", async (c) => {
  const leads = await c.env.DB.prepare(
    "SELECT leads.*,services.title AS service_title FROM leads JOIN services ON services.id=leads.service_id WHERE leads.archived_at IS NULL ORDER BY leads.created_at DESC LIMIT 200",
  ).all<Record<string, string>>();
  return c.html(
    <AdminLayout
      user={c.get("user")}
      csrf={c.get("csrf")}
      title="Project inquiries"
    >
      <p class="admin-intro">
        Review the brief and update follow-up status. Email links open your own
        mail application.
      </p>
      <div class="lead-list">
        {leads.results.map((lead) => (
          <article class="admin-panel" key={lead.id}>
            <div class="admin-actions">
              <h2>{lead.name}</h2>
              <span class="status-chip">{lead.status}</span>
            </div>
            <p>
              <a href={`mailto:${encodeURIComponent(lead.email)}`}>
                {lead.email}
              </a>{" "}
              · {lead.company || "Independent business"}
            </p>
            <p>
              {lead.service_title} · {lead.budget} · {lead.created_at}
            </p>
            <p class="lead-message">{lead.message}</p>
            <form method="post" action={`/admin/leads/${lead.id}`}>
              <input type="hidden" name="_csrf" value={c.get("csrf")} />
              <label>
                Follow-up status
                <select name="status">
                  {["new", "contacted", "qualified", "closed", "spam"].map(
                    (status) => (
                      <option key={status} selected={status === lead.status}>
                        {status}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <button type="submit">Update inquiry</button>
            </form>
          </article>
        ))}
        {!leads.results.length && (
          <p class="admin-empty">Your project inquiries will appear here.</p>
        )}
      </div>
    </AdminLayout>,
  );
});
businessRoutes.post("/leads/:id", async (c) => {
  const body = await c.req.parseBody();
  if (!validCsrf(c, body)) return c.text("Request rejected.", 403);
  if (
    !["new", "contacted", "qualified", "closed", "spam"].includes(
      String(body.status),
    )
  )
    return c.text("Invalid status.", 400);
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE leads SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    ).bind(String(body.status), c.req.param("id")),
    c.env.DB.prepare(
      "INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id) SELECT ?,?,'status','leads',? WHERE changes()=1",
    ).bind(crypto.randomUUID(), c.get("user").id, c.req.param("id")),
  ]);
  return c.redirect("/admin/leads", 303);
});
for (const path of ["/orders", "/orders/*", "/users", "/users/*", "/audit"])
  businessRoutes.use(path, async (c, next) => {
    if (c.get("user").role !== "owner")
      return c.text("Owner access required.", 403);
    await next();
  });
businessRoutes.get("/orders", async (c) => {
  const orders = await c.env.DB.prepare(
    "SELECT * FROM orders WHERE archived_at IS NULL ORDER BY created_at DESC LIMIT 200",
  ).all<Record<string, string>>();
  const packages = await c.env.DB.prepare(
    "SELECT id,title FROM packages WHERE archived_at IS NULL ORDER BY sort_order",
  ).all<{ id: string; title: string }>();
  const claims = await c.env.DB.prepare(
    "SELECT payment_claims.* FROM payment_claims JOIN orders ON orders.id=payment_claims.order_id WHERE orders.status='awaiting_verification' ORDER BY created_at DESC LIMIT 200",
  ).all<Record<string, string>>();
  return c.html(
    <AdminLayout
      user={c.get("user")}
      csrf={c.get("csrf")}
      title="Orders & invoices"
    >
      <p class="admin-intro">
        Create an agreed quote as an invoice. PKR and USD are separate
        currencies. A customer reference is a claim, not proof of payment.
      </p>
      <form class="admin-form" method="post" action="/admin/orders">
        <input type="hidden" name="_csrf" value={c.get("csrf")} />
        <label>
          Package
          <select name="package_id" required>
            {packages.results.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Customer email
          <input name="customer_email" type="email" required maxlength={254} />
        </label>
        <label>
          Agreed invoice amount
          <input
            name="amount_minor"
            type="number"
            min="0.01"
            step="0.01"
            required
          />
          <small>
            Use the agreed amount in the selected currency. Do not use an
            estimated conversion.
          </small>
        </label>
        <label>
          Currency
          <select name="currency">
            <option>PKR</option>
            <option>USD</option>
          </select>
        </label>
        <label>
          Private studio note
          <textarea name="note" rows={3} maxlength={4000} />
        </label>
        <button class="button button-orange" type="submit">
          Create invoice
        </button>
      </form>
      <div class="lead-list">
        {orders.results.map((order) => (
          <article class="admin-panel" key={order.id}>
            <div class="admin-actions">
              <h2>{String(JSON.parse(order.package_snapshot_json).title)}</h2>
              <span class="status-chip">{order.status}</span>
            </div>
            <p>
              {order.customer_email} · {order.currency}{" "}
              {(Number(order.amount_minor) / 100).toFixed(2)}
            </p>
            <p>{order.note}</p>
            <a
              class="text-link"
              href={`/invoice/${order.invoice_token}`}
              target="_blank"
              rel="noopener"
            >
              Open private invoice link ↗
            </a>
            {claims.results
              .filter((claim) => claim.order_id === order.id)
              .map((claim) => (
                <p key={claim.id}>
                  Customer claim: {claim.provider} · {claim.reference}
                </p>
              ))}
            {["pending", "awaiting_verification"].includes(order.status) && (
              <form
                class="admin-form"
                method="post"
                action={`/admin/orders/${order.id}/verify`}
              >
                <input type="hidden" name="_csrf" value={c.get("csrf")} />
                <label>
                  Account / provider
                  <select name="provider">
                    {["bank", "easypaisa", "jazzcash", "payoneer"].map(
                      (provider) => (
                        <option key={provider}>{provider}</option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  Verified transaction reference
                  <input name="reference" required maxlength={200} />
                </label>
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    name="statement_verified"
                    value="yes"
                    required
                  />
                  I independently verified receipt and the exact amount/currency
                  in the business account statement.
                </label>
                <button type="submit">Record verified payment</button>
              </form>
            )}
            {["pending", "awaiting_verification"].includes(order.status) && (
              <form
                class="archive-form"
                method="post"
                action={`/admin/orders/${order.id}/cancel`}
              >
                <input type="hidden" name="_csrf" value={c.get("csrf")} />
                <button class="danger-button" type="submit">
                  Cancel unpaid invoice
                </button>
              </form>
            )}
            {order.status === "paid" && (
              <details>
                <summary>Record a verified full refund</summary>
                <form
                  class="admin-form"
                  method="post"
                  action={`/admin/orders/${order.id}/refund`}
                >
                  <input type="hidden" name="_csrf" value={c.get("csrf")} />
                  <label>
                    Refund transaction reference
                    <input name="reference" required maxlength={200} />
                  </label>
                  <label class="checkbox-label">
                    <input
                      type="checkbox"
                      name="statement_verified"
                      value="yes"
                      required
                    />
                    I verified the completed full refund in the business account
                    statement.
                  </label>
                  <button type="submit">Record verified refund</button>
                </form>
              </details>
            )}
          </article>
        ))}
      </div>
    </AdminLayout>,
  );
});
businessRoutes.post("/orders", async (c) => {
  const body = await c.req.parseBody();
  if (!validCsrf(c, body)) return c.text("Request rejected.", 403);
  let amount: number;
  try {
    amount = parseMoney(String(body.amount_minor || ""));
  } catch {
    return c.text("Enter a valid amount with at most two decimal places.", 400);
  }
  const currency = String(body.currency),
    email = String(body.customer_email || "");
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > 1_000_000_000_000 ||
    !["PKR", "USD"].includes(currency) ||
    !z.email().max(254).safeParse(email).success ||
    String(body.note || "").length > 4000
  )
    return c.text(
      "Use a valid agreed amount, currency and customer email.",
      400,
    );
  const pkg = await c.env.DB.prepare(
    "SELECT * FROM packages WHERE id=? AND archived_at IS NULL",
  )
    .bind(String(body.package_id))
    .first();
  if (!pkg) return c.text("Package is unavailable.", 400);
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
      v.toString(16).padStart(2, "0"),
    ).join(""),
    id = crypto.randomUUID();
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO orders(id,package_id,amount_minor,currency,package_snapshot_json,invoice_token,customer_email,note) VALUES(?,?,?,?,?,?,?,?)",
    ).bind(
      id,
      String(body.package_id),
      amount,
      currency,
      JSON.stringify(pkg),
      token,
      email,
      String(body.note || ""),
    ),
    c.env.DB.prepare(
      "INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id) VALUES(?,?,'create_invoice','orders',?)",
    ).bind(crypto.randomUUID(), c.get("user").id, id),
  ]);
  return c.redirect("/admin/orders", 303);
});
businessRoutes.post("/orders/:id/verify", async (c) => {
  const body = await c.req.parseBody();
  if (!validCsrf(c, body)) return c.text("Request rejected.", 403);
  const provider = String(body.provider),
    reference = String(body.reference || "").trim();
  if (
    body.statement_verified !== "yes" ||
    !["bank", "easypaisa", "jazzcash", "payoneer"].includes(provider) ||
    !reference ||
    reference.length > 200
  )
    return c.text(
      "An independently verified provider statement and transaction reference are required.",
      400,
    );
  const order = await c.env.DB.prepare(
    "SELECT * FROM orders WHERE id=? AND status IN ('pending','awaiting_verification')",
  )
    .bind(c.req.param("id"))
    .first<{ id: string; amount_minor: number; currency: string }>();
  if (!order) return c.text("Order already settled or unavailable.", 409);
  const duplicate = await c.env.DB.prepare(
    "SELECT id FROM payment_events WHERE provider=? AND event_id=?",
  )
    .bind(provider, reference)
    .first();
  if (duplicate)
    return c.text("This transaction reference has already been used.", 409);
  const marker = crypto.randomUUID();
  const result = await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO payment_events(id,provider,event_id,order_id,amount_minor,currency,status,verified_by) SELECT ?,?,?,?,?,?,'paid',? WHERE EXISTS(SELECT 1 FROM orders WHERE id=? AND status IN ('pending','awaiting_verification'))",
    ).bind(
      marker,
      provider,
      reference,
      order.id,
      order.amount_minor,
      order.currency,
      c.get("user").id,
      order.id,
    ),
    c.env.DB.prepare(
      "UPDATE orders SET status='paid',provider=?,provider_reference=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND EXISTS(SELECT 1 FROM payment_events WHERE id=?)",
    ).bind(provider, reference, order.id, marker),
    c.env.DB.prepare(
      "INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id) SELECT ?,?,'verify_payment','orders',? WHERE EXISTS(SELECT 1 FROM payment_events WHERE id=?)",
    ).bind(crypto.randomUUID(), c.get("user").id, order.id, marker),
  ]);
  if (!result[0].meta.changes)
    return c.text("Order changed concurrently. Reload before verifying.", 409);
  return c.redirect("/admin/orders", 303);
});
businessRoutes.get("/users", async (c) => {
  const users = await c.env.DB.prepare(
    "SELECT id,email,role,status FROM users ORDER BY created_at",
  ).all<{ id: string; email: string; role: string; status: string }>();
  return c.html(
    <AdminLayout
      user={c.get("user")}
      csrf={c.get("csrf")}
      title="Invited administrators"
    >
      <p class="admin-intro">
        Invite a known email address. Production sign-in also requires the
        matching Cloudflare Access policy. There is no public administrator
        registration.
      </p>
      <form class="admin-form" method="post" action="/admin/users">
        <input type="hidden" name="_csrf" value={c.get("csrf")} />
        <label>
          Email
          <input name="email" type="email" required />
        </label>
        <label>
          Role
          <select name="role">
            <option>editor</option>
            <option>owner</option>
          </select>
        </label>
        <button type="submit">Invite administrator</button>
      </form>
      {users.results.map((user) => (
        <form
          class="admin-panel"
          method="post"
          action={`/admin/users/${user.id}`}
          key={user.id}
        >
          <input type="hidden" name="_csrf" value={c.get("csrf")} />
          <strong>{user.email}</strong>
          <label>
            Role
            <select name="role">
              <option selected={user.role === "editor"}>editor</option>
              <option selected={user.role === "owner"}>owner</option>
            </select>
          </label>
          <label>
            Status
            <select name="status">
              {["invited", "active", "disabled"].map((status) => (
                <option key={status} selected={status === user.status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={user.id === c.get("user").id}>
            Save access
          </button>
        </form>
      ))}
    </AdminLayout>,
  );
});
businessRoutes.post("/users", async (c) => {
  const body = await c.req.parseBody();
  if (!validCsrf(c, body)) return c.text("Request rejected.", 403);
  const email = String(body.email || "")
      .trim()
      .toLowerCase(),
    role = String(body.role);
  if (
    !z.email().max(254).safeParse(email).success ||
    !["owner", "editor"].includes(role)
  )
    return c.text("Invalid invitation.", 400);
  if (
    await c.env.DB.prepare("SELECT id FROM users WHERE email=?")
      .bind(email)
      .first()
  )
    return c.text("This identity is already invited.", 409);
  const id = crypto.randomUUID();
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO users(id,email,role,status) VALUES(?,?,?,'invited')",
    ).bind(id, email, role),
    c.env.DB.prepare(
      "INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id) VALUES(?,?,'invite','users',?)",
    ).bind(crypto.randomUUID(), c.get("user").id, id),
  ]);
  return c.redirect("/admin/users", 303);
});
businessRoutes.post("/users/:id", async (c) => {
  const body = await c.req.parseBody();
  if (!validCsrf(c, body)) return c.text("Request rejected.", 403);
  if (c.req.param("id") === c.get("user").id)
    return c.text("You cannot change your own access here.", 409);
  if (
    !["owner", "editor"].includes(String(body.role)) ||
    !["invited", "active", "disabled"].includes(String(body.status))
  )
    return c.text("Invalid access state.", 400);
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE users SET role=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
    ).bind(String(body.role), String(body.status), c.req.param("id")),
    c.env.DB.prepare(
      "INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id) SELECT ?,?,'access','users',? WHERE changes()=1",
    ).bind(crypto.randomUUID(), c.get("user").id, c.req.param("id")),
  ]);
  return c.redirect("/admin/users", 303);
});
businessRoutes.get("/audit", async (c) => {
  const events = await c.env.DB.prepare(
    "SELECT audit_log.*,users.email FROM audit_log JOIN users ON users.id=audit_log.actor_id ORDER BY audit_log.created_at DESC LIMIT 200",
  ).all<Record<string, string>>();
  return c.html(
    <AdminLayout
      user={c.get("user")}
      csrf={c.get("csrf")}
      title="Activity history"
    >
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Administrator</th>
              <th>Action</th>
              <th>Content</th>
            </tr>
          </thead>
          <tbody>
            {events.results.map((event) => (
              <tr key={event.id}>
                <td>{event.created_at}</td>
                <td>{event.email}</td>
                <td>{event.action}</td>
                <td>
                  {event.entity_type} · {event.entity_id}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>,
  );
});

businessRoutes.post("/orders/:id/cancel", async (c) => {
  const body = await c.req.parseBody();
  if (!validCsrf(c, body)) return c.text("Request rejected.", 403);
  const result = await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE orders SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status IN ('pending','awaiting_verification')",
    ).bind(c.req.param("id")),
    c.env.DB.prepare(
      "INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id) SELECT ?,?,'cancel_invoice','orders',? WHERE changes()=1",
    ).bind(crypto.randomUUID(), c.get("user").id, c.req.param("id")),
  ]);
  if (!result[0].meta.changes)
    return c.text("Only an unpaid invoice can be cancelled.", 409);
  return c.redirect("/admin/orders", 303);
});
businessRoutes.post("/orders/:id/refund", async (c) => {
  const body = await c.req.parseBody();
  if (!validCsrf(c, body)) return c.text("Request rejected.", 403);
  const reference = String(body.reference || "").trim();
  if (
    body.statement_verified !== "yes" ||
    reference.length < 4 ||
    reference.length > 200
  )
    return c.text(
      "Verify the completed full refund and provide its reference.",
      400,
    );
  const order = await c.env.DB.prepare(
    "SELECT id,provider,amount_minor,currency FROM orders WHERE id=? AND status='paid'",
  )
    .bind(c.req.param("id"))
    .first<{
      id: string;
      provider: string;
      amount_minor: number;
      currency: string;
    }>();
  if (!order) return c.text("Only a paid invoice can be refunded.", 409);
  const duplicate = await c.env.DB.prepare(
    "SELECT id FROM payment_events WHERE provider=? AND event_id=?",
  )
    .bind(order.provider, reference)
    .first();
  if (duplicate)
    return c.text("This reference has already been recorded.", 409);
  const marker = crypto.randomUUID();
  const result = await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO payment_events(id,provider,event_id,order_id,amount_minor,currency,status,verified_by) SELECT ?,?,?,?,?,?,'refunded',? WHERE EXISTS(SELECT 1 FROM orders WHERE id=? AND status='paid')",
    ).bind(
      marker,
      order.provider,
      reference,
      order.id,
      order.amount_minor,
      order.currency,
      c.get("user").id,
      order.id,
    ),
    c.env.DB.prepare(
      "UPDATE orders SET status='refunded',updated_at=CURRENT_TIMESTAMP WHERE id=? AND EXISTS(SELECT 1 FROM payment_events WHERE id=?)",
    ).bind(order.id, marker),
    c.env.DB.prepare(
      "INSERT INTO audit_log(id,actor_id,action,entity_type,entity_id) SELECT ?,?,'verify_refund','orders',? WHERE EXISTS(SELECT 1 FROM payment_events WHERE id=?)",
    ).bind(crypto.randomUUID(), c.get("user").id, order.id, marker),
  ]);
  if (!result[0].meta.changes)
    return c.text("Order changed concurrently.", 409);
  return c.redirect("/admin/orders", 303);
});
