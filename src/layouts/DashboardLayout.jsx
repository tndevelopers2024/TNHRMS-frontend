import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarCheck, 
  Clock, 
  FileText, 
  Wallet, 
  CalendarDays, 
  Calendar,
  User, 
  Settings,
  Bell,
  Search,
  Menu,
  LogOut,
  ClipboardList,
  CheckSquare,
  Users,
  Play,
  Activity,
  Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSocket, SocketProvider } from '../context/SocketContext';
import { toast } from 'react-hot-toast';

const employeeLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Daily Work Log', path: '/work-log', icon: Clock },
  { name: 'Attendance History', path: '/attendance', icon: Activity },
  { name: 'Leave Management', path: '/leaves', icon: FileText },
  // { name: 'Payslips', path: '/payslips', icon: Wallet },
  { name: 'Holidays', path: '/holidays', icon: CalendarDays },
  { name: 'Calendar', path: '/calendar', icon: Calendar },
  { name: 'Profile', path: '/profile', icon: User },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const adminLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'My Attendance', path: '/attendance', icon: Activity },
  { name: 'Manage Employees', path: '/admin/employees', icon: Users },
  { name: 'Attendance Reports', path: '/admin/attendance', icon: Activity },
  { name: 'Work Assignment', path: '/admin/work', icon: ClipboardList },
  { name: 'Leave Approvals', path: '/admin/leaves', icon: CheckSquare },
  { name: 'Leave Balances', path: '/admin/leave-balances', icon: FileText },
  { name: 'Manage Holidays', path: '/admin/holidays', icon: CalendarDays },
  { name: 'Payroll', path: '/admin/payroll', icon: Wallet },
  { name: 'Invoices', path: '/admin/invoices', icon: Receipt },
  { name: 'Profile', path: '/profile', icon: User },
  { name: 'Settings', path: '/settings', icon: Settings },
];

function DashboardLayoutContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('/')) return `${import.meta.env.VITE_API_URL}${url}`;
    return url;
  };

  const userInfoString = localStorage.getItem('userInfo');
  
  if (!userInfoString) {
    return <Navigate to="/login" replace />;
  }

  const userInfo = JSON.parse(userInfoString);
  const role = userInfo?.role || 'employee';
  const userName = userInfo?.name || 'User';

  const sidebarLinks = role === 'admin' ? adminLinks : employeeLinks;
  const [profileImage, setProfileImage] = useState(userInfo?.profileImage || '');
  const [joiningDate, setJoiningDate] = useState(userInfo?.joiningDate || null);
  const [documentStatus, setDocumentStatus] = useState(userInfo?.documentStatus || 'Approved');

  const availableLinks = (role === 'employee' && documentStatus !== 'Approved')
    ? sidebarLinks.filter(link => link.path === '/profile')
    : sidebarLinks;

  useEffect(() => {
    // Fetch user profile to get latest joining date if missing
    const fetchProfile = async () => {
      if (!userInfo?._id) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/profile/${userInfo._id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.joiningDate) {
            setJoiningDate(data.joiningDate);
          }
          if (data.profileImage) {
            setProfileImage(data.profileImage);
          }
          if (data.documentStatus) {
            setDocumentStatus(data.documentStatus);
            const updatedUser = { ...userInfo, documentStatus: data.documentStatus };
            localStorage.setItem('userInfo', JSON.stringify(updatedUser));
          }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (role === 'employee' && documentStatus !== 'Approved' && location.pathname !== '/profile') {
      navigate('/profile', { replace: true });
      toast.error('Please complete your profile and wait for admin approval to access other pages.', { id: 'auth-restrict' });
    }
  }, [role, documentStatus, location.pathname, navigate]);

  useEffect(() => {
    if (!socket) return;

    const handleAccountLocked = (data) => {
      toast.error(data.message || 'Your account has been locked by the admin.');
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    };

    socket.on('account_locked', handleAccountLocked);

    return () => {
      socket.off('account_locked', handleAccountLocked);
    };
  }, [socket, navigate]);

  useEffect(() => {
    // Listen to profile image updates
    const handleProfileUpdate = () => {
      const updatedUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
      if (updatedUser.profileImage !== undefined) {
        setProfileImage(updatedUser.profileImage);
      }
    };
    window.addEventListener('profileImageUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileImageUpdated', handleProfileUpdate);
  }, []);

  // Check if user has checked in today
  useEffect(() => {
    let isActive = true;

    if (role === 'employee' && documentStatus !== 'Approved') {
      setShowCheckInModal(false);
      return;
    }

    const checkAttendance = async () => {
      if (!userInfo || !userInfo._id) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/attendance/${userInfo._id}`);
        if (!isActive) return;

        const data = await res.json();
        if (!isActive) return;
        
        if (Array.isArray(data)) {
          const now = new Date();
          const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
          const todayRecord = data.find(d => d.date === dateStr);
          
          if (!todayRecord) {
            setTimeout(() => {
              if (isActive) {
                setShowCheckInModal(true);
              }
            }, 500); // Slight delay for better UX on entry
          }
        }
      } catch (err) {
        if (isActive) console.error("Error checking attendance status:", err);
      }
    };
    
    checkAttendance();

    return () => {
      isActive = false;
    };
  }, [role, documentStatus, userInfo?._id]);

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/notifications`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
          // Token is expired or unauthorized
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      }
    };
    fetchNotifications();
    // Poll every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({...n, read: true})));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${import.meta.env.VITE_API_URL}/api/notifications/${notif._id}/read`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setNotifications(prev => prev.map(n => n._id === notif._id ? {...n, read: true} : n));
      } catch (err) {
        console.error(err);
      }
    }
    setShowNotifications(false);
    
    // Route based on type
    if (notif.type === 'profile_update') {
      if (role === 'admin') navigate('/admin/employees');
      else navigate('/profile');
    }
    if (role === 'admin') {
      if (notif.type === 'leave_application') navigate('/admin/leaves');
      else if (notif.type === 'task_update') navigate('/admin/work');
    } else {
      if (notif.type === 'task') navigate('/work-log');
      else if (notif.type === 'leave') navigate('/leaves');
    }
  };

  const handleGlobalCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/attendance/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userInfo._id })
      });
      if (res.ok) {
        toast.success("Checked in successfully!");
        setShowCheckInModal(false);
        // Reload to ensure Dashboard or other pages sync their state immediately
        window.location.reload();
      } else {
        toast.error("Failed to check in");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setIsCheckingIn(false);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (data) => {
      if (!data.message) return;

      setNotifications(prev => [{
        id: Date.now(),
        message: data.message,
        time: new Date(),
        type: data.type,
        read: false
      }, ...prev]);
      
      // Automatically open the dropdown when a new notification arrives
      setShowNotifications(true);

      toast(data.message, { 
        icon: '🔔',
        duration: 5000,
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/80 backdrop-blur-xl border-r border-primary/10 shadow-[4px_0_24px_rgba(72,83,253,0.05)] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-center h-20 border-b border-gray-50">
          <img src="/logo.png" alt="Logo" className="h-10" />
        </div>
        
        <nav className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          <div className="space-y-1.5">
            {availableLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname.startsWith(link.path);
              
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`flex items-center px-4 py-3.5 text-sm font-semibold rounded-2xl transition-all duration-300 ease-out group ${
                    isActive 
                      ? 'bg-gradient-to-r from-primary to-[#905EFF] text-white shadow-lg shadow-primary/25 translate-x-1' 
                      : 'text-gray-500 hover:bg-primary/5 hover:text-primary hover:translate-x-1'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className={`w-5 h-5 mr-3 transition-colors duration-300 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary'}`} />
                  {link.name}
                </Link>
              )
            })}
          </div>
        </nav>

          <div className="p-4 mt-auto border-t border-primary/10 bg-white/50">
            <Link
              to="/login"
              onClick={() => localStorage.removeItem('userInfo')}
              className="flex items-center justify-center w-full px-4 py-3.5 text-sm font-semibold text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md hover:shadow-rose-500/20"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </Link>
          </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        
        {/* Top Navbar */}
        <header className="flex items-center justify-between h-20 px-6 bg-white/70 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden mr-4"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative" ref={dropdownRef}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative text-gray-500 hover:text-primary"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5" />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-2 right-2.5 w-2 h-2 bg-destructive rounded-full border-2 border-white"></span>
                )}
              </Button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    {notifications.length > 0 && notifications.some(n => !n.read) && (
                      <button 
                        onClick={handleMarkAllRead}
                        className="text-xs text-primary hover:underline"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-500">No new notifications</div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif._id || notif.id} 
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-4 border-b border-gray-50 hover:bg-gray-100 transition-colors cursor-pointer ${!notif.read ? 'bg-primary/5' : ''}`}
                        >
                          <p className="text-sm font-semibold text-gray-900 mb-1">{notif.title}</p>
                          <p className="text-sm text-gray-800">{notif.message}</p>
                          <span className="text-xs text-gray-400 mt-1 block">
                            {new Date(notif.createdAt || notif.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div 
              className="flex items-center space-x-3 border-l border-gray-200 pl-4 ml-2 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-colors"
              onClick={() => navigate('/profile')}
            >
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-semibold text-gray-900">{userName}</span>
                <span className="text-xs text-gray-500 capitalize">{role}</span>
                {joiningDate && (
                  <span className="text-[10px] text-gray-400">
                    Joined: {new Date(joiningDate).toLocaleDateString('en-GB')}
                  </span>
                )}
              </div>
              <img 
                src={getImageUrl(profileImage) || `https://api.dicebear.com/7.x/notionists/svg?seed=${userName.replace(' ', '')}&backgroundColor=f3f4f6`}
                alt="Profile" 
                className="w-10 h-10 rounded-full border border-gray-200 bg-gray-100 object-cover"
              />
            </div>
          </div>
        </header>

        {/* Main Content scrollable area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-background scroll-smooth">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Check In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Clock className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Good Morning!</h2>
            <p className="text-gray-500 mb-8 text-sm">You haven't checked in for today yet. Please check in to start your work session and record your time.</p>
            <Button 
              size="lg" 
              className="w-full h-14 text-lg rounded-xl shadow-md bg-emerald-500 hover:bg-emerald-600 text-white transition-all hover:scale-[1.02]"
              onClick={handleGlobalCheckIn}
              disabled={isCheckingIn}
            >
              {isCheckingIn ? 'Checking in...' : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Check In Now
                </>
              )}
            </Button>
            <button 
              className="mt-6 text-sm text-gray-400 hover:text-gray-600 underline underline-offset-4 transition-colors"
              onClick={() => setShowCheckInModal(false)}
            >
              Remind me later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <SocketProvider>
      <DashboardLayoutContent />
    </SocketProvider>
  );
}
