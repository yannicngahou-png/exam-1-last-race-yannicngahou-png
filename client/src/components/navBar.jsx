import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { useAuth } from '../context/authContext'; 

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <Navbar expand="lg" style={{ background: '#0f172a', borderBottom: '2px solid #f4a261' }}>
      <Container>
        <Navbar.Brand as={Link} to="/">Last Race</Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse>
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/" style={{ color: '#edf2f4' }}>Home</Nav.Link>
            {user && (
              <>
                <Nav.Link as={Link} to="/game" style={{ color: '#edf2f4' }}>Play</Nav.Link>
                <Nav.Link as={Link} to="/rankings" style={{ color: '#edf2f4' }}>Rankings</Nav.Link>
              </>
            )}
          </Nav>
          <Nav>
            {user ? (
              <div className="d-flex align-items-center gap-3">
                <span style={{ color: '#f4a261' }}> {user.username}</span>
                <Button size="sm" variant="outline-warning" onClick={handleLogout}>Logout</Button>
              </div>
            ) : (
              <Nav.Link as={Link} to="/login" style={{ color: '#f4a261', fontWeight: 700 }}>Login</Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
