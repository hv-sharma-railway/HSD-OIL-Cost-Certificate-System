import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || "railway.db";
const db = new Database(dbPath);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS sheds (
    id TEXT PRIMARY KEY,
    shed_name TEXT NOT NULL,
    railway TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS prices (
    id TEXT PRIMARY KEY,
    supplying_shed TEXT NOT NULL,
    month TEXT NOT NULL,
    year TEXT NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_completed INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    state TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS consumption_records (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    shed_name TEXT NOT NULL,
    railway TEXT NOT NULL,
    supplying_shed TEXT NOT NULL,
    month TEXT NOT NULL,
    year TEXT NOT NULL,
    during_month TEXT NOT NULL,
    during_year TEXT NOT NULL,
    goods_litres REAL NOT NULL,
    coach_litres REAL NOT NULL,
    total_litres REAL NOT NULL,
    amount REAL NOT NULL,
    is_power_car INTEGER NOT NULL,
    pricing_period TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    session_name TEXT,
    user_email TEXT NOT NULL,
    action_type TEXT NOT NULL,
    details TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Alter existing tables if needed
try { db.prepare("ALTER TABLE sessions ADD COLUMN is_completed INTEGER DEFAULT 0").run(); } catch (e) {}
try { db.prepare("ALTER TABLE consumption_records ADD COLUMN session_id TEXT").run(); } catch (e) {}

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Work Logs & Analytics State
app.get("/api/sessions", (req, res) => {
  const sessions = db.prepare("SELECT * FROM sessions ORDER BY updated_at DESC").all();
  res.json(sessions.map((s: any) => ({ ...s, is_completed: !!s.is_completed, state: JSON.parse(s.state) })));
});

app.post("/api/sessions", (req, res) => {
  const { id, name, description, state, is_completed } = req.body;
  const stateStr = JSON.stringify(state);
  db.prepare(`
    INSERT OR REPLACE INTO sessions (id, name, description, is_completed, state, updated_at) 
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(id, name, description, is_completed ? 1 : 0, stateStr);
  res.json({ success: true });
});

app.patch("/api/sessions/:id/complete", (req, res) => {
  db.prepare("UPDATE sessions SET is_completed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.delete("/api/sessions/:id", (req, res) => {
  db.prepare("DELETE FROM consumption_records WHERE session_id = ?").run(req.params.id);
  db.prepare("DELETE FROM sessions WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/analytics", (req, res) => {
  const records = db.prepare(`
    SELECT cr.* FROM consumption_records cr
    JOIN sessions s ON cr.session_id = s.id
    WHERE s.is_completed = 1
    ORDER BY cr.year DESC, cr.month DESC
  `).all();
  res.json(records.map((r: any) => ({ ...r, is_power_car: !!r.is_power_car })));
});

app.post("/api/analytics/batch", (req, res) => {
  const records = req.body; // Array of records
  const insert = db.prepare(`
    INSERT INTO consumption_records (
      id, session_id, shed_name, railway, supplying_shed, month, year, 
      during_month, during_year, goods_litres, coach_litres, 
      total_litres, amount, is_power_car, pricing_period
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction((recs) => {
    if (recs.length > 0 && recs[0].session_id) {
      db.prepare("DELETE FROM consumption_records WHERE session_id = ?").run(recs[0].session_id);
    }
    for (const r of recs) {
      insert.run(
        r.id, r.session_id || null, r.shed_name, r.railway, r.supplying_shed, r.month, r.year,
        r.during_month, r.during_year, r.goods_litres, r.coach_litres,
        r.total_litres, r.amount, r.is_power_car ? 1 : 0, r.pricing_period
      );
    }
  });

  transaction(records);
  res.json({ success: true });
});

// Audit Logs APIs
app.get("/api/audit-logs", (req, res) => {
  const logs = db.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500").all();
  res.json(logs);
});

app.post("/api/audit-logs", (req, res) => {
  const { id, session_id, session_name, user_email, action_type, details } = req.body;
  db.prepare(`
    INSERT INTO audit_logs (id, session_id, session_name, user_email, action_type, details, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(id || Math.random().toString(36).substr(2, 9), session_id || null, session_name || null, user_email, action_type, details);
  res.json({ success: true });
});

app.get("/api/sheds", (req, res) => {
  const sheds = db.prepare("SELECT * FROM sheds").all();
  res.json(sheds);
});

app.post("/api/sheds", (req, res) => {
  const { id, shed_name, railway } = req.body;
  db.prepare("INSERT OR IGNORE INTO sheds (id, shed_name, railway) VALUES (?, ?, ?)").run(id, shed_name, railway);
  res.json({ success: true });
});

app.delete("/api/sheds/:id", (req, res) => {
  db.prepare("DELETE FROM sheds WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/prices", (req, res) => {
  const prices = db.prepare("SELECT * FROM prices").all();
  const formattedPrices = prices.map((p: any) => {
    const parsedData = JSON.parse(p.data);
    // Handle legacy data where p.data was just the periods object
    const periods = parsedData.periods || parsedData;
    const periodNames = parsedData.periodNames || { p1: '1st-15th', p2: '16th-End' };
    
    // Map legacy keys if necessary
    if (periods['1st-15th']) {
      periods.p1 = periods['1st-15th'];
      delete periods['1st-15th'];
    }
    if (periods['16th-End']) {
      periods.p2 = periods['16th-End'];
      delete periods['16th-End'];
    }
    if (periods['Average']) {
      periods.average = periods['Average'];
      delete periods['Average'];
    }

    return {
      id: p.id,
      supplying_shed: p.supplying_shed,
      month: p.month,
      year: p.year,
      periodNames,
      periods
    };
  });
  res.json(formattedPrices);
});

app.post("/api/prices", (req, res) => {
  const { id, supplying_shed, month, year, periods, periodNames } = req.body;
  const data = JSON.stringify({ periods, periodNames });
  db.prepare("INSERT OR REPLACE INTO prices (id, supplying_shed, month, year, data) VALUES (?, ?, ?, ?, ?)")
    .run(id, supplying_shed, month, year, data);
  res.json({ success: true });
});

app.delete("/api/prices/:id", (req, res) => {
  db.prepare("DELETE FROM prices WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
