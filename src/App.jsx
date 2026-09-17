import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Monitor } from 'lucide-react';
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
import AdminAttendance from './pages/admin/AdminAttendance';
import AdminPayroll from './pages/admin/AdminPayroll'; 
import AdminLeaveBalances from './pages/admin/AdminLeaveBalances';
import AdminInvoices from './pages/admin/AdminInvoices';
import ViewInvoicePublic from './pages/ViewInvoicePublic';
import Settings from './pages/Settings';
import ComingSoon from './pages/ComingSoon';
import DailyWorkLog from './pages/DailyWorkLog';
import Attendance from './pages/Attendance';

import { Toaster } from 'react-hot-toast';
import { ConfirmProvider } from './context/ConfirmContext';
import { SocketProvider } from './context/SocketContext';

function App() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      
      // Check for common mobile OS in User-Agent
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      
      // Check for small viewport width (standard responsive check)
      const isSmallScreen = window.innerWidth < 768;
      
      // Detect "Desktop Mode" on mobile:
      // Mobile browsers fake a large viewport width, but they still have touch and a small physical screen.
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallPhysicalScreen = Math.min(window.screen.width, window.screen.height) < 768;
      const isDesktopModeOnMobile = hasTouch && isSmallPhysicalScreen;

      setIsMobile(isMobileUA || isSmallScreen || isDesktopModeOnMobile);
    };

    // Initial check
    checkMobile();

    // Check on resize
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-gray-100">
          <div className="mx-auto bg-indigo-100 text-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <Monitor size={32} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3 tracking-tight">
            Desktop Experience
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            This application is optimized for larger screens. For the best experience, please switch to a tablet or desktop computer.
          </p>
          <div className="w-12 h-1 bg-indigo-500 mx-auto rounded-full opacity-50"></div>
        </div>
      </div>
    );
  }

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
            <Route path="attendance" element={<Attendance />} />
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
            <Route path="admin/attendance" element={<AdminAttendance />} />
            <Route path="admin/payroll" element={<AdminPayroll />} />
            <Route path="admin/leave-balances" element={<AdminLeaveBalances />} />
            <Route path="admin/invoices" element={<AdminInvoices />} />
            
            {/* Catch-all for authenticated users */}
            <Route path="*" element={<ComingSoon />} />
          </Route>
          
          {/* Public Standalone Client Invoice Route */}
          <Route path="/view-invoice/:id" element={<ViewInvoicePublic />} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfirmProvider>
  );
}

export default App;
