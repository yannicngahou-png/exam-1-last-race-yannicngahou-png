'use strict';

const BASE_URL = 'http://localhost:3001/api';

// fucntion used to simplify api requests
async function request(url, method = 'GET', body = null) {
  const options = {
    method,
    headers: {},
  };

  // usefull for transmitting and receiving session Passport cookies
  options.credentials = 'include';

  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${url}`, options);
  
  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.error || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}



const API = {
  // Authentication
  login: async (username, password) => {
    return request('/sessions', 'POST', { username, password });
  },

  logout: async () => {
    return request('/sessions/current', 'DELETE');
  },

  getCurrentUser: async () => {
    return request('/sessions/current');
  },

  // Game Infrastructure
  getNetwork: async () => {
    return request('/network');
  },

  getSegments: async () => {
    return request('/segments');
  },

  startGame: async () => {
    return request('/games/start', 'POST');
  },

  submitRoute: async (route, startStationId, endStationId) => {
    return request('/games/submit', 'POST', { route, startStationId, endStationId });
  },

  getRankings: async () => {
    return request('/rankings');
  }
};

export default API;