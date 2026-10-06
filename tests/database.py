"""Schema/data invariants against real SQLite, not ORM mocks."""
import pathlib
import sqlite3
import unittest

class DatabaseTests(unittest.TestCase):
    def setUp(self):
        self.db = sqlite3.connect(":memory:")
        self.db.execute("PRAGMA foreign_keys = ON")
        for path in sorted(pathlib.Path("migrations").glob("*.sql")):
            self.db.executescript(path.read_text())

    def tearDown(self):
        self.db.close()

    def test_honest_seed_and_integrity(self):
        self.assertEqual(self.db.execute("PRAGMA integrity_check").fetchone()[0], "ok")
        self.assertEqual(self.db.execute("PRAGMA foreign_key_check").fetchall(), [])
        self.assertEqual(self.db.execute("SELECT count(*) FROM services WHERE status='published'").fetchone()[0], 3)
        self.assertEqual(self.db.execute("SELECT count(*) FROM projects WHERE is_concept=1").fetchone()[0], 2)
        for table in ["testimonials", "social_links", "leads", "orders", "users"]:
            self.assertEqual(self.db.execute(f"SELECT count(*) FROM {table}").fetchone()[0], 0)

    def test_rate_counter_is_bounded_and_atomic(self):
        sql = """INSERT INTO rate_limits(subject,window,attempts) VALUES('test',1,1)
        ON CONFLICT(subject,window) DO UPDATE SET attempts=attempts+1
        WHERE attempts<5 RETURNING attempts"""
        for expected in range(1, 6):
            self.assertEqual(self.db.execute(sql).fetchone()[0], expected)
        self.assertIsNone(self.db.execute(sql).fetchone())
        self.assertEqual(self.db.execute("SELECT attempts FROM rate_limits").fetchone()[0], 5)

    def test_payments_require_money_and_deduplicate_events(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO orders(id,amount_minor,currency,package_snapshot_json) VALUES('bad',-1,'PKR','{}')")
        self.db.execute("INSERT INTO orders(id,amount_minor,currency,package_snapshot_json) VALUES('order',10000,'PKR','{}')")
        sql = "INSERT INTO payment_events(id,provider,event_id,order_id,amount_minor,currency,status) VALUES(?, 'wallet', 'event', 'order', 10000, 'PKR', 'paid')"
        self.db.execute(sql, ("first",))
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute(sql, ("duplicate",))

    def test_invalid_lead_service_and_content_json_are_rejected(self):
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("INSERT INTO leads(id,name,email,service_id,budget,message) VALUES('x','Sample','sample@example.test','unknown','Not sure yet','A meaningful project description.')")
        with self.assertRaises(sqlite3.IntegrityError):
            self.db.execute("UPDATE packages SET features_json='not json'")

if __name__ == "__main__":
    unittest.main(verbosity=2)
