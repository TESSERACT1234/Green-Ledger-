import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login        from './pages/Login';
import Dashboard    from './pages/Dashboard';
import Customers    from './pages/Customers';
import Vendors      from './pages/Vendors';
import Items        from './pages/Items';
import Invoices     from './pages/Invoices';
import Purchases    from './pages/Purchases';
import Payments     from './pages/Payments';
import Accounts     from './pages/Accounts';
import Journal      from './pages/Journal';
import Bank         from './pages/Bank';
import GST          from './pages/GST';
import Reports      from './pages/Reports';
import Documents    from './pages/Documents';
import ImportExport  from './pages/ImportExport';
import Production    from './pages/Production';
import Parties      from './pages/Parties';
import Users        from './pages/Users';
import Settings     from './pages/Settings';

import './styles/global.css';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner" style={{ width:32, height:32, borderWidth:3 }}/></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      <Route path="/dashboard"    element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/customers"    element={<PrivateRoute><Customers /></PrivateRoute>} />
      <Route path="/vendors"      element={<PrivateRoute><Vendors /></PrivateRoute>} />
      <Route path="/items"        element={<PrivateRoute><Items /></PrivateRoute>} />
      <Route path="/invoices"     element={<PrivateRoute><Invoices /></PrivateRoute>} />
      <Route path="/purchases"    element={<PrivateRoute><Purchases /></PrivateRoute>} />
      <Route path="/payments"     element={<PrivateRoute><Payments /></PrivateRoute>} />
      <Route path="/accounts"     element={<PrivateRoute><Accounts /></PrivateRoute>} />
      <Route path="/journal"      element={<PrivateRoute><Journal /></PrivateRoute>} />
      <Route path="/bank"         element={<PrivateRoute><Bank /></PrivateRoute>} />
      <Route path="/gst"          element={<PrivateRoute><GST /></PrivateRoute>} />
      <Route path="/reports"      element={<PrivateRoute><Reports /></PrivateRoute>} />
      <Route path="/parties"      element={<PrivateRoute><Parties /></PrivateRoute>} />
      <Route path="/documents"    element={<PrivateRoute><Documents /></PrivateRoute>} />
      <Route path="/import-export" element={<PrivateRoute><ImportExport /></PrivateRoute>} />
      <Route path="/production"    element={<PrivateRoute><Production /></PrivateRoute>} />

      <Route path="/users"    element={<AdminRoute><Users /></AdminRoute>} />
      <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: '13.5px', borderRadius: '10px' },
            success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } }
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}