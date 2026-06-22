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
      .then(res => {
        //console.log("Data received from API :", res);
        setRankings(res)
      }).catch(err => setError(err.message)); 
    },[]);

  return (
    <Container className="py-5" style={{ maxWidth: 600 }}>
      <h2 className="mb-4" style={{ color: '#d64316' }}>🏆 General Rankings</h2>
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
                  {row.username}
                </td>
                <td>
                  <span >{row.bestScore}</span>
                  <small className="text-secondary ms-1">coins</small>
                </td>
                <td>{row.gamesPlayed}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
}

export {RankingsPage} 