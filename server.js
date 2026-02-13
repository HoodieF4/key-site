const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const db = new sqlite3.Database("./keys.db");

/* ---------------- Helpers ---------------- */

function generateKey() {
  return crypto.randomBytes(16).toString("hex").toUpperCase();
}

function hashKey(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/* ---------------- DB ---------------- */

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS keys (
      key_hash TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      used_by TEXT
    )
  `);
});

/* ---------------- Routes ---------------- */

app.get("/", (req, res) => {
  res.type("text/plain").send("OK - Key Site is running ✅");
});

// Lockr should redirect here after tasks completion.
// This returns a simple page with the key (no big HTML template).
app.get("/done", (req, res) => {
  const key = generateKey();
  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes

  db.run(
    `INSERT INTO keys (key_hash, created_at, expires_at) VALUES (?, ?, ?)`,
    [hashKey(key), now, expiresAt],
    (err) => {
      if (err) return res.status(500).type("text/plain").send("Error generating key.");

      // Minimal HTML (safe, no template backticks)
      res
        .status(200)
        .type("text/html")
        .send(
          "<!doctype html><html><head><meta charset='utf-8'/>" +
            "<meta name='viewport' content='width=device-width, initial-scale=1'/>" +
            "<title>Your Key</title></head>" +
            "<body style='margin:0;font-family:Arial;background:#0b0b10;color:#fff;'>" +
            "<div style='max-width:720px;margin:auto;padding:28px;'>" +
            "<h2>✅ Key Generated</h2>" +
            "<p style='opacity:.8'>Copy the key below and redeem it in Discord using <b>/redeem</b>.<br/>" +
            "⏳ This key expires in <b>10 minutes</b>.</p>" +
            "<div style='padding:14px;border:1px solid #333;border-radius:12px;background:#15151f;'>" +
            "<div style='opacity:.7;font-size:13px;margin-bottom:8px;'>Your Key:</div>" +
            "<div style='font-size:22px;letter-spacing:1px;word-break:break-all;'>" +
            key +
            "</div>" +
            "</div>" +
            "<p style='margin-top:16px;opacity:.6'>If it expires, complete the tasks again to generate a new one.</p>" +
            "</div></body></html>"
        );
    }
  );
});

// Bot calls this to redeem a key
app.post("/api/redeem", (req, res) => {
  const key = (req.body?.key || "").trim();
  const userId = String(req.body?.userId || "").trim();

  if (!key || !userId) {
    return res.status(400).json({ ok: false, error: "missing_data" });
  }

  const now = Date.now();
  const keyHash = hashKey(key);

  db.get(`SELECT * FROM keys WHERE key_hash = ?`, [keyHash], (err, row) => {
    if (err) return res.status(500).json({ ok: false, error: "db_error" });
    if (!row) return res.status(404).json({ ok: false, error: "invalid_key" });
    if (row.used_at) return res.status(409).json({ ok: false, error: "already_used" });
    if (row.expires_at < now) return res.status(410).json({ ok: false, error: "expired" });

    db.run(
      `UPDATE keys SET used_at = ?, used_by = ? WHERE key_hash = ?`,
      [now, userId, keyHash],
      (e2) => {
        if (e2) return res.status(500).json({ ok: false, error: "db_error" });
        return res.json({ ok: true });
      }
    );
  });
});

/* ---------------- Start ---------------- */

app.listen(PORT, () => {
  console.log(`Key Site running on port ${PORT}`);
});
