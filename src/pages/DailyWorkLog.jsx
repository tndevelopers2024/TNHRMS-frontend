import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Clock, CheckCircle, RefreshCcw, X, Edit2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useSocket } from "../context/SocketContext";

export default function DailyWorkLog() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('userInfo') || '{}');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTasks = async () => {
    if (!user._id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/tasks/${user._id}`);
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  const socket = useSocket();

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleStatusChangeClick = (task, status = null) => {
    // If status is provided, it's a dropdown change. Otherwise, it's an "Edit Comment" action keeping the same status.
    const targetStatus = status || task.status;
    setSelectedTask(task);
    setNewStatus(targetStatus);
    setComment(task.employeeComment || '');
    setIsModalOpen(true);
  };

  const confirmStatusUpdate = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/tasks/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskUpdates: [{ id: selectedTask._id, status: newStatus, comment }]
        })
      });
      if (res.ok) {
        setTasks(tasks.map(t => 
          t._id === selectedTask._id 
            ? { ...t, status: newStatus, employeeComment: comment } 
            : t
        ));
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Daily Work Log</h1>
          <p className="text-muted-foreground mt-1">View your assigned tasks and update their status.</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b border-gray-50 pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl flex items-center">
              <ClipboardList className="w-5 h-5 mr-2 text-primary" /> My Tasks
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchTasks} disabled={loading}>
              <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <div className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          ) : tasks.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {tasks.map(task => (
                <div key={task._id} className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="space-y-2 flex-1 w-full">
                    <p className="text-gray-900 font-medium text-lg leading-snug">{task.description}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1.5" />
                      Assigned: {new Date(task.createdAt).toLocaleDateString('en-GB')}
                    </div>
                    {task.employeeComment && (
                      <div className="mt-2 text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-100 shadow-sm inline-flex items-start justify-between w-full max-w-xl group relative">
                        <div>
                          <span className="font-semibold mr-1">My Comment:</span> {task.employeeComment}
                        </div>
                        <button 
                          onClick={() => handleStatusChangeClick(task)}
                          className="text-gray-400 hover:text-primary transition-colors ml-2 p-1"
                          title="Edit Comment"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0 justify-end">
                    <span className="text-sm font-medium text-gray-600 hidden sm:inline-block">Status:</span>
                    <select 
                      value={task.status}
                      onChange={(e) => {
                        if(task.status !== e.target.value) handleStatusChangeClick(task, e.target.value);
                      }}
                      className={`h-10 rounded-lg border font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary px-3 shadow-sm cursor-pointer
                        ${task.status === 'Completed' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 
                          task.status === 'In Progress' ? 'bg-blue-50 border-blue-200 text-blue-700' : 
                          'bg-amber-50 border-amber-200 text-amber-700'
                        }`}
                    >
                      <option value="Pending" className="text-gray-900 bg-white">Pending</option>
                      <option value="In Progress" className="text-gray-900 bg-white">In Progress</option>
                      <option value="Completed" className="text-gray-900 bg-white">Completed</option>
                    </select>
                    {task.status === 'Completed' && (
                      <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <ClipboardList className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">No tasks assigned</h3>
              <p className="text-gray-500 mt-2">You currently have no pending work assignments.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Status Update Modal */}
      {isModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">Update Task Status</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <form onSubmit={confirmStatusUpdate} className="p-6 space-y-5">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-500">Task</p>
                <p className="text-gray-900 font-medium">{selectedTask.description}</p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
                <span className="text-sm font-medium text-gray-600">Changing status to:</span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                  ${newStatus === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                    newStatus === 'In Progress' ? 'bg-blue-100 text-blue-700' : 
                    'bg-amber-100 text-amber-700'
                  }`}>
                  {newStatus}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Add an explanation or comment (Optional)</label>
                <Textarea 
                  placeholder="E.g. Completed the API integration successfully, just waiting on final review..."
                  className="min-h-[120px] resize-none"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="gradient" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Confirm Update"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
