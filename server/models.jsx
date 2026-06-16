import dayjs from 'dayjs'
import sqlite from 'sqlite3'

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

function Connection(id, lineName, stationA, stationB) {
  this.id = id;
  this.lineName = lineName;
  this.stationA = stationA;
  this.stationB = stationB;
}

function Event(id, description, coinModifier) {
  this.id = id;
  this.description = description;
  this.coinModifier = coinModifier;
}

function Game(id, userId, startStation, destinationStation, finalScore, status, date) {
  this.id = id;
  this.userId = userId;
  this.startStation = startStation;
  this.destinationStation = destinationStation;
  this.finalScore = finalScore;
  this.status = status;
  this.date = date;
}

export { User, Station, Line, Connection, Event, Game };