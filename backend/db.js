const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./roi.db');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE,
      data TEXT
    )
  `);
});

module.exports = db;
