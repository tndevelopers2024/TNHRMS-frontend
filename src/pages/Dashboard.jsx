import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Clock, CalendarDays, FileText, ChevronRight, Play, Square, Coffee, CheckCircle, Circle, ArrowRightCircle, X, Loader2, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState('before_checkin');
  const [plannedWork, setPlannedWork] = useState('');
  const [completedWorkSummary, setCompletedWorkSummary] = useState('');
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showEarlyCheckoutWarning, setShowEarlyCheckoutWarning] = useState(null);
  
  // Task states
  const [tasks, setTasks] = useState([]);
  const [taskUpdates, setTaskUpdates] = useState({});

  // Attendance history
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' or 'monthly'

  // Leaves
  const [leaves, setLeaves] = useState([]);
  
  // Holiday
  const [upcomingHoliday, setUpcomingHoliday] = useState(null);

  // Announcements & Payslip
  const [announcements, setAnnouncements] = useState([]);
  const [latestPayslip, setLatestPayslip] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchAttendance = async () => {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      if (!userInfo || !userInfo._id) return;
      
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/attendance/${userInfo._id}`);
        const data = await res.json();
        
        if (!Array.isArray(data)) {
          console.error("Backend returned non-array data:", data);
          return;
        }

        setAttendanceHistory(data);
        
        // Check if there is an active checkin today
        const now = new Date();
        const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        
        const todayRecord = data.find(d => d.date === dateStr);
        if (todayRecord) {
          setCheckInTime(new Date(todayRecord.checkInTime));
          if (todayRecord.checkOutTime) {
            setCheckOutTime(new Date(todayRecord.checkOutTime));
            setStatus('completed');
            setTimerSeconds(Math.floor((new Date(todayRecord.checkOutTime) - new Date(todayRecord.checkInTime)) / 1000));
          } else {
            setStatus('working');
            setTimerSeconds(Math.floor((new Date() - new Date(todayRecord.checkInTime)) / 1000));
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    fetchAttendance();

    const fetchLeaves = async () => {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      if (!userInfo || !userInfo._id) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/leaves/${userInfo._id}`);
        const data = await res.json();
        setLeaves(data || []);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchAnnouncements = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/announcements`);
        const data = await res.json();
        setAnnouncements(data || []);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchPayslip = async () => {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      if (!userInfo || !userInfo._id) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/payslips/latest/${userInfo._id}`);
        const data = await res.json();
        setLatestPayslip(data);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchUpcomingHoliday = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/holidays/upcoming`);
        if (res.ok) {
          const data = await res.json();
          setUpcomingHoliday(data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchLeaves();
    fetchAnnouncements();
    fetchPayslip();
    fetchUpcomingHoliday();
  }, []);

  useEffect(() => {
    let interval;
    if (status === 'working') {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const fetchTasks = async () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (!userInfo || !userInfo._id) return;
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/tasks/${userInfo._id}`);
      const data = await res.json();
      setTasks(data);
      
      // Initialize taskUpdates with current statuses
      const initialUpdates = {};
      data.forEach(t => {
        initialUpdates[t._id] = t.status;
      });
      setTaskUpdates(initialUpdates);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/attendance/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userInfo._id })
      });
      const data = await res.json();
      setCheckInTime(new Date(data.record.checkInTime));
      setStatus('working');
      setTimerSeconds(0);
      
      // Refresh history
      const histRes = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/attendance/${userInfo._id}`);
      setAttendanceHistory(await histRes.json());
      toast.success("Checked in successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to check in");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const proceedToCheckout = () => {
    setShowEarlyCheckoutWarning(null);
    fetchTasks();
    setStatus('before_checkout');
  };

  const handleInitCheckOut = () => {
    if (timerSeconds < 14400) {
      setShowEarlyCheckoutWarning('full_leave');
    } else if (timerSeconds < 28800) {
      setShowEarlyCheckoutWarning('half_day_leave');
    } else {
      proceedToCheckout();
    }
  };

  const handleTaskStatusChange = (taskId, newStatus) => {
    setTaskUpdates(prev => ({ ...prev, [taskId]: newStatus }));
  };

  const handleFinalCheckOut = async () => {
    if (!completedWorkSummary || completedWorkSummary.trim().length < 50) {
      toast.error("Please provide a summary of at least 50 characters.");
      return;
    }

    setIsCheckingOut(true);
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    
    try {
      // 2. Submit checkout summary
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/attendance/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: userInfo._id, 
          summary: completedWorkSummary 
        })
      });
      const data = await res.json();

      setCheckOutTime(new Date(data.record.checkOutTime));
      setStatus('completed');
      
      // Refresh history
      const histRes = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/attendance/${userInfo._id}`);
      setAttendanceHistory(await histRes.json());
      toast.success("Checked out successfully");
    } catch (err) {
      console.error("Error during checkout:", err);
      toast.error("Failed to checkout. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const userInfoString = localStorage.getItem('userInfo');
  const userName = userInfoString ? JSON.parse(userInfoString).name : 'User';

  const getWeeklyAttendanceData = () => {
    const today = new Date();
    const currentDay = today.getDay(); 
    const diffToMonday = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const weekData = [
      { name: 'Mon', hours: 0 },
      { name: 'Tue', hours: 0 },
      { name: 'Wed', hours: 0 },
      { name: 'Thu', hours: 0 },
      { name: 'Fri', hours: 0 },
      { name: 'Sat', hours: 0 },
      { name: 'Sun', hours: 0 },
    ];

    attendanceHistory.forEach(record => {
      const recordDate = new Date(record.date);
      if (recordDate >= monday) {
        let dayIdx = recordDate.getDay() - 1;
        if (dayIdx === -1) dayIdx = 6;
        if (dayIdx >= 0 && dayIdx < 7 && record.totalHours) {
          weekData[dayIdx].hours += record.totalHours;
        }
      }
    });

    return weekData;
  };

  const getLeaveStats = () => {
    const stats = {
      'Casual Leave': { used: 0, available: 10 },
      'Sick Leave': { used: 0, available: 10 },
      'Earned Leave': { used: 0, available: 15 }
    };
    
    // Count approved leaves
    leaves.forEach(leave => {
       if (stats[leave.type] && leave.status === 'Approved') {
           stats[leave.type].used += leave.days || 1;
           stats[leave.type].available -= leave.days || 1;
       }
    });

    // Count auto-leaves from attendance as Casual Leave
    attendanceHistory.forEach(record => {
       if (record.status === 'Auto-Leave') {
           stats['Casual Leave'].used += 1;
           stats['Casual Leave'].available -= 1;
       } else if (record.status === 'Half-Day Leave') {
           stats['Casual Leave'].used += 0.5;
           stats['Casual Leave'].available -= 0.5;
       }
    });

    return [
      { name: 'Casual', used: stats['Casual Leave'].used, available: Math.max(0, stats['Casual Leave'].available) },
      { name: 'Sick', used: stats['Sick Leave'].used, available: Math.max(0, stats['Sick Leave'].available) },
      { name: 'Earned', used: stats['Earned Leave'].used, available: Math.max(0, stats['Earned Leave'].available) },
    ];
  };

  const attendanceData = getWeeklyAttendanceData();
  const leaveData = getLeaveStats();
  const totalWeeklyHours = attendanceData.reduce((acc, curr) => acc + curr.hours, 0);
  const totalLeavesUsed = leaveData.reduce((acc, curr) => acc + curr.used, 0);

  const widgets = [
    { 
      title: "Today's Status", 
      value: status === 'working' ? "Working" : status === 'completed' ? "Completed" : "Not Checked In", 
      subtitle: checkInTime ? `Check-in at ${checkInTime.toLocaleTimeString(undefined, {hour: '2-digit', minute:'2-digit'})}` : "Pending check-in", 
      icon: Users,
      color: "text-emerald-500",
      bg: "bg-emerald-50"
    },
    { 
      title: "Working Hours", 
      value: `${Math.floor(totalWeeklyHours)}h ${Math.round((totalWeeklyHours % 1) * 60)}m`, 
      subtitle: "This week", 
      icon: Clock,
      color: "text-primary",
      bg: "bg-primary/10"
    },
    { 
      title: "Leave Balance", 
      value: `${35 - totalLeavesUsed} Days`, 
      subtitle: "Total available (35 yearly)", 
      icon: FileText,
      color: "text-amber-500",
      bg: "bg-amber-50"
    },
    { 
      title: "Upcoming Holiday", 
      value: upcomingHoliday ? upcomingHoliday.name : "No Holidays", 
      subtitle: upcomingHoliday ? new Date(upcomingHoliday.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Check back later", 
      icon: CalendarDays,
      color: "text-secondary",
      bg: "bg-secondary/10"
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {userName}! Manage your daily work log and check-ins.</p>
      </div>

      {/* Top Card: Live Clock & Quick Actions */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary uppercase tracking-wider mb-1">
              {currentTime.toLocaleDateString('en-GB')}
            </p>
            <div className="flex items-center space-x-3 text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
              <Clock className="w-10 h-10 text-primary" />
              <span>
                {currentTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            {checkInTime && status === 'working' && (
              <p className="text-sm text-muted-foreground mt-2 font-medium">Checked in at {checkInTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
            )}
          </div>
          
          <div className="mt-6 md:mt-0 flex flex-wrap justify-end items-center gap-4">
            {status === 'before_checkin' && (
              <Button size="lg" className="h-14 px-10 text-lg rounded-xl shadow-md bg-emerald-500 hover:bg-emerald-600 text-white transition-transform hover:scale-105" onClick={handleCheckIn} disabled={isCheckingIn}>
                {isCheckingIn ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Play className="w-5 h-5 mr-2" />}
                {isCheckingIn ? "Checking In..." : "Check In Now"}
              </Button>
            )}

            {(status === 'working' || status === 'before_checkout') && (
              <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center min-w-[160px]">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Current Session</p>
                <div className="text-2xl font-bold text-primary font-mono">{formatTime(timerSeconds)}</div>
                {status === 'working' && (
                  <p className="text-[10px] text-emerald-500 font-medium mt-1 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                    Active
                  </p>
                )}
              </div>
            )}

            {status === 'working' && (
              <Button size="lg" variant="destructive" className="h-14 px-8 rounded-xl shadow-md bg-rose-500 hover:bg-rose-600 transition-transform hover:scale-105" onClick={handleInitCheckOut}>
                <Square className="w-5 h-5 mr-2" />
                Check Out
              </Button>
            )}
        </div>
        </CardContent>
      </Card>

      {/* Interactive Actions Area */}
      {status === 'completed' && (
      <Card className="border-0 shadow-sm overflow-hidden mb-6 mt-6">
          <div className="p-8 text-center space-y-6 py-12">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Great Job Today!</h2>
              <p className="text-muted-foreground max-w-md mx-auto">You've successfully logged your work and checked out. Have a good rest!</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-100">
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-xs text-muted-foreground uppercase">Check In</p>
                <p className="text-lg font-semibold mt-1">{checkInTime?.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-xs text-muted-foreground uppercase">Check Out</p>
                <p className="text-lg font-semibold mt-1">{checkOutTime?.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-xs text-muted-foreground uppercase">Total Hours</p>
                <p className="text-lg font-semibold mt-1 text-primary">
                  {checkOutTime && checkInTime ? (Math.floor((checkOutTime - checkInTime) / 1000 / 3600) + 'h ' + Math.floor(((checkOutTime - checkInTime) / 1000 % 3600) / 60) + 'm') : '-'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-xs text-muted-foreground uppercase">Status</p>
                <p className="text-lg font-semibold mt-1 text-emerald-600">Completed</p>
              </div>
            </div>
          </div>
      </Card>
      )}

      {/* Early Checkout Warning Modal */}
      {showEarlyCheckoutWarning && (
        <div className="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 mt-2">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Early Check-Out Warning</h2>
              <p className="text-muted-foreground text-sm leading-relaxed px-2">
                {showEarlyCheckoutWarning === 'full_leave' 
                  ? "You have worked less than 4 hours. Checking out now will be considered a Full Leave. Are you sure you want to proceed?" 
                  : "You have worked less than 8 hours. Checking out now will be considered a Half-Day Leave. Are you sure you want to proceed?"}
              </p>
            </div>
            <div className="flex bg-gray-50/80 border-t border-gray-100 p-5 gap-3 mt-4">
              <Button size="lg" variant="ghost" onClick={() => setShowEarlyCheckoutWarning(null)} className="flex-1 text-gray-500 hover:text-gray-900 hover:bg-gray-200 h-12 rounded-xl text-base">
                Cancel
              </Button>
              <Button size="lg" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white shadow-md h-12 rounded-xl text-base" onClick={proceedToCheckout}>
                Proceed Anyway
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {status === 'before_checkout' && (
        <div className="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-rose-50/30">
              <h2 className="text-xl font-bold text-gray-900">End of Day Check-Out</h2>
              <Button variant="ghost" size="icon" onClick={() => setStatus('working')} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8 flex-1">
              <div className="space-y-4">
                <Label className="text-lg font-semibold text-gray-900">End of Day Summary</Label>
                <Textarea 
                  placeholder="Briefly describe what you worked on or completed today..." 
                  className="text-base p-4 bg-white"
                  value={completedWorkSummary}
                  onChange={(e) => setCompletedWorkSummary(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 p-6 border-t border-gray-100 bg-gray-50/50">
              <Button size="lg" variant="ghost" onClick={() => setStatus('working')} className="text-gray-500" disabled={isCheckingOut}>
                Cancel
              </Button>
              <Button size="lg" variant="destructive" className="w-full md:w-auto h-12 px-8 text-base rounded-xl shadow-md bg-rose-500 hover:bg-rose-600" onClick={handleFinalCheckOut} disabled={isCheckingOut}>
                {isCheckingOut ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                {isCheckingOut ? "Submitting..." : "Submit & Check Out"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top Widgets */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 mt-8">
        {widgets.map((widget, i) => {
          const Icon = widget.icon;
          return (
            <Card key={i} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6 flex items-center space-x-4">
                <div className={`p-4 rounded-2xl ${widget.bg}`}>
                  <Icon className={`w-8 h-8 ${widget.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{widget.title}</p>
                  <h3 className="text-xl font-bold text-gray-900 mt-1">{widget.value}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{widget.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Attendance Chart */}
        <Card className="lg:col-span-4 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Working Hours</CardTitle>
            <CardDescription>Your daily working hours for this week.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="hours" 
                    stroke="#4853FD" 
                    strokeWidth={4}
                    dot={{ fill: '#4853FD', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Leave Statistics */}
        <Card className="lg:col-span-3 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Leave Statistics</CardTitle>
            <CardDescription>Available vs Used leaves.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leaveData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: '#f9fafb'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Bar dataKey="available" stackId="a" fill="#4853FD" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="used" stackId="a" fill="#905EFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  )
}
