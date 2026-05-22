import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const db = new Database(dbPath);

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sheds (
    id TEXT PRIMARY KEY,
    shed_name TEXT NOT NULL,
    railway TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS supplying_sheds (
    id TEXT PRIMARY KEY,
    shed_name TEXT NOT NULL,
    railway TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('ADMIN', 'SHED_MANAGER')) NOT NULL,
    shed_id TEXT,
    supplying_shed_id TEXT,
    FOREIGN KEY(shed_id) REFERENCES sheds(id),
    FOREIGN KEY(supplying_shed_id) REFERENCES supplying_sheds(id)
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
    user_id TEXT NOT NULL,
    month TEXT NOT NULL,
    year TEXT NOT NULL,
    status TEXT CHECK(status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')) NOT NULL DEFAULT 'DRAFT',
    name TEXT,
    description TEXT,
    data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    approved_by TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(approved_by) REFERENCES users(id)
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

  CREATE TABLE IF NOT EXISTS vouchers (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    path TEXT NOT NULL,
    type TEXT CHECK(type IN ('SPECIFIC', 'COMMON')) NOT NULL,
    shed_id TEXT,
    FOREIGN KEY(session_id) REFERENCES sessions(id),
    FOREIGN KEY(shed_id) REFERENCES sheds(id)
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

// Seed initial Admin and Sheds if empty
const shedCount = db.prepare('SELECT COUNT(*) as count FROM sheds').get() as { count: number };
if (shedCount.count === 0) {
  const insertShed = db.prepare('INSERT INTO sheds (id, shed_name, railway) VALUES (?, ?, ?)');
  insertShed.run('CR_PUNE', 'PUNE', 'CR');
  insertShed.run('WR_VATVA', 'VATVA', 'WR');
  insertShed.run('SR_ERODE', 'ERODE', 'SR');
}

const supplyingShedCount = db.prepare('SELECT COUNT(*) as count FROM supplying_sheds').get() as { count: number };
if (supplyingShedCount.count === 0) {
  const insertSupplying = db.prepare('INSERT INTO supplying_sheds (id, shed_name, railway) VALUES (?, ?, ?)');
  insertSupplying.run('NR_TKD', 'Tughlakabad', 'NR');
  insertSupplying.run('CR_KURLA', 'Kurla', 'CR');
  insertSupplying.run('WR_RTM', 'Ratlam', 'WR');
}

const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)').run(
    Math.random().toString(36).substr(2, 9),
    'admin',
    hashedPassword,
    'ADMIN'
  );
  
  // Seed a manager for Pune
  const managerPassword = bcrypt.hashSync('pune123', 10);
  db.prepare('INSERT INTO users (id, username, password, role, shed_id) VALUES (?, ?, ?, ?, ?)').run(
    Math.random().toString(36).substr(2, 9),
    'manager_pune',
    managerPassword,
    'SHED_MANAGER',
    'CR_PUNE'
  );
}

export default db;
