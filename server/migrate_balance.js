import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || join(__dirname, 'database.sqlite');

const db = new Database(dbPath);

try {
  console.log('Adding balance column to users table...');
  db.exec(`ALTER TABLE users ADD COLUMN balance REAL DEFAULT 0`);
  console.log('✅ Migration successful!');
} catch (error) {
  if (error.message.includes('duplicate column')) {
    console.log('⚠️  Column balance already exists, skipping.');
  } else {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

db.close();
