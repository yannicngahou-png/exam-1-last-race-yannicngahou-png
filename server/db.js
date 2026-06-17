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
    password TEXT NOT NULL,
    salt TEXT NOT NULL
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

// Seed only if empty
const lineCount = db.prepare('SELECT COUNT(*) as c FROM lines').get().c;
if (lineCount === 0) { // if db is empty

// ## user initialisation ##
  const insertUser = db.prepare('INSERT INTO users (username, password_hash, salt) VALUES (?, ?, ?)');
  
  // password crypting
  const makeHash = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { hash, salt };
  };

  // users definition
  const users = [
    { username: 'Yannick', password: 'webapp1' },
    { username: 'Borel', password: 'brl' },
    { username: 'Silvia', password: 'slv' },
  ];

  // users insertion 
  const userIds = {};
  for (const u of users) {
    const { hash, salt } = makeHash(u.password);
    const res = insertUser.run(u.username, hash, salt);
    userIds[u.username] = res.lastInsertRowid;
  }

  // ## Stations initialisation ##
  const insertStation = db.prepare('INSERT INTO stations (name) VALUES (?, ?)');
  const stationNames = [
    ['Centrale', 0], ['Porta Velaria', 1], ['Quartiere Vecchio', 0], ['Lingotto', 0],
    ['Fontana Oscura', 0], ['Borgo Sereno', 0], ['Santa Rita', 0], ['Torre Cinerea', 1],
    ['Bellavista', 0], ['Mercato Antico', 0], ['Aurora', 1], ['Ponte Aureo'], 
    ['Crocetta', 0], ['Vanchiglia', 1], ['Borgo Po', 0], ['San Salvario', 0]
  ];
  const stationIds = {};
  for (const s of stationNames) {
    const res = insertStation.run(s);
    stationIds[s] = res.lastInsertRowid;
  }

  // ## Lines initialisation ##
  const insertLine = db.prepare('INSERT INTO lines (name) VALUES (?)');
  const lines = ['Red Line', 'Blue Line', 'Green Line', 'Yellow Line', 'Orange Line'];
  const lineIds = {};
  for (const l of lines) {
    const res = insertLine.run(l);
    lineIds[l] = res.lastInsertRowid;
  }

  // ## Connections initialisation ##
  // Line-station connections (position = order on the line)
  const insertLS = db.prepare('INSERT INTO connections (line_id, station_id, position) VALUES (?, ?, ?)');

  // Red Line: Centrale - Porta Velaria - Aurora - Lingotto - Mercato Antico
  [['Centrale',0],['Porta Velaria',1],['Aurora',2],['Lingotto',3],['Mercato Antico',4]].forEach(([s,p]) =>
    insertLS.run(lineIds['Red Line'], stationIds[s], p));

  // Blue Line: Centrale - Fontana Oscura - Borgo Sereno - Vanchiglia - San Salvario
  [['Centrale',0],['Fontana Oscura',1],['Borgo Sereno',2],['Vanchiglia',3],['San Salvario',4]].forEach(([s,p]) =>
    insertLS.run(lineIds['Blue Line'], stationIds[s], p));

  // Green Line: Porta Velaria - Fontana Oscura - Torre Cinerea - Borgo Po - Ponte Aureo
  [['Porta Velaria',0],['Fontana Oscura',1],['Torre Cinerea',2],["Borgo Po",3],['Ponte Aureo',4]].forEach(([s,p]) =>
    insertLS.run(lineIds['Green Line'], stationIds[s], p));

  // Yellow Line: Lingotto - Torre Cinerea - Vanchiglia - Borgo Po - Quartiere Vecchio
  [['Lingotto',0],['Torre Cinerea',1],['Vanchiglia',2],["Borgo Po",3],['Quartiere Vecchio',4]].forEach(([s,p]) =>
    insertLS.run(lineIds['Yellow Line'], stationIds[s], p));

  // Orange Line: Mercato Antico - San Salvario - Ponte Aureo - Aurora - Bellavista
  [['Mercato Antico',0],['San Salvario',1],['Ponte Aureo',2],['Aurora',3], ['Bellavista',4]].forEach(([s,p]) =>
    insertLS.run(lineIds['Orange Line'], stationIds[s], p));

  // ## Events initialisation ##
  const insertEvent = db.prepare('INSERT INTO events (description, effect) VALUES (?, ?)');
  const events = [
    ['Quiet journey', 0],
    ['Wrong platform', -2],
    ['Kind passenger helped you find the way', 1],
    ['Train delayed, a coffee offered', 1],
    ['Pickpocket! Watch your belongings!', -3],
    ['Found a lost wallet and returned it  reward!', 3],
    ['Dropped your train ticket', -4],
    ['Express service, arrived ahead of schedule', 2],
    ['Thrown trash on the ground', -1],
    ['Meet a friend to pass the time', 1],
  ];
  for (const [desc, effect] of events) insertEvent.run(desc, effect);

  // ## Seed some games for users Yannick and Borel ##

  const insertGame = db.prepare('INSERT INTO games (user_id, start_station_id, end_station_id, score, completed_at) VALUES (?, ?, ?, ?, ?)');
  insertGame.run(userIds['Yannick'], stationIds['Centrale'], stationIds["Bellavista"], 18, '2026-06-01 10:00:00');
  insertGame.run(userIds['Yannick'], stationIds['Porta Velaria'], stationIds['Quartiere Vecchio'], 12, '2026-05-02 11:00:00');
  insertGame.run(userIds['Yannick'], stationIds['Lingotto'], stationIds['Ponte Aureo'], 22, '2026-06-03 09:00:00');
  insertGame.run(userIds['Borel'], stationIds['Centrale'], stationIds['Mercato Antico'], 15, '2026-06-11 14:00:00');
  insertGame.run(userIds['Borel'], stationIds['Borgo Sereno'], stationIds['Quartiere Vecchio'], 9, '2026-06-14 16:00:00');

  console.log('Database seeded successfully.');


}


export default db;