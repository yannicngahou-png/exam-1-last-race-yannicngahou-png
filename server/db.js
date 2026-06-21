'use strict';

import sqlite3 from 'sqlite3';
import crypto from "crypto";


// Connexion to the lastRace database
const db = new sqlite3.Database("lastRace.sqlite", (err) => {
 if (err) console.error("Error opening SQLite database file:", err.message);
});

// Tables creation
db.serialize(() => {

  // Users Table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT NOT NULL,
    salt TEXT NOT NULL
  )`);

  //  Stations Table (min 12 )
  db.run(`CREATE TABLE IF NOT EXISTS stations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`);

  //  Lines Table (min 4 )
  db.run(`CREATE TABLE IF NOT EXISTS lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`);

  //  Connections (between stations) Table 
  db.run(`CREATE TABLE IF NOT EXISTS connections (
    line_id INTEGER NOT NULL,
    station_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    PRIMARY KEY (line_id, station_id),
    FOREIGN KEY (line_id) REFERENCES lines(id),
    FOREIGN KEY (station_id) REFERENCES stations(id)
  )`);

  // Events Tables
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT,
    coin_modifier INTEGER NOT NULL CHECK(coin_modifier BETWEEN -4 AND 4)
  )`);

  // game results table
  db.run(`CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    start_station_id INTEGER NOT NULL,
    end_station_id INTEGER NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (start_station_id) REFERENCES stations(id),
    FOREIGN KEY (end_station_id) REFERENCES stations(id)
  )`);

  // Seed only if empty
  db.get('SELECT COUNT(*) as c FROM lines', [], (err, row) => {
    if (err) {
      console.error("Erreur lors du comptage des lignes :", err.message);
      return;
    }

  if (row && row.c === 0) { // if db is empty
    console.log('Database seeding initialisation...');
  // ## user initialisation ##

    // users definition
    const users = [
      { id: 1, username: 'Yannick', password: 'ynnck' },
      { id: 2, username: 'Silvia', password: 'slv' },
      { id: 3, username: 'Borel', password: 'brl' },
    ];

    // users insertion 
    users.forEach(u => {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.scryptSync(u.password, salt, 64).toString('hex');
      db.run('INSERT INTO users (id, username, password, salt) VALUES (?, ?, ?, ?)', [u.id, u.username, hash, salt]);
      });

    // ## Stations initialisation ##

    const stationNames = [
    { id: 1, name: 'San Salvario' },
    { id: 2, name: 'Porta Velaria' },
    { id: 3, name: 'Vanchiglia' },
    { id: 4, name: 'Lingotto' },
    { id: 5, name: 'Fontana Oscura' },
    { id: 6, name: 'Borgo Sereno' },
    { id: 7, name: 'Borgo Po' },
    { id: 8, name: 'Torre Cinerea' },
    { id: 9, name: 'Crocetta' },
    { id: 10, name: 'Mercato Antico' },
    { id: 11, name: 'Aurora' },
    { id: 12, name: 'Ponte Aureo' },
    { id: 13, name: 'Quartiere Vecchio' },
    { id: 14, name: 'Bellavista' }
  ];
    stationNames.forEach(s => db.run('INSERT INTO stations (id, name) VALUES (?, ?)', [s.id, s.name]));

    // ## Lines initialisation ##
    const lines = [
      { id: 1, name: 'Red Line' },
      { id: 2, name: 'Blue Line' },
      { id: 3, name: 'Green Line' },
      { id: 4, name: 'Yellow Line' },
      // { id: 5, name: 'Orange Line' }
    ];
    lines.forEach(l => db.run('INSERT INTO lines (id, name) VALUES (?, ?)', [l.id, l.name]));
  

    // ## Connections initialisation ##

    setTimeout(() => {
          // Build map linkages directly resolving static lookup positions
          const lineConnections = [
            // Red Line: San Salvario - Porta Velaria - Vanchiglia - Lingotto, - Mercato Antico
            [1, 1, 0], [1, 2, 1], [1, 3, 2], [1, 4, 3], [1, 10, 4],

            // Blue Line : San Salvario - Fontana Oscura - Borgo Sereno - Borgo Po - Bellavista
            [2, 1, 0], [2, 5, 1], [2, 6, 2], [2, 7, 3], [2, 14, 4],

            // Green Line : Porta Velaria - Vanchiglia - Crocetta - Ponte Aureo - Aurora
            [3, 2, 0], [3, 3, 1], [3, 9, 2], [3, 12, 3], [3, 11, 4],

            // Yellow Line : Lingotto - Torre Cinerea - Crocetta - Borgo Po - Quartiere Vecchio
            [4, 4, 0], [4, 8, 1], [4, 9, 2], [4, 7, 3], [4, 13, 4],

            // Orange Line : Mercato Antico - Aurora - Ponte Aureo - Bellavista - Vanchiglia
            // [5, 10, 0], [5, 11, 1], [5, 12, 2], [5, 14, 3], [5, 3, 4]
          ];
          lineConnections.forEach(([lId, sId, pos]) => {
            db.run('INSERT INTO connections (line_id, station_id, position) VALUES (?, ?, ?)', [lId, sId, pos]);
          })
      

    // ## Events initialisation ##
  
    const events = [
      ['Quiet journey', 0],
      ['Wrong platform', -2],
      ['Kind passenger helped you find the way', 1],
      ['Train delayed, a coffee offered', 1],
      ['Pickpocket! ', -3],
      ['Found a lost wallet and returned it', 3],
      ['Dropped your train ticket', -4],
      ['Express service, arrived ahead of schedule', 2],
      ['Thrown trash on the ground', -1],
      ['Meet a friend to pass the time', 1],
    ];
    events.forEach(([desc, coin_modifier]) => db.run('INSERT INTO events (description, coin_modifier) VALUES (?, ?)', [desc, coin_modifier]));

    // ## Seed some games for users Yannick and Borel ##

    setTimeout(() => {
            db.run('INSERT INTO games (user_id, start_station_id, end_station_id, score, completed_at) VALUES (1, 1, 9, 18, "2026-06-11 10:00:00")');
            db.run('INSERT INTO games (user_id, start_station_id, end_station_id, score, completed_at) VALUES (1, 2, 11, 12, "2026-06-12 11:00:00")');
            db.run('INSERT INTO games (user_id, start_station_id, end_station_id, score, completed_at) VALUES (1, 5, 10, 22, "2026-06-13 09:00:00")');
            db.run('INSERT INTO games (user_id, start_station_id, end_station_id, score, completed_at) VALUES (2, 1, 12, 15, "2026-06-18 14:00:00")');
            db.run('INSERT INTO games (user_id, start_station_id, end_station_id, score, completed_at) VALUES (2, 6, 3, 9, "2026-06-14 16:00:00")');
            console.log('Database seeded successfully.');
          }, 3);
    }, 3);
  }
 });
 });

export default db;