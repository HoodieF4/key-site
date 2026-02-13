const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");

const app = express();
app.use(express.json());

// Render provides PORT automatically
const PORT = process.env.PORT || 3000;

// Local database (for testing)
const db = new sqlite3.Database("./keys.db");

// ---------------- HELPERS ----------------
function generateKey() {
  return crypto.randomBytes(16).toString("hex").toUpperCase();
}

function hashKey(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// ---------------- DATABASE ----------------
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

// ---------------- ROUTES ----------------

// Health check
app.get("/", (req, res) => {
  res.send("✅ Key Site is running!");
});

// ✅ Lockr redirects here after tasks completion
app.get("/done", (req, res) => {
  const key = generateKey();
  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes

  db.run(
    `INSERT INTO keys (key_hash, created_at, expires_at, used_at, used_by)
     VALUES (?, ?, ?, NULL, NULL)`,
    [hashKey(key), now, expiresAt],
    (err) => {
      if (err) return res.status(500).send("Error generating key.");

      res.send(`
<!doctype html>
<html>
<head>
  <title>Your Key</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
</head>

<body style="margin:0;font-family:Arial;background:#0b0b10;color:white;">
  <div style="max-width:720px;margin:auto;padding:30px;">

    <h2>✅ Key Generated Successfully</h2>

    <p style="opacity:0.8;">
      Copy this key and redeem it in Discord using <b>/redeem</b>.
      <br>
      ⏳ This key expires in <b>10 minutes</b>.
    </p>

    <div style="padding:16px;border:1px solid #333;border-radius:12px;background:#15151f;">
      <h3 style="margin:0;">Your Key:</h3>

      <div id="keyBox"
        style="margin-top:10px;font-size:22px;letter-spacing:1px;word-break:break-all;">
        ${key}
      </div>

      <button onclick="copyKey()"
        style="margin-top:15px;padding:10px 15px;border-radius:10px;border:none;cursor:pointer;">
        Copy Key
      </button>

      <p id="msg" style="margin-top:10px;opacity:0.7;"></p>
    </div>

    <p style="margin-top:20px;opacity:0.6;">
      If your key expires, complete the tasks again to generate a new one.
    </p>

  </div>

<script>
function copyKey() {
  const text = document.getElementById("keyBox").innerText;
  navigator.clipboard.writeText(text).then(() => {
    document.getElementById("msg").innerText = "✅ Key copied!";
  }).catch(() => {
    document.getElementById("msg").innerText =
      "⚠️ Could not copy automatically. Please copy manually.";
  });
}
</script>

</body>
</html>
      `);
    }
  );
});

// ✅ Bot calls this endpoint to redeem a key
app.post("/api/redeem", (req, res) => {
  const { key, userId } = req.body;

  if (!key || !userId) {
    return res.status(400).json({ ok: false, error: "missing_data" });
  }

  const now = Date.now();
  const keyHash = hashKey(key.trim());

  db.get(`SELECT * FROM keys WHERE key_hash = ?`, [keyHash], (err,_*
