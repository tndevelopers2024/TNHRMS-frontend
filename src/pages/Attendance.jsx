import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Play, Square, Coffee, CheckCircle, Circle, ArrowRightCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function Attendance() {
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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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
    if (!userInfo || !userInfo.id) return;
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/tasks/${userInfo.id}`);
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

  const handleCheckIn = () => {
    if (!plannedWork.trim()) {
      toast.error("Please enter your planned work before checking in.");
      return;
    }
    setCheckInTime(new Date());
    setStatus('working');
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
      await fetch(`${import.meta.env.VITE_API_URL}/api/employee/attendance/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: userInfo.id, 
          summary: completedWorkSummary 
        })
      });

      setCheckOutTime(new Date());
      setStatus('completed');
    } catch (err) {
      console.error("Error during checkout:", err);
      toast.error("Failed to checkout. Please try again.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Attendance</h1>
        <p className="text-muted-foreground mt-1">Manage your daily work log and check-ins.</p>
      </div>

      {/* Top Card: Live Clock */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between">
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
          </div>
          
          <div className="mt-6 md:mt-0 text-right">
            {status === 'working' || status === 'before_checkout' ? (
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center min-w-[200px]">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Current Session</p>
                <div className="text-3xl font-bold text-primary font-mono">{formatTime(timerSeconds)}</div>
                <p className="text-xs text-emerald-500 font-medium mt-1 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                  Active
                </p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Interactive Actions Area */}
      <Card className="border-0 shadow-sm overflow-hidden">
        {status === 'before_checkin' && (
          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <Label className="text-lg font-semibold text-gray-900">What work are you planning to complete today?</Label>
              <Textarea 
                placeholder="Example:&#10;- Fix login page bugs&#10;- Complete API integration&#10;- Client meeting at 3 PM" 
                className="text-base p-4 bg-gray-50/50"
                value={plannedWork}
                onChange={(e) => setPlannedWork(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button size="lg" className="w-full md:w-auto h-14 px-10 text-lg rounded-xl shadow-md bg-emerald-500 hover:bg-emerald-600 text-white" onClick={handleCheckIn}>
                <Play className="w-5 h-5 mr-2" />
                Check In Now
              </Button>
            </div>
          </div>
        )}

        {status === 'working' && (
          <div className="p-8 flex flex-col items-center justify-center space-y-8 py-16">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">You are checked in</h2>
              <p className="text-muted-foreground">Checked in at {checkInTime?.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md justify-center">
              <Button size="lg" variant="outline" className="flex-1 h-14 rounded-xl border-gray-200">
                <Coffee className="w-5 h-5 mr-2 text-amber-500" />
                Take Break
              </Button>
              <Button size="lg" variant="destructive" className="flex-1 h-14 rounded-xl shadow-md bg-rose-500 hover:bg-rose-600" onClick={handleInitCheckOut}>
                <Square className="w-5 h-5 mr-2" />
                Check Out
              </Button>
            </div>
          </div>
        )}

        {status === 'before_checkout' && (
          <div className="p-8 space-y-8 bg-rose-50/30">
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
            
            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200/60">
              <Button size="lg" variant="ghost" onClick={() => setStatus('working')} className="text-gray-500">
                Cancel
              </Button>
              <Button size="lg" variant="destructive" className="w-full md:w-auto h-14 px-10 text-lg rounded-xl shadow-md bg-rose-500 hover:bg-rose-600" onClick={handleFinalCheckOut}>
                Submit & Check Out
              </Button>
            </div>
          </div>
        )}

        {status === 'completed' && (
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
                <p className="text-lg font-semibold mt-1">{formatTime(timerSeconds)}</p>
              </div>
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <p className="text-xs text-primary uppercase font-semibold">Productivity</p>
                <p className="text-lg font-bold text-primary mt-1">Excellent</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
