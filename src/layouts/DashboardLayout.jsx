import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
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
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const employeeLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Daily Work Log', path: '/work-log', icon: Clock },
  { name: 'Leave Management', path: '/leaves', icon: FileText },
  { name: 'Payslips', path: '/payslips', icon: Wallet },
  { name: 'Holidays', path: '/holidays', icon: CalendarDays },
  { name: 'Calendar', path: '/calendar', icon: Calendar },
  { name: 'Profile', path: '/profile', icon: User },
  { name: 'Settings', path: '/settings', icon: Settings },
];

const adminLinks = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Manage Employees', path: '/admin/employees', icon: Users },
  { name: 'Work Assignment', path: '/admin/work', icon: ClipboardList },
  { name: 'Leave Approvals', path: '/admin/leaves', icon: CheckSquare },
  { name: 'Manage Holidays', path: '/admin/holidays', icon: CalendarDays },
  { name: 'Profile', path: '/profile', icon: User },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const userInfoString = localStorage.getItem('userInfo');
  
  if (!userInfoString) {
    return <Navigate to="/login" replace />;
  }

  const userInfo = JSON.parse(userInfoString);
  const role = userInfo?.role || 'employee';
  const userName = userInfo?.name || 'User';

  const sidebarLinks = role === 'admin' ? adminLinks : employeeLinks;
  const [profileImage, setProfileImage] = useState(userInfo?.profileImage || '');

  useEffect(() => {
    // Listen to profile image updates
    const handleProfileUpdate = () => {
      const updatedUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
      if (updatedUser.profileImage) {
        setProfileImage(updatedUser.profileImage);
      }
    };
    window.addEventListener('profileImageUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileImageUpdated', handleProfileUpdate);
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 shadow-sm transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-center h-20 border-b border-gray-50">
          <img src="/logo.png" alt="Logo" className="h-10" />
        </div>
        
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-5rem)]">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname.startsWith(link.path);
            
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-primary'}`} />
                {link.name}
              </Link>
            )
          })}

          <div className="pt-8 mt-8 border-t border-gray-100">
            <Link
              to="/login"
              onClick={() => localStorage.removeItem('userInfo')}
              className="flex items-center px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Link>
          </div>
        </nav>
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
            
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 w-64 h-10 rounded-full border-gray-200 bg-gray-50 focus-visible:ring-primary/20 focus-visible:bg-white"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-primary">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-destructive rounded-full border-2 border-white"></span>
            </Button>
            
            <div className="flex items-center space-x-3 border-l border-gray-200 pl-4 ml-2">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-semibold text-gray-900">{userName}</span>
                <span className="text-xs text-gray-500 capitalize">{role}</span>
              </div>
              <img 
                src={profileImage || `https://api.dicebear.com/7.x/notionists/svg?seed=${userName.replace(' ', '')}&backgroundColor=f3f4f6`}
                alt="Profile" 
                className="w-10 h-10 rounded-full border border-gray-200 bg-gray-100 object-cover"
              />
            </div>
          </div>
        </header>

        {/* Main Content scrollable area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-background scroll-smooth">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
