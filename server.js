const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");

const app = express();
app.use(express.json());

// Render usa PORT automaticamente
const PORT = process.env.PORT || 3000;

// DB local (para já). No Render free isto pode resetar quando redeploy.
// Para começar e testar, serve.
const db = new sqlite3.Database("./keys.db");

// --- Helpers
function makeKey() {
  // 32 chars, fácil de copiar
  return crypto.randomBytes(16).toString("hex").toUpperCase();
}
function hashKey(k) {
  return crypto.createHash("sha256").update(k).digest("hex");
}

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

// Healthcheck
app.get("/", (req, res) => res.send("OK - key site is running ✅"));

// ✅ Lockr redireciona para aqui quando o user completa tarefas
app.get("/done", (req, res) => {
  const key = makeKey();
  const now = Date.now();
  const expiresAt = now + 10 * 60 * 1000; // key válida por 10 min

  db.run(
    `INSERT INTO keys (key_hash, created_at, expires_at, used_at, used_by)
     VALUES (?, ?, ?, NULL, NULL)`,
    [hashKey(key), now, expiresAt],
    (err) => {
      if (err) return res.status(500).send("Erro ao gerar key.");

      res.setHeader("Content-Type", "text/html");
      res.send(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Key Gerada</title>
</head>
<body style="margin:0; font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#0b0b10; color:#fff;">
  <div style="max-width:720px; margin:0 auto; padding:28px;">
    <h2 style="margin:0 0 10px;">✅ Key gerada com sucesso</h2>
    <p style="opacity:.85; line-height:1.4;">
      Copia a key abaixo e volta ao Discord para usar o comando <b>/redeem</b>.
      <br/>⏳ Esta key expira em <b>10 minutos</b>.
    </p>

    <div style="margin:18px 0; padding:16px; border:1px solid #2a2a3a; border-radius:14px; background:#12121a;">
      <div style="font-size:14px; opacity:.75; margin-bottom:8px;">Tua key:</div>
      <div id="k" style="font-size:22px; letter-spacing:1px; word-break:break-all;">${key}</div>
      <button onclick="copyKey()" style="margin-top:14px; padding:10px 14px; border-radius:10px; border:0; cursor:pointer;">
        Copiar key
      </button>
      <div id="msg" style="margin-top:10px; opacity:.8;"></div>
    </div>

    <p style="opacity:.65;">Se expirar, volta a completar as tarefas para gerar outra.</p>
  </div>

<script>
function copyKey(){
  const text = document.getElementById("k").innerText;
  navigator.clipboard.writeText(text).then(()=>{
    document.getElementById("msg").innerText = "✅ Copiada!";
  }).catch(()=>{
    document.getElementById("msg").innerText = "⚠️ Não deu para copiar automaticamente. Copia manualmente.";
  });
}
</script>
</body>
</html>
      `);
    }
  );
});

// ✅ Endpoint para o BOT validar e resgatar key
app.post("/api/redeem", (req, res) => {
  const { key, userId } = req.body || {};
  if (!key || !userId) return res.status(400).json({ ok: false, error: "missing_key_or_user" });

  const now = Date.now();
  const keyHash = hashKey(String(key).trim());

  db.get(`SELECT * FROM keys WHERE key_hash = ?`, [keyHash], (err, row) => {
    if (err) return res.status(500).json({ ok: false, error: "db_error" });
    if (!row) return res.status(404).json({ ok: false, error: "invalid" });
    if (row.used_at) return res.status(409).json({ ok: false, error: "already_used" });
    if (row.expires_at < now) return res.status(410).json({ ok: false, error: "expired" });

    db.run(
      `UPDATE keys SET used_at = ?, used_by = ? WHERE key_hash = ?`,
      [now, String(userId), keyHash],
      (e2) => {
        if (e2) return res.status(500).json({ ok: false, error: "db_error" });
        return res.json({ ok: true });
      }
    );
  });
});

app.listen(PORT, () => console.log("✅ key-site running on port", PORT));
