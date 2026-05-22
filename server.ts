import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import db from './db.ts';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Storage for vouchers
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// --- Auth Middleware ---
interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: 'ADMIN' | 'SHED_MANAGER';
    shed_id?: string;
    supplying_shed_id?: string;
  };
}

const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const authorize = (roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Permission denied' });
  }
  next();
};

// --- Auth Routes ---
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user: any = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ 
    id: user.id, 
    username: user.username, 
    role: user.role, 
    shed_id: user.shed_id,
    supplying_shed_id: user.supplying_shed_id 
  }, JWT_SECRET, { expiresIn: '8h' });
  
  res.json({ 
    token, 
    user: { 
      id: user.id, 
      username: user.username, 
      role: user.role, 
      shed_id: user.shed_id,
      supplying_shed_id: user.supplying_shed_id
    } 
  });
});

// --- Admin: User Management ---
app.get('/api/admin/users', authenticate, authorize(['ADMIN']), (req, res) => {
  const users = db.prepare('SELECT id, username, role, shed_id, supplying_shed_id FROM users').all();
  res.json(users);
});

app.get('/api/admin/sheds', authenticate, authorize(['ADMIN']), (req, res) => {
  const sheds = db.prepare('SELECT * FROM sheds').all();
  res.json(sheds);
});

app.get('/api/admin/supplying-sheds', authenticate, authorize(['ADMIN']), (req, res) => {
  const sheds = db.prepare('SELECT * FROM supplying_sheds').all();
  res.json(sheds);
});

// Admin management for sheds
app.post('/api/admin/sheds', authenticate, authorize(['ADMIN']), (req, res) => {
  const { id, shed_name, railway } = req.body;
  const actualId = id || `${railway.trim().toUpperCase()}_${shed_name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  db.prepare('INSERT OR REPLACE INTO sheds (id, shed_name, railway) VALUES (?, ?, ?)')
    .run(actualId, shed_name, railway);
  res.json({ success: true, id: actualId });
});

app.post('/api/admin/supplying-sheds', authenticate, authorize(['ADMIN']), (req, res) => {
  const { id, shed_name, railway } = req.body;
  const actualId = id || `${railway.trim().toUpperCase()}_${shed_name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
  db.prepare('INSERT OR REPLACE INTO supplying_sheds (id, shed_name, railway) VALUES (?, ?, ?)')
    .run(actualId, shed_name, railway);
  res.json({ success: true, id: actualId });
});

app.delete('/api/admin/sheds/:id', authenticate, authorize(['ADMIN']), (req, res) => {
  db.prepare('DELETE FROM sheds WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.delete('/api/admin/supplying-sheds/:id', authenticate, authorize(['ADMIN']), (req, res) => {
  db.prepare('DELETE FROM supplying_sheds WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// General Sheds route for authenticated users
app.get('/api/sheds', authenticate, (req, res) => {
  const sheds = db.prepare('SELECT * FROM sheds').all();
  res.json(sheds);
});

app.get('/api/supplying-sheds', authenticate, (req, res) => {
  const sheds = db.prepare('SELECT * FROM supplying_sheds').all();
  res.json(sheds);
});

// Analytics route
app.get('/api/analytics', authenticate, (req, res) => {
  const records = db.prepare('SELECT * FROM consumption_records ORDER BY created_at DESC').all();
  res.json(records);
});

app.post('/api/admin/users', authenticate, authorize(['ADMIN']), (req, res) => {
  const { username, password, role, shed_id, supplying_shed_id } = req.body;
  const id = Math.random().toString(36).substr(2, 9);
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  try {
    db.prepare('INSERT INTO users (id, username, password, role, shed_id, supplying_shed_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, username, hashedPassword, role, shed_id || null, supplying_shed_id || null);
    res.json({ success: true, id });
  } catch (err) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

// --- Session Management ---
app.get('/api/sessions', authenticate, (req: AuthRequest, res) => {
  let sessions;
  if (req.user.role === 'ADMIN') {
    sessions = db.prepare('SELECT s.*, u.username as owner_name FROM sessions s JOIN users u ON s.user_id = u.id ORDER BY s.updated_at DESC').all();
  } else {
    sessions = db.prepare('SELECT s.*, u.username as owner_name FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.user_id = ? ORDER BY s.updated_at DESC').all(req.user.id);
  }
  res.json(sessions.map((s: any) => ({ ...s, data: s.data ? JSON.parse(s.data) : null })));
});

app.post('/api/sessions', authenticate, (req: AuthRequest, res) => {
  const { id, month, year, name, description, data } = req.body;
  const existing = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
  
  if (existing && existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
    return res.status(400).json({ error: 'Cannot edit submitted or approved session' });
  }

  db.prepare(`
    INSERT OR REPLACE INTO sessions (id, user_id, month, year, name, description, data, status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run(id, req.user.id, month, year, name, description, JSON.stringify(data), existing?.status || 'DRAFT');
  
  res.json({ success: true });
});

app.post('/api/sessions/:id/submit', authenticate, (req: AuthRequest, res) => {
  const { id } = req.params;
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
  if (!session || session.user_id !== req.user.id) return res.status(404).json({ error: 'Session not found' });
  
  db.prepare("UPDATE sessions SET status = 'PENDING', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  res.json({ success: true });
});

app.post('/api/sessions/:id/approve', authenticate, authorize(['ADMIN']), (req: AuthRequest, res) => {
  const { id } = req.params;
  
  db.transaction(() => {
    db.prepare("UPDATE sessions SET status = 'APPROVED', approved_at = CURRENT_TIMESTAMP, approved_by = ? WHERE id = ?")
      .run(req.user.id, id);

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
    if (session && session.data) {
      const data = JSON.parse(session.data);
      const { selectedSheds, selectedMonth, selectedYear } = data;
      
      if (Array.isArray(selectedSheds)) {
        for (const shed of selectedSheds) {
          // Calculate amount (simplified server-side logic or just use what's in data if available)
          // For now, we'll store basic info. In a real app, you'd re-calculate or pass the amount.
          const totalLitres = (shed.goods_litres || 0) + (shed.coach_litres || 0);
          
          db.prepare(`
            INSERT INTO consumption_records (
              id, session_id, shed_name, railway, supplying_shed, 
              month, year, during_month, during_year, 
              goods_litres, coach_litres, total_litres, amount, 
              is_power_car, pricing_period
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            Math.random().toString(36).substr(2, 9),
            id,
            shed.shed_name,
            shed.railway,
            shed.supplying_shed,
            selectedMonth,
            selectedYear,
            shed.during_month,
            shed.during_year,
            shed.goods_litres,
            shed.coach_litres,
            totalLitres,
            0, // Amount should be calculated or passed
            shed.is_power_car ? 1 : 0,
            shed.pricing_period
          );
        }
      }
    }
  })();

  res.json({ success: true });
});

app.post('/api/sessions/:id/reject', authenticate, authorize(['ADMIN']), (req: AuthRequest, res) => {
  const { id } = req.params;
  db.prepare("UPDATE sessions SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
  res.json({ success: true });
});

// --- Voucher Management ---
app.post('/api/vouchers/upload', authenticate, upload.single('file'), (req: AuthRequest, res) => {
  const { session_id, type, shed_id } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  const id = Math.random().toString(36).substr(2, 9);
  db.prepare('INSERT INTO vouchers (id, session_id, filename, path, type, shed_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, session_id, file.originalname, file.path, type, shed_id || null);
  
  res.json({ success: true, id, filename: file.originalname });
});

app.delete('/api/sessions/:id', authenticate, (req: AuthRequest, res) => {
  const { id } = req.params;
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
  
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (req.user.role !== 'ADMIN' && session.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Permission denied' });
  }

  db.transaction(() => {
    db.prepare('DELETE FROM vouchers WHERE session_id = ?').run(id);
    db.prepare('DELETE FROM consumption_records WHERE session_id = ?').run(id);
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  })();
  
  res.json({ success: true });
});

app.get('/api/sessions/:id/vouchers', authenticate, (req, res) => {
  const vouchers = db.prepare('SELECT * FROM vouchers WHERE session_id = ?').all(req.params.id);
  res.json(vouchers);
});

// --- Legacy & Price Routes (adapted) ---
app.get("/api/prices", authenticate, (req, res) => {
  const prices = db.prepare("SELECT * FROM prices").all();
  res.json(prices.map((p: any) => ({ ...p, data: JSON.parse(p.data) })));
});

app.post("/api/prices", authenticate, authorize(['ADMIN']), (req, res) => {
  const { id, supplying_shed, month, year, periods, periodNames } = req.body;
  const data = JSON.stringify({ periods, periodNames });
  db.prepare("INSERT OR REPLACE INTO prices (id, supplying_shed, month, year, data) VALUES (?, ?, ?, ?, ?)")
    .run(id, supplying_shed, month, year, data);
  res.json({ success: true });
});

// --- Static / Vite ---
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
