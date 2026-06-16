import db from './db.js';
import { User, Station, Line, Connection, Event, Game } from './models.jsx';


// retrieve the users for authentification
export function getUser(username, password) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.get(sql, [username, password], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// retrieve the entire network Stations
function getStations() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM stations', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// retrieve lines and their corresponding connexions
function getNetworkConnections() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM connections', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

export{getUser, getStations, getNetworkConnections}