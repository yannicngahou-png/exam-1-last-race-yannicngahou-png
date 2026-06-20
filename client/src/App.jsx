import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import {AuthProvider, useAuth} from './context/authContext.jsx';

// Components & Pages
import NavBar from './components/navBar.jsx';
import { HomePage } from './pages/homePages.jsx';
import { LoginPage } from './pages/loginPage.jsx';


import 'bootstrap/dist/css/bootstrap.min.css';
 

// No access for non authenticated users 
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#edf2f4' }}>
          <NavBar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;