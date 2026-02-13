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

function hashKey(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function randomToken() {
  return crypto.randomBytes(24).toString("hex");
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

  // One-time tokens to display the key page only once
  db.run(`
    CREATE TABLE IF NOT EXISTS page_tokens (
      token_hash TEXT PRIMARY KEY,
      key_plain TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER
    )
  `);
});

/* ---------------- UI helpers ---------------- */

function renderNeedNewKeyPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Generate a New Key</title>
  <style>
    body{margin:0;font-family:system-ui,Segoe UI,Roboto,Arial;background:#0b0b12;color:#fff;min-height:100vh;display:grid;place-items:center;}
    .card{max-width:640px;width:92vw;border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:22px;background:rgba(255,255,255,.06);}
    h2{margin:0 0 8px;}
    p{margin:8px 0;opacity:.8;line-height:1.4}
    .tip{opacity:.65;font-size:13px;margin-top:14px}
  </style>
</head>
<body>
  <div class="card">
    <h2>🔒 No valid key page</h2>
    <p>You must generate a new key by completing the tasks.</p>
    <p>Go back to Discord and click <b>Generate Key</b>.</p>
    <div class="tip">This page can only show a key once. Reloading or sharing the link won’t work.</div>
  </div>
</body>
</html>`;
}

function renderKeyPage({ key, serverName, iconUrl }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Your Key</title>
  <style>
    :root{
      --bg1:#0b0b12;
      --bg2:#2a0d3f;
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
    .wrap{ width:min(680px, 92vw); padding:18px; }
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
    .top{ position:relative; display:flex; align-items:center; gap:14px; margin-bottom:14px; }
    .icon{
      width:64px; height:64px; border-radius:18px;
      border:1px solid rgba(255,255,255,.22);
      background: rgba(0,0,0,.25);
      overflow:hidden; flex:0 0 auto;
      box-shadow: 0 12px 35px rgba(0,0,0,.35);
    }
    .icon img{width:100%;height:100%;object-fit:cover;display:block}
    .title h1{ font-size:20px; margin:0; letter-spacing:.2px; }
    .title p{ margin:6px 0 0; color:var(--muted); font-size:13px; }

    .keyBox{
      position:relative;
      margin-top:16px;
      border:1px solid rgba(255,255,255,.18);
      background: rgba(10,10,18,.35);
      border-radius:16px;
      padding:16px;
    }
    .keyLabel{ font-size:12px; color:var(--muted); margin-bottom:10px; }
    .keyValue{
      font-size:20px; letter-spacing:1px; word-break:break-all;
      padding:12px 14px; border-radius:14px;
      background: rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.12);
      cursor:pointer; user-select:none;
    }
    .actions{ display:flex; gap:10px; margin-top:12px; flex-wrap:wrap; }
    .btn{
      border:0; cursor:pointer; border-radius:14px;
      padding:10px 14px; font-weight:600; color:#0b0b12;
      background: linear-gradient(135deg, rgba(255,255,255,.95), rgba(255,255,255,.75));
      box-shadow: 0 10px 30px rgba(0,0,0,.25);
    }
    .toast{ margin-top:10px; font-size:13px; color: rgba(255,255,255,.88); min-height:18px; }
    .pill{
      display:inline-flex; align-items:center; gap:8px;
      font-size:12px; color: rgba(255,255,255,.78);
      border: 1px solid rgba(255,255,255,.16);
      background: rgba(255,255,255,.06);
      padding:7px 10px; border-radius:999px; margin-top:12px;
    }
    .hint{ margin-top:14px; font-size:13px; color:var(--muted); line-height:1.4; }
  </style>
</head>
<body>
  <div class="noise"></div>
  <div class="wrap">
    <div class="card">
      <div class="glow"></div>

      <div class="top">
        <div class="icon">
          <img src="${iconUrl}" alt="Server icon" onerror="this.style.display='none'">
        </div>
        <div class="title">
          <h1>✅ Key Generated</h1>
          <p>Copy this key and redeem it in Discord using <b>/redeem</b>.</p>
        </div>
      </div>

      <div class="keyBox">
        <div class="keyLabel">Your Key (click to copy):</div>
        <div class="keyValue" id="keyValue" onclick="copyKey()">${key}</div>

        <div class="actions">
          <button class="btn" onclick="copyKey()">Copy Key</button>
        </div>

        <div class="toast" id="toast"></div>

        <div class="pill">⏳ Expires in 10 minutes • ${serverName}</div>
      </div>

      <div class="hint">
        This page is <b>one-time</b>. If you reload or share the link, you must generate a new key.
      </div>
    </div>
  </div>

<script>
  function copyKey(){
    const el = document.getElementById("keyValue");
    const toast = document.getElementById("toast");
    const text = el.innerText.trim();

    navigator.clipboard.writeText(text).then(() => {
      toast.textContent = "✅ Copied! Go back to Discord and run /redeem";
      setTimeout(() => toast.textContent = "", 3500);
    }).catch(() => {
      toast.textContent = "⚠️ Could not copy automatically. Please copy it manually.";
      setTimeout(() => toast.textContent = "", 3500);
    });
  }
</script>
</body>
</html>`;
}

/* ---------------- Routes ---------------- */

app.get("/", (req, res) => {
  // Optional: keep this as plain text or redirect to /done
  res.type("text/plain").send("OK - Key Site is running ✅");
});

/**
 * Lockr success redirect should point here:
 * /unlock?s=YOUR_SECRET
 */
app.get("/unlock", (req, res) => {
  const secret = String(req.query?.s || "").trim();
  const expected = String(process.env.LOCKR_SECRET || "").trim();

  if (!expected || secret !== expected) {
    return res.status(403).type("text/html").send(renderNeedNewKeyPage());
  }

  const key = generateKey();
  const now = Date.now();
  const keyExpiresAt = now + 10 * 60 * 1000; // redeem window

  db.run(
    `INSERT INTO keys (key_hash, created_at, expires_at) VALUES (?, ?, ?)`,
    [hashKey(key), now, keyExpiresAt],
    (err) => {
      if (err) return res.status(500).type("text/plain").send("Error generating key.");

      const pageToken = randomToken();
      const pageTokenExpiresAt = now + 2 * 60 * 1000; // 2 min to view the page once

      db.run(
        `INSERT INTO page_tokens (token_hash, key_plain, expires_at, used_at)
         VALUES (?, ?, ?, NULL)`,
        [hashKey(pageToken), key, pageTokenExpiresAt],
        (err2) => {
          if (err2) return res.status(500).type("text/plain").send("Error creating token.");

          return res.redirect(`/done?t=${pageToken}`);
        }
      );
    }
  );
});

/**
 * Shows key only ONCE. Reload/sharing will not work.
 */
app.get("/done", (req, res) => {
  const t = String(req.query?.t || "").trim();
  if (!t) return res.status(200).type("text/html").send(renderNeedNewKeyPage());

  const now = Date.now();
  const tHash = hashKey(t);

  db.get(`SELECT * FROM page_tokens WHERE token_hash = ?`, [tHash], (err, row) => {
    if (err || !row) return res.status(200).type("text/html").send(renderNeedNewKeyPage());
    if (row.used_at) return res.status(200).type("text/html").send(renderNeedNewKeyPage());
    if (row.expires_at < now) return res.status(200).type("text/html").send(renderNeedNewKeyPage());

    // Mark token as used immediately (prevents refresh / sharing)
    db.run(`UPDATE page_tokens SET used_at = ? WHERE token_hash = ?`, [now, tHash]);

    // ✅ Customize these:
    const SERVER_NAME = "FROST🔞| Best Free Daily Packs 💦";
    const ICON_URL = "https://media.discordapp.net/attachments/1146456316290797678/1471717239920001095/Sfff44a1e8b564fadac807ad15eb2948dA.webp?ex=698ff2fd&is=698ea17d&hm=973b7c56c336d83edbc8a69434b415c00184381fa6eb6c8ea0e924b045b46122&=&format=webp&width=1511&height=1511";

    return res.status(200).type("text/html").send(
      renderKeyPage({ key: row.key_plain, serverName: SERVER_NAME, iconUrl: ICON_URL })
    );
  });
});

/**
 * Bot calls this endpoint to redeem a key
 */
app.post("/api/redeem", (req, res) => {
  const key = String(req.body?.key || "").trim();
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
