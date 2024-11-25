import React from 'react';
import AdminDashboard from './components/AdminDashboard';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <>
      <AdminDashboard />
      <Toaster position="top-center" />
    </>
  );
}

export default App;