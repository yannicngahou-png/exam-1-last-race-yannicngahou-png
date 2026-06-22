import { useEffect, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Row, Col, } from 'react-bootstrap';
import { useAuth } from '../context/authContext.jsx';

function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      navigate('/game');
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5 d-flex justify-content-center">
      <Card style={{ width: 380 }} className="p-4">
        <h3 className="mb-4 text-center" style={{ color: '#d64316' }}>🚇 Login</h3>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Username</Form.Label>
            <Form.Control
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              autoFocus
              style={{ background: '#1a1a2e', color: '#edf2f4', borderColor: '#2a2a4a' }}
            />
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{ background: '#1a1a2e', color: '#edf2f4', borderColor: '#2a2a4a' }}
            />
          </Form.Group>
          <Button type="submit" className="btn-metro w-100" disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </Button>
        </Form>
      </Card>
    </Container>
  );
}

export {LoginPage}
