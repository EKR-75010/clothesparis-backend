const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || './db/clothesparis.db';

let _db = null;

function getDb() {
  if (!_db) {
    _db = new Database(path.resolve(DB_PATH));
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

module.exports = { getDb };
