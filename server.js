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
          // Lockr redirect page
app.get("/done", (req, res) => {
  const key = generateKey();
  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes

  db.run(
    `INSERT INTO keys (key_hash, created_at, expires_at) VALUES (?, ?, ?)`,
    [hashKey(key), now, expiresAt],
    (err) => {
      if (err) return res.status(500).type("text/plain").send("Error generating key.");

      const SERVER_NAME = "YOUR SERVER";
      const ICON_URL = "https://cdn.discordapp.com/icons/YOUR_GUILD_ID/YOUR_ICON.png?size=256";

      res.status(200).type("text/html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Your Key</title>
  <style>
    :root{
      --bg1:#0b0b12;
      --bg2:#2a0d3f;
      --bg3:#ff4fd8;
      --card: rgba(255,255,255,.10);
      --stroke: rgba(255,255,255,.18);
      --text: rgba(255,255,255,.92);
      --muted: rgba(255,255,255,.70);
      --shadow: 0 20px 80px rgba(0,0,0,.55);
    }
    *{box-sizing:border-box}
    body{
      margin:0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
      color:var(--text);
      min-height:100vh;
      display:grid;
      place-items:center;
      overflow:hidden;
      background:
        radial-gradient(1200px 600px at 20% 20%, rgba(255,79,216,.35), transparent 60%),
        radial-gradient(900px 500px at 80% 30%, rgba(159,92,255,.35), transparent 60%),
        radial-gradient(900px 600px at 50% 90%, rgba(255,255,255,.10), transparent 60%),
        linear-gradient(135deg, var(--bg1), var(--bg2));
    }
    .noise{
      position:fixed; inset:0;
      background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='.25'/%3E%3C/svg%3E");
      opacity:.10;
      pointer-events:none;
      mix-blend-mode:overlay;
    }
    .wrap{
      width:min(680px, 92vw);
      padding:18px;
    }
    .card{
      position:relative;
      border:1px solid var(--stroke);
      background:var(--card);
      border-radius:22px;
      box-shadow:var(--shadow);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      padding:26px 22px 22px;
      overflow:hidden;
    }
    .glow{
      position:absolute; inset:-120px;
      background: conic-gradient(from 210deg, rgba(255,79,216,.20), rgba(159,92,255,.22), rgba(255,255,255,.10), rgba(255,79,216,.20));
      filter: blur(40px);
      opacity:.75;
      pointer-events:none;
    }
    .top{
      position:relative;
      display:flex;
      align-items:center;
      gap:14px;
      margin-bottom:14px;
    }
    .icon{
      width:64px; height:64px;
      border-radius:18px;
      border:1px solid rgba(255,255,255,.22);
      background: rgba(0,0,0,.25);
      overflow:hidden;
      flex:0 0 auto;
      box-shadow: 0 12px 35px rgba(0,0,0,.35);
    }
    .icon img{width:100%;height:100%;object-fit:cover;display:block}
    .title{
      line-height:1.1;
    }
    .title h1{
      font-size:20px;
      margin:0;
      letter-spacing:.2px;
    }
    .title p{
      margin:6px 0 0;
      color:var(--muted);
      font-size:13px;
    }
    .keyBox{
      position:relative;
      margin-top:16px;
      border:1px solid rgba(255,255,255,.18);
      background: rgba(10,10,18,.35);
      border-radius:16px;
      padding:16px;
    }
    .keyLabel{
      font-size:12px;
      color:var(--muted);
      margin-bottom:10px;
    }
    .keyValue{
      font-size:20px;
      letter-spacing:1px;
      word-break:break-all;
      padding:12px 14px;
      border-radius:14px;
      background: rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.12);
      cursor:pointer;
      user-select:none;
      transition: transform .08s ease, background .2s ease;
    }
    .keyValue:hover{ background: rgba(255,255,255,.10); }
    .keyValue:active{ transform: scale(.99); }
    .actions{
      display:flex;
      gap:10px;
      margin-top:12px;
      flex-wrap:wrap;
    }
    .btn{
      border:0;
      cursor:pointer;
      border-radius:14px;
      padding:10px 14px;
      font-weight:600;
      color:#0b0b12;
      background: linear-gradient(135deg, rgba(255,255,255,.95), rgba(255,255,255,.75));
      box-shadow: 0 10px 30px rgba(0,0,0,.25);
      transition: transform .08s ease, opacity .2s ease;
    }
    .btn:hover{ opacity:.95; }
    .btn:active{ transform: scale(.99); }
    .hint{
      margin-top:14px;
      font-size:13px;
      color:var(--muted);
      line-height:1.4;
    }
    .toast{
      margin-top:10px;
      font-size:13px;
      color: rgba(255,255,255,.88);
      min-height:18px;
    }
    .pill{
      display:inline-flex;
      align-items:center;
      gap:8px;
      font-size:12px;
      color: rgba(255,255,255,.78);
      border: 1px solid rgba(255,255,255,.16);
      background: rgba(255,255,255,.06);
      padding:7px 10px;
      border-radius:999px;
      margin-top:12px;
    }
  </style>
</head>
<body>
  <div class="noise"></div>
  <div class="wrap">
    <div class="card">
      <div class="glow"></div>

      <div class="top">
        <div class="icon">
          <img src="${ICON_URL}" alt="Server icon" onerror="this.style.display='none'">
        </div>
        <div class="title">
          <h1>✅ Key Generated</h1>
          <p>Use this key in Discord with <b>/redeem</b> to get 1-hour access.</p>
        </div>
      </div>

      <div class="keyBox">
        <div class="keyLabel">Your Key (click to copy):</div>
        <div class="keyValue" id="keyValue" onclick="copyKey()">${key}</div>

        <div class="actions">
          <button class="btn" onclick="copyKey()">Copy Key</button>
        </div>

        <div class="toast" id="toast"></div>

        <div class="pill">⏳ Expires in 10 minutes • ${SERVER_NAME}</div>
      </div>

      <div class="hint">
        If your key expires, complete the tasks again to generate a new one.
      </div>
    </div>
  </div>

<script>
  function copyKey(){
    const el = document.getElementById("keyValue");
    const toast = document.getElementById("toast");
    const text = el.innerText.trim();

    navigator.clipboard.writeText(text).then(() => {
      toast.textContent = "✅ Copied! Now go back to Discord and run /redeem";
      setTimeout(() => toast.textContent = "", 3500);
    }).catch(() => {
      toast.textContent = "⚠️ Could not copy automatically. Please copy it manually.";
      setTimeout(() => toast.textContent = "", 3500);
    });
  }
</script>
</body>
</html>`);
    }
  );
});

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
