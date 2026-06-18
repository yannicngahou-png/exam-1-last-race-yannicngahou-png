import db from './db.js';
import crypto from 'crypto';
import { User, Station, Line, Connection, Event, RankingEntry } from './models.js';

// retrieve the users for authentification
function verifyUserCredentials(username, password) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM users WHERE username = ?';
    db.get(sql, [username], (err, row) => {
      if (err) reject(err);
      
      
      if (!row){
        return resolve(false);
      } 

      const computedHash = crypto.scryptSync(password, row.salt, 64).toString('hex');
      if (computedHash !== row.password) {
        return resolve(false);
      }

      return resolve(new User(row.id, row.username));
    });
  });
}

// Automatically fetch an active user by checking identity mapping records
function getUserById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, username FROM users WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(null);
      return resolve(new User(row.id, row.username));
    });
  });
}

// Collects structural map lines from dataset
function getAllLines() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, name FROM lines', [], (err, rows) => {
      if (err) return reject(err);
      return resolve(rows.map(r => new Line(r.id, r.name)));
    });
  });
}

// retrieve all stations
function getAllStations() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, name FROM stations', [], (err, rows) => {
      if (err) return reject(err);
      return resolve(rows.map(r => new Station(r.id, r.name)));
    });
  });
}

// retrieve lines and their corresponding connexions
function getAllLineConnections() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT cn.line_id, cn.station_id, cn.position, l.name AS line_name, s.name AS station_name
      FROM connections cn
      JOIN lines l ON l.id = cn.line_id
      JOIN stations s ON s.id = cn.station_id
      ORDER BY cn.line_id, cn.position`;
    db.all(query, [], (err, rows) => {
      if (err) return reject(err);
      return resolve(rows.map(r => new Connection(r.line_id, r.station_id, r.position, r.line_name, r.station_name)));
    });
  });
}

// returns complete pool of available segment events
function getAllEvents() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, description, coin_modifier FROM events', [], (err, rows) => {
      if (err) return reject(err);
      return resolve(rows.map(r => new Event(r.id, r.description, r.coin_modifier)));
    });
  });
}

// at the end of the game, and store it in the db
function getLeaderboardRankings() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT u.username, MAX(g.score) AS best_score, COUNT(g.id) AS games_played
      FROM games g
      JOIN users u ON u.id = g.user_id
      GROUP BY u.id
      ORDER BY best_score DESC`;
    db.all(query, [], (err, rows) => {
      if (err) return reject(err);
      return resolve(rows.map(r => new RankingEntry(r.username, r.best_score, r.games_played)));
    });
  });
}

// getting the game list by user
function saveCompletedGame(userId, startStationId, endStationId, finalScore) {
  return new Promise((resolve, reject) => {
    const query = 'INSERT INTO games (user_id, start_station_id, end_station_id, score) VALUES (?, ?, ?, ?)';
    db.run(query, [userId, startStationId, endStationId, finalScore], function(err) {
      if (err) return reject(err);
      return resolve(this.lastID);
    });
  });
}

export{verifyUserCredentials, getUserById, getAllLines, getAllStations, getAllLineConnections, getAllEvents, getLeaderboardRankings, saveCompletedGame}