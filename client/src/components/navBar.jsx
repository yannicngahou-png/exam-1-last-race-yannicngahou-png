import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { useAuth } from '../context/authContext.jsx'; 

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <Navbar expand="lg" style={{ background: '#0f172a', borderBottom: '2px solid #e3e6eb' }}>
      <Container>
        <Navbar.Brand as={Link} to="/" style={{ color: '#d64316', fontWeight: 900 }}>Last Race</Navbar.Brand>
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
                <span style={{ color: '#e3e6eb' }}> {user.username}</span>
                <Button className = "logout-btn" size="sm" variant="outline-warning" onClick={handleLogout}>Logout</Button>
              </div>
            ) : (
              <Nav.Link as={Link} to="/login" style={{ color: '#e3e6eb', fontWeight: 700 }}>Login</Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
