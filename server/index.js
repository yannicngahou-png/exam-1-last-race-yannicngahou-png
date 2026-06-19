// imports
'use strict';

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import LocalStrategy from 'passport-local';
import morgan from "morgan";

import {verifyUserCredentials, getUserById, getAllLines, getAllStations, 
        getAllLineConnections, getAllEvents, getLeaderboardRankings, saveCompletedGame} from "./dao.js";
import db from "./db.js";

// init express
const app = new express();
const port = 3001;

// middlewares
app.use(express.json());
app.use(morgan("dev"));

app.use(cors({
  origin: 'http://localhost:5173', 
  credentials: true                
}));

app.use(session({
  secret: "LastRace game!",
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());


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

// PUBLIC INFRASTRUCTURE ENDPOINTS

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

// GET /api/segments - Returns all unique, randomized adjacent tracks for Planning phase
app.get('/api/segments', isLoggedIn, async (req, res) => {
  try {
    const tracks = await getAllLineConnections();
    const lineGroups = {};
    
    tracks.forEach(t => {
      if (!lineGroups[t.lineId]) lineGroups[t.lineId] = [];
      lineGroups[t.lineId].push(t);
    });

    const registeredKeys = new Set();
    const adjacentSegments = [];

    Object.values(lineGroups).forEach(stationRows => {
      for (let i = 0; i < stationRows.length - 1; i++) {
        const first = stationRows[i];
        const second = stationRows[i + 1];
        const identifierKey = [Math.min(first.stationId, second.stationId), Math.max(first.stationId, second.stationId)].join('-');
        
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
    });

    // Asynchronous breadth-first path calculator algorithm
    const calculateDistancesBfs = (rootId) => {
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
    };

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
    
    const choice = eligiblePairsList[Math.floor(Math.random() * eligiblePairsList.length)];
    return res.json({
      startStation: stations.find(s => s.id === choice.startId),
      endStation: stations.find(s => s.id === choice.endId)
    });
  } catch (err) {
    return res.status(500).json({ error: 'Could not initialize a new game context.' });
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

function processRouteValidation(route, startId, endId, tracksByLine, linesPerStation, crossOverHubs) {
  if (!route || route.length < 2) return false;
  if (route[0] !== startId || route[route.length - 1] !== endId) return false;

  const segmentTrackMap = {};
  Object.entries(tracksByLine).forEach(([lineId, structuralArray]) => {
    structuralArray.sort((x, y) => x.position - y.position);
    for (let i = 0; i < structuralArray.length - 1; i++) {
      const nodeA = structuralArray[i].stationId;
      const nodeB = structuralArray[i + 1].stationId;
      const segmentStringKey = `${Math.min(nodeA, nodeB)}-${Math.max(nodeA, nodeB)}`;
      
      if (!segmentTrackMap[segmentStringKey]) segmentTrackMap[segmentStringKey] = new Set();
      segmentTrackMap[segmentStringKey].add(Number(lineId));
    }
  });


  let runningPermittedLines = linesPerStation[route[0]] ? new Set(linesPerStation[route[0]]) : new Set();

  for (let i = 0; i < route.length - 1; i++) {
    const stationA = route[i];
    const stationB = route[i + 1];
    const key = `${Math.min(stationA, stationB)}-${Math.max(stationA, stationB)}`;
    
    const segmentMatchingLines = segmentTrackMap[key];
    if (!segmentMatchingLines || segmentMatchingLines.size === 0) return false;

    const overlappingLines = new Set([...runningPermittedLines].filter(l => segmentMatchingLines.has(l)));

    if (overlappingLines.size === 0) {
      if (!crossOverHubs.has(stationA)) return false;
      runningPermittedLines = new Set(segmentMatchingLines);
    } else {
      runningPermittedLines = overlappingLines;
    }
  }
  return true;
}

// activate the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
