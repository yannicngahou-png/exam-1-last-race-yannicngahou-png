import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import {AuthProvider, useAuth} from './context/authContext.jsx';

// Components & Pages
import Header from './components/header.jsx';
import Footer from './components/footer.jsx';
import { HomePage } from './pages/homePage.jsx';
import { LoginPage } from './pages/loginPage.jsx';
import {GamePage} from './pages/trainPage.jsx';
import { RankingsPage } from './pages/rankingPage.jsx';

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
          <Header />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
               path="/game"
               element={
                <ProtectedRoute>
                  <GamePage />
                </ProtectedRoute>
              }
              />
              <Route
               path="/ranking"
               element={
                <ProtectedRoute>
                  <RankingsPage />
                </ProtectedRoute>
              }
              />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Footer/>
      </AuthProvider>
    </Router>
  );
}

export default App;