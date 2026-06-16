import sqlite3 from 'sqlite3';

// Connexion to the lastRace database
const db = new sqlite3.Database('lastRace.sqlite', (err) => {
  if (err) throw err;
});

// Tables creation
db.serialize(() => {

  // Users Table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  //  Stations Table (min 12 )
  db.run(`CREATE TABLE IF NOT EXISTS stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT PRIMARY KEY,
    is_interchange INTEGER DEFAULT 0
  )`);

  //  Lines Table (min 4 )
  db.run(`CREATE TABLE IF NOT EXISTS lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT PRIMARY KEY
  )`);

  //  Connexions (between stations) Table 
  db.run(`CREATE TABLE IF NOT EXISTS connections (
    line_name TEXT,
    station_a TEXT,
    station_b TEXT,
    FOREIGN KEY(line_name) REFERENCES lines(name),
    FOREIGN KEY(station_a) REFERENCES stations(name),
    FOREIGN KEY(station_b) REFERENCES stations(name)
  )`);

  // Events Tables
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT,
    coin_modifier INTEGER
  )`);

  // game results table
  db.run(`CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    start_station TEXT,
    destination_station TEXT,
    final_score INTEGER,
    status TEXT,
    date TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

});


export default db;