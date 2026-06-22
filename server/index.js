// imports
'use strict';

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import LocalStrategy from 'passport-local';
import morgan from "morgan";
import dotenv from 'dotenv';
dotenv.config();

import {verifyUserCredentials, getUserById, getAllLines, getAllStations, 
        getAllLineConnections, getAllEvents, getLeaderboardRankings, saveCompletedGame} from "./dao.js";
import db from "./db.js";

// init express
process.env.CLIENT_URL
process.env.SESSION_SECRET
const app = new express();
const port = process.env.PORT || 3001;

console.log("CLIENT_URL:", process.env.CLIENT_URL);
console.log("CLIENT_URL =", JSON.stringify(process.env.CLIENT_URL));

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8080"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

// middlewares
app.use(express.json());
app.use(morgan("dev"));


app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  console.log("Origin:", req.headers.origin);
  console.log("Allowed:", process.env.CLIENT_URL);
  next();
});

app.use((req, res, next) => {
  console.log("CLIENT_URL:", process.env.CLIENT_URL);
  console.log("REQUEST ORIGIN:", req.headers.origin);
  next();
});

passport.use(new LocalStrategy(async (username, password, cb) => {
  try {
    const user = await verifyUserCredentials(username, password);
    if (!user) return cb(null, false, { message: "Incorrect username or password." });
    return cb(null, user);
  } catch (err) {
    return cb(err);
  }
}));

passport.serializeUser((user, cb) => cb(null, user.id));
passport.deserializeUser(async (id, cb) => {
  try {
    const profile = await getUserById(id);
    cb(null, profile || false);
  } catch (err) {
    cb(err, null);
  }
});

const isLoggedIn = (req, res, next) => {
  if(req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({error: "Not authenticated"});
}

app.get('/health', async (req, res) => {
  try {
    db.get("SELECT 1", [], (err) => {
      if (err) return res.status(500).json({ status: "error" });

      res.status(200).json({
        status: "ok"
      });
    });
  } catch {
    res.status(500).json({
      status: "error"
    });
  }
});

process.on("SIGTERM", () => {
  console.log("Shutting down...");
  db.close(() => {
    process.exit(0);
  });
});

/* ROUTES */

// AUTHENTICATION ENDPOINTS 

app.post('/api/sessions', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || 'Login failed' });
    req.login(user, (err) => {
      if (err) return next(err);
      return res.json(user);
    });
  })(req, res, next);
});

app.delete('/api/sessions/current', (req, res) => {
  req.logout(() => res.json({ message: 'Logged out successfully.' }));
});

app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) return res.json(req.user);
  return res.status(401).json({ error: 'No active session' });
});


//  GET /api/network — full network (lines + stations + connections) for the Setup phase
app.get('/api/network', async (req, res) => {
  try {
    const lines = await getAllLines();
    const stations = await getAllStations();
    const connections = await getAllLineConnections();
    res.json({ lines, stations, connections });
  } catch(err) {
    res.status(500).json({ error: 'Failed to read network graphs.' });
  }
});

// GET /api/segments - Returns all unique, randomized adjacent segments for Planning phase
app.get('/api/segments', isLoggedIn, async (req, res) => {
  try {
    //retreive connections from db,  format : { lineId, stationId, stationName, position }
    const tracks = await getAllLineConnections();
    const lineGroups = {};
    
    // stored stations by line metro
    tracks.forEach(t => {
      if (!lineGroups[t.lineId]) lineGroups[t.lineId] = [];
      lineGroups[t.lineId].push(t);
    });

    // define unique kay for each segment to avoid duplicates
    const registeredKeys = new Set();
    const adjacentSegments = [];

    Object.values(lineGroups).forEach(stationRows => {

      // for each line, we define segment by taking the station at position i and the one following i+1
      for (let i = 0; i < stationRows.length - 1; i++) {
        const first = stationRows[i];
        const second = stationRows[i + 1];

      // we define keys with pair like '1-2' representing station index 1 and 2 that is unique event in another line if we have the same stations orders
        const identifierKey = [Math.min(first.stationId, second.stationId), Math.max(first.stationId, second.stationId)].join('-');
      
      // segment registration
        if (!registeredKeys.has(identifierKey)) {
          registeredKeys.add(identifierKey);
          adjacentSegments.push({
            station_a_id: first.stationId,
            station_a_name: first.stationName,
            station_b_id: second.stationId,
            station_b_name: second.stationName,
          });
        }
      }
    });

    // Randomize output order to satisfy planning difficulty constraints
    adjacentSegments.sort(() => Math.random() - 0.5);
    return res.json(adjacentSegments);
  } catch (err) {
    return res.status(500).json({ error: 'Could not resolve structural mapping segments.' });
  }
});

// POST /api/games/start - Resolves matching origin/target stations separated by minimum distance >= 3
app.post('/api/games/start', isLoggedIn, async (req, res) => {
  try {
    const stations = await getAllStations();
    const connections = await getAllLineConnections();
    
    const adjacencyList = {};
    stations.forEach(s => adjacencyList[s.id] = new Set());
    
    const lineGroups = {};
    connections.forEach(c => {
      if (!lineGroups[c.lineId]) lineGroups[c.lineId] = [];
      lineGroups[c.lineId].push(c.stationId);
    });

    Object.values(lineGroups).forEach(list => {
      for (let i = 0; i < list.length - 1; i++) {
        adjacencyList[list[i]].add(list[i + 1]);
        adjacencyList[list[i + 1]].add(list[i]);
      }
      //example : 
      // connection table : (line_id, station_id, position) 
      // Red Line: San Salvario - Porta Velaria - Vanchiglia - Lingotto, - Mercato Antico
                // [1, 1, 0],     [1, 2, 1],      [1, 3, 2],    [1, 4, 3], [1, 10, 4],   
      // after the for above  whe have
      //       adjacencyList = {
      //   1: Set { 2 },       // from  San Salvario (1), we can reach Porta Velaria (2)
      //   2: Set { 1, 3 },    // from  Porta Velaria (2), we can reach San Salvario (1) and Vanchiglia (3)
      //   3: Set { 2, 4 }     ...   
      //   4: set { 3, 10}     ...
      //  10: set { 4}         ...
      // };      
    });

    // Asynchronous breadth-first path calculator algorithm
    const calculateDistancesBfs = (rootId) => {

      // initialisation with a station from which we are going to calculate the distance to other linked stations
      const trackingMap = { [rootId]: 0 };
      const evaluationQueue = [rootId];

      while (evaluationQueue.length) {
        const active = evaluationQueue.shift();

        for (const link of adjacencyList[active]) {
          if (trackingMap[link] === undefined) {
            trackingMap[link] = trackingMap[active] + 1;
            evaluationQueue.push(link);
          }
        }
      }
      return trackingMap;

      // exemple of a trackingMap with rootId = 3 (Vanchiglia) ;  
      // [id station : distance from Vanchiglia]
      // 3: 0, start station
      // 2: 1, Lingotto
      // 4: 1, Porta Velaria
      // 1: 2,  San Salvario
      // 10: 2, Mercato Antico
    };

    // filter pairs of stations with distance between them >=3 
    const eligiblePairsList = [];
    stations.forEach(origin => {
      const distances = calculateDistancesBfs(origin.id);
      Object.entries(distances).forEach(([destinationId, stepsCount]) => {
        if (stepsCount >= 3 && Number(destinationId) !== origin.id) {
          eligiblePairsList.push({ startId: origin.id, endId: Number(destinationId) });
        }
      });
    });

    if (eligiblePairsList.length === 0) return res.status(500).json({ error: 'Network layout validation failure.' });
    

    // randomly select one pair 
    const choice = eligiblePairsList[Math.floor(Math.random() * eligiblePairsList.length)];
    return res.json({
      startStation: stations.find(s => s.id === choice.startId),
      endStation: stations.find(s => s.id === choice.endId)
    });
  } catch (err) {
    return res.status(500).json({ error: 'Could not initialize a new game context.' });
  }
});


// POST /api/games/submit - Runs custom path validations and returns simulation steps
app.post('/api/games/submit', isLoggedIn, async (req, res) => {
  const { route, startStationId, endStationId } = req.body;
  
  //console.log("0- submit start",  req.body)

  // body format check
  if (!Array.isArray(route) || typeof startStationId !== 'number' || typeof endStationId !== 'number') {
    return res.status(400).json({ error: 'Corrupt payload variables.' });
  }

  try {
    const rawTrackList = await getAllLineConnections();
    const networkTracks = {};
    const stationServingLines = {};
    //console.log("0- submit start 1 : ", stationServingLines)


    rawTrackList.forEach(t => {

      // station lists ordered by lines, usefull to extract adjacent segment
      if (!networkTracks[t.lineId]) networkTracks[t.lineId] = [];
      networkTracks[t.lineId].push({ stationId: t.stationId, position: t.position });
      
      // for each station, we store all lines passing through
      if (!stationServingLines[t.stationId]) stationServingLines[t.stationId] = new Set();
      stationServingLines[t.stationId].add(t.lineId);
    });
    //console.log("0- submit start 2: ", stationServingLines);

    // dynamic identification of intersection stations 
    // a station is a hub if more than one line pass through it.
    const crossOverHubs = new Set(
      Object.entries(stationServingLines).filter(([, lineIds]) => lineIds.size > 1).map(([sId]) => Number(sId))
    );
    //console.log("0- submit start 3: ", crossOverHubs)

    // Validate using helper logic sequence
    const checkValid = processRouteValidation(route, startStationId, endStationId, networkTracks, stationServingLines, crossOverHubs);
    //console.log("1- check Valid : ", checkValid)

    if (!checkValid) {

      // invalid path -> score =0 and game saved 
      await saveCompletedGame(req.user.id, startStationId, endStationId, 0);
      return res.json({ valid: false, score: 0, steps: [] });
    }

    // Execute random event outcomes per verified segment step
    const eventsPool = await getAllEvents();
    let currentWallet = 20;
    const processStepsLog = [];

    //console.log("2- check events : ", eventsPool)

    // train simulation path
    for (let i = 0; i < route.length - 1; i++) {

      //randomly select an event
      const selectedIncident = eventsPool[Math.floor(Math.random() * eventsPool.length)];
      currentWallet += selectedIncident.coinModifier;

      processStepsLog.push({
        fromStationId: route[i],
        toStationId: route[i + 1],
        event: { description: selectedIncident.description, effect: selectedIncident.coinModifier },
        coinsAfter: currentWallet
      });
    }
    // the score should not be less than 0 (put 0 is the final score <0) 
    const finalAccumulatedScore = Math.max(0, currentWallet);
    //console.log("3- finalScore : ", finalAccumulatedScore);

    // save the game
    await saveCompletedGame(req.user.id, startStationId, endStationId, finalAccumulatedScore);
    
    // send the result to the client
    return res.json({ valid: true, score: finalAccumulatedScore, steps: processStepsLog });
  } catch (err) {
    return res.status(500).json({ error: 'Internal scoring simulation crash.' });
    
  }
});

// GET /api/rankings - Fetches summarized profile leaderboards
app.get('/api/rankings', isLoggedIn, async (req, res) => {
  try {
    const generalLeaderboard = await getLeaderboardRankings();
    return res.json(generalLeaderboard);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load rankings.' });
  }
});

// conformity checks of results enter by the user during the game
function processRouteValidation(route, startId, endId, tracksByLine, linesPerStation, crossOverHubs) {
  if (!route || route.length < 2) return false;
  if (route[0] !== startId || route[route.length - 1] !== endId) return false;

  const segmentTrackMap = {};
  Object.entries(tracksByLine).forEach(([lineId, structuralArray]) => {
    structuralArray.sort((x, y) => x.position - y.position);

    // control physical linestations selected by the user
    for (let i = 0; i < structuralArray.length - 1; i++) {
      const nodeA = structuralArray[i].stationId;
      const nodeB = structuralArray[i + 1].stationId;
      const segmentStringKey = `${Math.min(nodeA, nodeB)}-${Math.max(nodeA, nodeB)}`;
      
      if (!segmentTrackMap[segmentStringKey]) segmentTrackMap[segmentStringKey] = new Set();
      segmentTrackMap[segmentStringKey].add(Number(lineId));
    }
  });

  // runningPermittedLines contains lines set on which the player is at time t
  let runningPermittedLines = linesPerStation[route[0]] ? new Set(linesPerStation[route[0]]) : new Set();

  for (let i = 0; i < route.length - 1; i++) {
    const stationA = route[i];
    const stationB = route[i + 1];
    const key = `${Math.min(stationA, stationB)}-${Math.max(stationA, stationB)}`;
    
    const segmentMatchingLines = segmentTrackMap[key];

    // if the segment selected by the user doesn't exist in our db, it means the stations are not adjacent, the road fails
    if (!segmentMatchingLines || segmentMatchingLines.size === 0) return false;

    // intersection calculations
    const overlappingLines = new Set([...runningPermittedLines].filter(l => segmentMatchingLines.has(l)));

    if (overlappingLines.size === 0) { // no common line 
      if (!crossOverHubs.has(stationA)) return false; // interchange is only possible on hubs stations
      runningPermittedLines = new Set(segmentMatchingLines);
    } else {
      runningPermittedLines = overlappingLines;
    }
  }

  // if each previous checks didn't return false the trip is valid
  return true;
}

// activate the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
