import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import https from "node:https";
import http from "node:http";

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

// DSC Signer proxy — forwards requests from browser to local Windows DSC service
// Uses host.docker.internal so the Docker container can reach the Windows host
const DSC_HOST = process.env.DSC_SIGNER_HOST || "host.docker.internal";

app.get("/api/dsc/health", (req, res) => {
  const port = Number(req.query.port) || 55101;
  const protocol = (req.query.protocol as string) || "https";
  const lib = protocol === "https" ? https : http;

  const options: https.RequestOptions = {
    hostname: DSC_HOST,
    port,
    path: "/check/isLive",
    method: "GET",
    rejectUnauthorized: false,
    timeout: 6000,
  };

  const proxyReq = lib.request(options, (proxyRes) => {
    let data = "";
    proxyRes.on("data", (chunk) => { data += chunk; });
    proxyRes.on("end", () => {
      res.json({ status: "online", statusCode: proxyRes.statusCode, body: data.slice(0, 200) });
    });
  });

  proxyReq.on("timeout", () => {
    proxyReq.destroy();
    res.status(503).json({ status: "offline", error: "Connection timeout" });
  });

  proxyReq.on("error", (e) => {
    res.status(503).json({ status: "offline", error: e.message });
  });

  proxyReq.end();
});

app.post("/api/dsc/sign", (req, res) => {
  const { _port = 55101, _protocol = "https", _endpoint = "/signPdf", ...body } = req.body;
  const lib = _protocol === "https" ? https : http;
  const bodyStr = JSON.stringify(body);

  const options: https.RequestOptions = {
    hostname: DSC_HOST,
    port: Number(_port),
    path: _endpoint as string,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(bodyStr),
    },
    rejectUnauthorized: false,
    timeout: 60000,
  };

  const proxyReq = lib.request(options, (proxyRes) => {
    let data = "";
    proxyRes.on("data", (chunk) => { data += chunk; });
    proxyRes.on("end", () => {
      try {
        const parsed = JSON.parse(data);
        res.status(proxyRes.statusCode || 200).json(parsed);
      } catch {
        res.status(500).json({ error: "Invalid JSON from signer service", raw: data.slice(0, 500) });
      }
    });
  });

  proxyReq.on("timeout", () => {
    proxyReq.destroy();
    res.status(504).json({ error: "Signer service timeout" });
  });

  proxyReq.on("error", (e) => {
    res.status(502).json({ error: `Proxy error: ${e.message}` });
  });

  proxyReq.write(bodyStr);
  proxyReq.end();
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
