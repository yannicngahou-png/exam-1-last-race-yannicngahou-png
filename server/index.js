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



// activate the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
