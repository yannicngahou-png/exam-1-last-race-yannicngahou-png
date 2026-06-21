import React, { useEffect, useState } from 'react';
import { Container, Table, Spinner, Alert } from 'react-bootstrap';
import { useAuth } from '../context/authContext.jsx';
import API from '../api/api.js';

function RankingsPage() {
  const { user } = useAuth();
  const [rankings, setRankings] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    API.getRankings()
      .then(setRankings)
      .catch(err => setError(err.message));
  }, []);

  return (
    <Container className="py-5" style={{ maxWidth: 600 }}>
      <h2 className="mb-4" style={{ color: '#f4a261' }}>🏆 General Rankings</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      {!rankings ? (
        <div className="text-center"><Spinner animation="border" variant="warning" /></div>
      ) : (
        <Table className="ranking-table" bordered hover variant="dark">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Best Score</th>
              <th>Games Played</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((row, i) => (
              <tr key={row.username} className={row.username === user?.username ? 'ranking-row-me' : ''}>
                <td>{i + 1}</td>
                <td>
                  {row.username === user?.username ? '⭐ ' : ''}{row.username}
                </td>
                <td>
                  <span className="coin-badge">{row.best_score}</span>
                  <small className="text-secondary ms-1">coins</small>
                </td>
                <td>{row.games_played}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
}

export {RankingsPage} 