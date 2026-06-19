import React from 'react';
import { Container, Button, Card, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function HomePage() {
  const { user } = useAuth();

  return (
    <Container className="py-5">
      <div className="text-center mb-5">
        <h1 style={{ color: '#d64316', fontSize: '3rem', fontWeight: 900 }}>🚇 Last Race</h1>
        <p className="lead" style={{ color: '#e2e7ee' }}>
          Navigate the underground before time runs out.
        </p>
        {user ? (
          <Button as={Link} to="/game" className="btn-metro px-5 py-2 mt-2" size="lg">
            Play Now
          </Button>
        ) : (
          <Button as={Link} to="/login" className="btn-metro px-5 py-2 mt-2" size="lg">
            Login to Play
          </Button>
        )}
      </div>

      <Row className="g-4 mb-5">
        <Col md={4}>
          <Card className="h-100 p-3 text-center">
          
            <h5 className="mt-2" style={{ color: '#d64316' }}>Setup</h5>
            <p className="small text-secondary">
              Study the full network map, all stations, lines, and connections, before the challenge begins.
            </p>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 p-3 text-center">
            
            <h5 className="mt-2" style={{ color: '#d64316' }}>Planning</h5>
            <p className="small text-secondary">
              You have <strong>90 seconds</strong> and only a list of segments to reconstruct the map mentally and plan a valid route
              from your start to your destination.
            </p>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="h-100 p-3 text-center">
            
            <h5 className="mt-2" style={{ color: '#d64316' }}>Execution</h5>
            <p className="small text-secondary">
              Each step triggers a random event, you might gain or lose coins. Reach your destination with the most coins to top the rankings!
            </p>
          </Card>
        </Col>
      </Row>

      <Card className="p-4">
        <h4 style={{ color: '#d64316' }}> How to play</h4>
        <ul className="text-secondary">
          <li>You start with <strong>20 coins</strong> each game.</li>
          <li>You are assigned a random <strong>start</strong> and <strong>destination</strong> station.</li>
          <li>Your route must follow metro lines, you can only change lines at <strong>interchange stations</strong>.</li>
          <li>Submit your route before the timer runs out or the route built so far will be used.</li>
          
        </ul>
        {!user && (
          <p className="text-warning mt-2">
            🔒 You must be logged in to see the network map and play the game.
          </p>
        )}
      </Card>
    </Container>
  );
}

export {HomePage}