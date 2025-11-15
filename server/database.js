import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || join(__dirname, 'database.sqlite');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize database schema
function initDatabase() {
  // Users table (synced from Hub)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      hub_user_id INTEGER UNIQUE NOT NULL,
      username TEXT NOT NULL,
      email TEXT,
      discord_id TEXT,
      google_id TEXT,
      steam_id TEXT,
      discord_avatar TEXT,
      google_avatar TEXT,
      is_admin BOOLEAN DEFAULT 0,
      premium INTEGER DEFAULT 0,
      balance REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Lots table
  db.exec(`
    CREATE TABLE IF NOT EXISTS lots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      starting_price REAL NOT NULL DEFAULT 0,
      current_price REAL,
      min_step REAL NOT NULL DEFAULT 1,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      vip_only BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      scheduled_start DATETIME,
      started_at DATETIME,
      ends_at DATETIME,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'ended', 'cancelled')),
      winner_id INTEGER,
      creator_id INTEGER NOT NULL,
      FOREIGN KEY (winner_id) REFERENCES users(id),
      FOREIGN KEY (creator_id) REFERENCES users(id)
    )
  `);

  // Add scheduled_start column if it doesn't exist (migration)
  try {
    db.exec(`ALTER TABLE lots ADD COLUMN scheduled_start DATETIME`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Add vip_only column if it doesn't exist (migration)
  try {
    db.exec(`ALTER TABLE lots ADD COLUMN vip_only BOOLEAN DEFAULT 0`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Bids table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lot_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lot_id) REFERENCES lots(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Sessions table (for express-session with better-sqlite3-session-store)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      expires INTEGER NOT NULL,
      data TEXT
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_hub_id ON users(hub_user_id);
    CREATE INDEX IF NOT EXISTS idx_lots_status ON lots(status);
    CREATE INDEX IF NOT EXISTS idx_lots_ends_at ON lots(ends_at);
    CREATE INDEX IF NOT EXISTS idx_bids_lot_id ON bids(lot_id);
    CREATE INDEX IF NOT EXISTS idx_bids_user_id ON bids(user_id);
  `);
}

// Initialize on import
initDatabase();

// User queries
export const userQueries = {
  findByHubId: db.prepare('SELECT * FROM users WHERE hub_user_id = ?'),
  findById: db.prepare('SELECT * FROM users WHERE id = ?'),
  create: db.prepare(`
    INSERT INTO users (hub_user_id, username, email, discord_id, google_id, steam_id, discord_avatar, google_avatar, is_admin, premium, balance)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  update: db.prepare(`
    UPDATE users
    SET username = ?, email = ?, discord_id = ?, google_id = ?, steam_id = ?,
        discord_avatar = ?, google_avatar = ?, is_admin = ?, premium = ?, balance = ?, updated_at = CURRENT_TIMESTAMP
    WHERE hub_user_id = ?
  `),
  getAll: db.prepare('SELECT * FROM users ORDER BY created_at DESC')
};

// Lot queries
export const lotQueries = {
  findById: db.prepare('SELECT * FROM lots WHERE id = ?'),
  getAll: db.prepare('SELECT * FROM lots ORDER BY created_at DESC'),
  getActive: db.prepare(`
    SELECT * FROM lots
    WHERE status = 'active' AND ends_at > ?
    ORDER BY ends_at ASC
  `),
  getByStatus: db.prepare('SELECT * FROM lots WHERE status = ? ORDER BY created_at DESC'),
  create: db.prepare(`
    INSERT INTO lots (title, description, image_url, starting_price, min_step, duration_minutes, vip_only, scheduled_start, creator_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  update: db.prepare(`
    UPDATE lots
    SET title = ?, description = ?, image_url = ?, starting_price = ?, min_step = ?, vip_only = ?, scheduled_start = ?
    WHERE id = ?
  `),
  updateStatus: db.prepare('UPDATE lots SET status = ? WHERE id = ?'),
  start: db.prepare(`
    UPDATE lots
    SET status = 'active', started_at = ?, ends_at = ?
    WHERE id = ?
  `),
  updateCurrentPrice: db.prepare('UPDATE lots SET current_price = ? WHERE id = ?'),
  setWinner: db.prepare("UPDATE lots SET winner_id = ?, status = 'ended' WHERE id = ?"),
  extendTime: db.prepare(`
    UPDATE lots
    SET ends_at = datetime(ends_at, '+10 seconds')
    WHERE id = ?
  `),
  delete: db.prepare('DELETE FROM lots WHERE id = ?')
};

// Bid queries
export const bidQueries = {
  findById: db.prepare('SELECT * FROM bids WHERE id = ?'),
  getByLot: db.prepare(`
    SELECT b.*, u.username, u.discord_avatar, u.google_avatar
    FROM bids b
    JOIN users u ON b.user_id = u.id
    WHERE b.lot_id = ?
    ORDER BY b.created_at DESC
  `),
  getByUser: db.prepare('SELECT * FROM bids WHERE user_id = ? ORDER BY created_at DESC'),
  create: db.prepare(`
    INSERT INTO bids (lot_id, user_id, amount)
    VALUES (?, ?, ?)
  `),
  delete: db.prepare('DELETE FROM bids WHERE id = ?'),
  getHighestBid: db.prepare(`
    SELECT b.*, u.username
    FROM bids b
    JOIN users u ON b.user_id = u.id
    WHERE b.lot_id = ?
    ORDER BY b.amount DESC, b.created_at ASC
    LIMIT 1
  `)
};

export default db;
