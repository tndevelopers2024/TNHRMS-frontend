import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Leaves from './pages/Leaves';
import Payslips from './pages/Payslips';
import Profile from './pages/Profile';
import Holidays from './pages/Holidays';
import Calendar from './pages/Calendar';

import AdminWork from './pages/admin/AdminWork';
import AdminLeaves from './pages/admin/AdminLeaves';
import AdminHolidays from './pages/admin/AdminHolidays';
import AdminEmployees from './pages/admin/AdminEmployees';
import AdminPayroll from './pages/admin/AdminPayroll';
import Settings from './pages/Settings';
import ComingSoon from './pages/ComingSoon';
import DailyWorkLog from './pages/DailyWorkLog';

import { Toaster } from 'react-hot-toast';
import { ConfirmProvider } from './context/ConfirmContext';
import { SocketProvider } from './context/SocketContext';

function App() {
  return (
    <ConfirmProvider>
      <BrowserRouter>
        <Toaster position="top-center" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="work-log" element={<DailyWorkLog />} />
          <Route path="leaves" element={<Leaves />} />
          <Route path="payslips" element={<Payslips />} />
          <Route path="holidays" element={<Holidays />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          
          {/* Admin Routes */}
          <Route path="admin/work" element={<AdminWork />} />
          <Route path="admin/leaves" element={<AdminLeaves />} />
          <Route path="admin/holidays" element={<AdminHolidays />} />
          <Route path="admin/employees" element={<AdminEmployees />} />
          <Route path="admin/payroll" element={<AdminPayroll />} />
          
          {/* Catch-all for authenticated users */}
          <Route path="*" element={<ComingSoon />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      </BrowserRouter>
      </ConfirmProvider>
  );
}

export default App;
