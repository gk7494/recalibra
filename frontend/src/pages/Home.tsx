// Home page - Main Dashboard
import React from 'react';
import Dashboard from '../components/Dashboard';
import NotificationToast from '../components/NotificationToast';
import '../App.css';

const Home: React.FC = () => {
  return (
    <>
      <Dashboard />
      <NotificationToast />
    </>
  );
};

export default Home;

