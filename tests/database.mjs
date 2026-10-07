import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const file of readdirSync("migrations")
    .filter((file) => file.endsWith(".sql"))
    .sort())
    db.exec(readFileSync(`migrations/${file}`, "utf8"));
  return db;
}
test("schema integrity, published services and honest seed data", () => {
  const db = database();
  try {
    assert.equal(
      Object.values(db.prepare("PRAGMA integrity_check").get())[0],
      "ok",
    );
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
    assert.equal(
      db
        .prepare("SELECT count(*) AS n FROM services WHERE status='published'")
        .get().n,
      3,
    );
    assert.equal(
      db.prepare("SELECT count(*) AS n FROM projects WHERE is_concept=0").get()
        .n,
      0,
    );
    for (const table of [
      "testimonials",
      "social_links",
      "leads",
      "orders",
      "users",
    ])
      assert.equal(db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n, 0);
  } finally {
    db.close();
  }
});
test("atomic rate counter stops at five attempts", () => {
  const db = database();
  try {
    const counter = db.prepare(
      "INSERT INTO rate_limits(subject,window,attempts) VALUES('test',1,1) ON CONFLICT(subject,window) DO UPDATE SET attempts=attempts+1 WHERE attempts<5 RETURNING attempts",
    );
    for (let n = 1; n <= 5; n++) assert.equal(counter.get().attempts, n);
    assert.equal(counter.get(), undefined);
  } finally {
    db.close();
  }
});
test("money is constrained and payment events are deduplicated", () => {
  const db = database();
  try {
    assert.throws(() =>
      db.exec(
        "INSERT INTO orders(id,amount_minor,currency,package_snapshot_json) VALUES('bad',-1,'PKR','{}')",
      ),
    );
    db.exec(
      "INSERT INTO orders(id,amount_minor,currency,package_snapshot_json) VALUES('order',10000,'PKR','{}')",
    );
    const event = db.prepare(
      "INSERT INTO payment_events(id,provider,event_id,order_id,amount_minor,currency,status) VALUES(?,'wallet','event','order',10000,'PKR','paid')",
    );
    event.run("first");
    assert.throws(() => event.run("duplicate"));
  } finally {
    db.close();
  }
});
test("invalid references and content JSON are rejected", () => {
  const db = database();
  try {
    assert.throws(() =>
      db.exec(
        "INSERT INTO leads(id,name,email,service_id,budget,message) VALUES('x','Sample','sample@example.test','unknown','Not sure yet','A meaningful project description.')",
      ),
    );
    assert.throws(() =>
      db.exec("UPDATE packages SET features_json='not json'"),
    );
  } finally {
    db.close();
  }
});
