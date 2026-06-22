'use strict';

function User(id, username, password) {
  this.id = id;
  this.username = username;
  this.password = password;
}

function Station(id, name, isInterchange) {
  this.id = id;
  this.name = name;
  this.isInterchange = isInterchange === 1 || isInterchange === true; 
}

function Line(id, name) {
  this.id = id;
  this.name = name;
}

function Connection(lineId, stationId, position, lineName, stationName) {
  this.lineId = lineId;
  this.stationId = stationId;
  this.position = position;
  this.lineName = lineName;
  this.stationName = stationName;
}

function Event(id, description, coinModifier) {
  this.id = id;
  this.description = description;
  this.coinModifier = coinModifier;
}

function RankingEntry(username, bestScore, gamesPlayed) {
  this.username = username;
  this.bestScore = bestScore;
  this.gamesPlayed = gamesPlayed;
}

// function Game(id, userId, startStation, destinationStation, finalScore, status, date) {
//   this.id = id;
//   this.userId = userId;
//   this.startStation = startStation;
//   this.destinationStation = destinationStation;
//   this.finalScore = finalScore;
//   this.status = status;
//   this.date = date;
// }

export { User, Station, Line, Connection, Event, RankingEntry };