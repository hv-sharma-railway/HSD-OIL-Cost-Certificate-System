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
`);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.get("/api/sheds", (req, res) => {
  const sheds = db.prepare("SELECT * FROM sheds").all();
  res.json(sheds);
});

app.post("/api/sheds", (req, res) => {
  const { id, shed_name, railway } = req.body;
  db.prepare("INSERT INTO sheds (id, shed_name, railway) VALUES (?, ?, ?)").run(id, shed_name, railway);
  res.json({ success: true });
});

app.delete("/api/sheds/:id", (req, res) => {
  db.prepare("DELETE FROM sheds WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/prices", (req, res) => {
  const prices = db.prepare("SELECT * FROM prices").all();
  const formattedPrices = prices.map((p: any) => ({
    ...p,
    periods: JSON.parse(p.data)
  }));
  res.json(formattedPrices);
});

app.post("/api/prices", (req, res) => {
  const { id, supplying_shed, month, year, periods } = req.body;
  const data = JSON.stringify(periods);
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
