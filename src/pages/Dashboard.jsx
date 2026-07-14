import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Clock, CalendarDays, FileText, ChevronRight, Play, Square, Coffee, CheckCircle, Circle, ArrowRightCircle, X } from "lucide-react";
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
  
  // Task states
  const [tasks, setTasks] = useState([]);
  const [taskUpdates, setTaskUpdates] = useState({});

  // Attendance history
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' or 'monthly'

  // Leaves
  const [leaves, setLeaves] = useState([]);

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

    fetchLeaves();
    fetchAnnouncements();
    fetchPayslip();
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
    }
  };

  const handleInitCheckOut = () => {
    fetchTasks();
    setStatus('before_checkout');
  };

  const handleTaskStatusChange = (taskId, newStatus) => {
    setTaskUpdates(prev => ({ ...prev, [taskId]: newStatus }));
  };

  const handleFinalCheckOut = async () => {
    if (!completedWorkSummary.trim()) {
      toast.error("Please provide a summary in the text area.");
      return;
    }

    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    
    try {
      // 1. Update task statuses
      const updatesArray = Object.keys(taskUpdates).map(id => ({
        id,
        status: taskUpdates[id]
      }));
      
      await fetch(`${import.meta.env.VITE_API_URL}/api/employee/tasks/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskUpdates: updatesArray })
      });

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
      value: `${27 - totalLeavesUsed} Days`, 
      subtitle: "Total available (27 yearly)", 
      icon: FileText,
      color: "text-amber-500",
      bg: "bg-amber-50"
    },
    { 
      title: "Upcoming Holiday", 
      value: "Independence", 
      subtitle: "Aug 15, 2026", 
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
              <Button size="lg" className="h-14 px-10 text-lg rounded-xl shadow-md bg-emerald-500 hover:bg-emerald-600 text-white transition-transform hover:scale-105" onClick={handleCheckIn}>
                <Play className="w-5 h-5 mr-2" />
                Check In Now
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

      {/* Checkout Modal */}
      {status === 'before_checkout' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-rose-50/30">
              <h2 className="text-xl font-bold text-gray-900">End of Day Check-Out</h2>
              <Button variant="ghost" size="icon" onClick={() => setStatus('working')} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8 flex-1">
              <div>
                <Label className="text-lg font-semibold text-gray-900">Update Assigned Tasks</Label>
                <p className="text-sm text-muted-foreground mb-4">Please update the status of the work assigned to you.</p>
                
                {tasks.length > 0 ? (
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-gray-100">
                    {tasks.map(task => (
                      <div key={task._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/50 gap-3">
                        <p className="text-sm font-medium text-gray-800 flex-1">{task.description}</p>
                        <select 
                          value={taskUpdates[task._id] || task.status}
                          onChange={(e) => handleTaskStatusChange(task._id, e.target.value)}
                          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full sm:w-40"
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-xl border border-dashed border-gray-200 text-center text-gray-500 text-sm">
                    You have no assigned tasks.
                  </div>
                )}
              </div>

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
              <Button size="lg" variant="ghost" onClick={() => setStatus('working')} className="text-gray-500">
                Cancel
              </Button>
              <Button size="lg" variant="destructive" className="w-full md:w-auto h-12 px-8 text-base rounded-xl shadow-md bg-rose-500 hover:bg-rose-600" onClick={handleFinalCheckOut}>
                Submit & Check Out
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

      {/* Attendance History */}
      <div className="mt-8">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-100">
            <div className="space-y-1">
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>View your daily logs and monthly summaries.</CardDescription>
            </div>
            <div className="flex bg-gray-100/80 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('daily')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'daily' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Daily Log
              </button>
              <button 
                onClick={() => setActiveTab('weekly')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'weekly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Weekly Summary
              </button>
              <button 
                onClick={() => setActiveTab('monthly')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Monthly Summary
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {activeTab === 'daily' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Check In</th>
                      <th className="px-6 py-4 font-medium">Check Out</th>
                      <th className="px-6 py-4 font-medium">Total Hours</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendanceHistory.length > 0 ? (
                      attendanceHistory.map((record) => (
                        <tr key={record._id} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {new Date(record.date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="px-6 py-4 text-gray-600">
                            {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="px-6 py-4 font-medium text-primary">
                            {record.totalHours ? `${record.totalHours}h` : '-'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                              record.status === 'Auto-Leave' ? 'bg-rose-100 text-rose-700' : 
                              record.checkOutTime ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {record.status === 'Auto-Leave' ? 'Leave' : record.checkOutTime ? 'Present' : 'Working'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500 max-w-[250px] truncate" title={record.summary || ''}>
                            {record.summary || '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No attendance history found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : activeTab === 'weekly' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 font-medium">Week</th>
                      <th className="px-6 py-4 font-medium">Days Worked</th>
                      <th className="px-6 py-4 font-medium">Total Hours</th>
                      <th className="px-6 py-4 font-medium">Average Hours/Day</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(() => {
                      const weeklyData = attendanceHistory.reduce((acc, curr) => {
                        const dateObj = new Date(curr.date);
                        const startOfWeek = new Date(dateObj);
                        const day = startOfWeek.getDay();
                        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
                        startOfWeek.setDate(diff);
                        const weekLabel = `Week of ${startOfWeek.toLocaleDateString('en-GB')}`;
                        if (!acc[weekLabel]) {
                          acc[weekLabel] = { week: weekLabel, daysWorked: 0, totalHours: 0, sortKey: startOfWeek.getTime() };
                        }
                        if (curr.checkOutTime) { // Only count completed days
                          acc[weekLabel].daysWorked += 1;
                          acc[weekLabel].totalHours += curr.totalHours || 0;
                        }
                        return acc;
                      }, {});
                      const weeklyArray = Object.values(weeklyData).sort((a, b) => b.sortKey - a.sortKey);
                      
                      return weeklyArray.length > 0 ? (
                        weeklyArray.map((w) => (
                          <tr key={w.week} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900">{w.week}</td>
                            <td className="px-6 py-4 text-gray-600">{w.daysWorked} days</td>
                            <td className="px-6 py-4 font-medium text-primary">{w.totalHours.toFixed(1)}h</td>
                            <td className="px-6 py-4 text-gray-600">
                              {w.daysWorked > 0 ? (w.totalHours / w.daysWorked).toFixed(1) : 0}h
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No weekly data available.</td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 font-medium">Month</th>
                      <th className="px-6 py-4 font-medium">Days Worked</th>
                      <th className="px-6 py-4 font-medium">Total Hours</th>
                      <th className="px-6 py-4 font-medium">Average Hours/Day</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(() => {
                      const monthlyData = attendanceHistory.reduce((acc, curr) => {
                        const dateObj = new Date(curr.date);
                        const month = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
                        if (!acc[month]) {
                          acc[month] = { month, daysWorked: 0, totalHours: 0 };
                        }
                        if (curr.checkOutTime) { // Only count completed days
                          acc[month].daysWorked += 1;
                          acc[month].totalHours += curr.totalHours || 0;
                        }
                        return acc;
                      }, {});
                      const monthlyArray = Object.values(monthlyData);
                      
                      return monthlyArray.length > 0 ? (
                        monthlyArray.map((m) => (
                          <tr key={m.month} className="hover:bg-gray-50/30 transition-colors">
                            <td className="px-6 py-4 font-medium text-gray-900">{m.month}</td>
                            <td className="px-6 py-4 text-gray-600">{m.daysWorked} days</td>
                            <td className="px-6 py-4 font-medium text-primary">{m.totalHours.toFixed(1)}h</td>
                            <td className="px-6 py-4 text-gray-600">
                              {m.daysWorked > 0 ? (m.totalHours / m.daysWorked).toFixed(1) : 0}h
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No monthly data available.</td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
