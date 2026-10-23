import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import BackofficeDashboard from './backoffice/BackofficeDashboard';

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/backoffice" element={<BackofficeDashboard />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;