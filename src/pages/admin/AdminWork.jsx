import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, CheckCircle, Clock, X, ClipboardList, Briefcase, Edit2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirm } from "../../context/ConfirmContext";
import { useSocket } from "../../context/SocketContext";

export default function AdminWork() {
  const { confirm } = useConfirm();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState(["All"]);
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeTasks, setEmployeeTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  
  // Task form state
  const [taskDescription, setTaskDescription] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskDescription, setEditTaskDescription] = useState("");

  const socket = useSocket();

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNotif = (notif) => {
      if (notif.type === 'work_status_updated') {
        fetchEmployees();
        if (isModalOpen && selectedEmployee) {
          // Re-fetch employee tasks directly to update the modal
          fetch(`${import.meta.env.VITE_API_URL}/api/admin/employees/${selectedEmployee._id}/details`)
            .then(res => res.json())
            .then(data => setEmployeeTasks(data.tasks || []))
            .catch(err => console.error(err));
        }
      }
    };
    socket.on('notification', handleNotif);
    return () => socket.off('notification', handleNotif);
  }, [socket, isModalOpen, selectedEmployee]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/departments`);
      const data = await res.json();
      const deptNames = data.map(d => d.name);
      // Ensure "General" is always an option even if not explicitly in DB
      if (!deptNames.includes("General")) deptNames.push("General");
      setDepartments(["All", ...deptNames]);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/employees`);
      const data = await res.json();
      
      const tasksRes = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/tasks`);
      const tasksData = await tasksRes.json();

      const employeesWithTasks = data.map(emp => {
        const empTasks = tasksData.filter(t => 
          (t.employee && t.employee._id === emp._id) || t.employee === emp._id
        );
        const latestTask = empTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        return { ...emp, latestTask };
      });

      setEmployees(employeesWithTasks);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const handleRowClick = async (emp) => {
    setSelectedEmployee(emp);
    setIsModalOpen(true);
    setLoadingTasks(true);
    setEmployeeTasks([]);
    setTaskDescription("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/employees/${emp._id}/details`);
      const data = await res.json();
      setEmployeeTasks(data.tasks || []);
    } catch (err) {
      console.error("Error fetching tasks for employee:", err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!taskDescription.trim()) return;

    setIsAssigning(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee: selectedEmployee._id,
          description: taskDescription
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setEmployeeTasks([data.task, ...employeeTasks]);
        setTaskDescription("");
        fetchEmployees();
        toast.success("Task assigned successfully");
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Failed to assign task');
      }
    } catch (err) {
      console.error("Error assigning task:", err);
      toast.error('An error occurred while assigning the task');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUpdateTask = async (taskId) => {
    if (!editTaskDescription.trim()) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editTaskDescription })
      });
      if (res.ok) {
        const data = await res.json();
        setEmployeeTasks(prev => prev.map(t => t._id === taskId ? data.task : t));
        setEditingTaskId(null);
        fetchEmployees();
        toast.success("Task updated successfully");
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Failed to update task');
      }
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    confirm({
      title: "Delete Task",
      message: "Are you sure you want to delete this task?",
      confirmText: "Delete",
      action: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/tasks/${taskId}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            setEmployeeTasks(prev => prev.filter(t => t._id !== taskId));
            fetchEmployees();
            toast.success("Task deleted successfully");
          } else {
            const errorData = await res.json();
            toast.error(errorData.message || 'Failed to delete task');
          }
        } catch (err) {
          console.error("Error deleting task:", err);
          toast.error("An error occurred while deleting task");
        }
      }
    });
  };

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            emp.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = departmentFilter === "All" || emp.department === departmentFilter;
      const matchesEmpType = employmentTypeFilter === "All" || emp.employmentType === employmentTypeFilter;
      return matchesSearch && matchesDept && matchesEmpType;
    });
  }, [employees, searchQuery, departmentFilter, employmentTypeFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Work Assignment</h1>
          <p className="text-muted-foreground mt-1">Assign daily tasks to employees and track progress.</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-gray-50 gap-4">
          <CardTitle>Employees List</CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <select
              value={employmentTypeFilter}
              onChange={(e) => setEmploymentTypeFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full sm:w-40"
            >
              <option value="All">All Types</option>
              <option value="fulltime">Full-Time</option>
              <option value="freelancer">Freelancer</option>
              <option value="intern">Intern</option>
              <option value="contractor">Contractor</option>
            </select>
            <select 
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary w-full sm:w-48"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept === "All" ? "All Departments" : dept}</option>
              ))}
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search employee..." 
                className="pl-9 h-9" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80">
              <tr>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Employee</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Email</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Department</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Designation</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Assigned Work</th>
                <th className="px-6 py-4 font-medium whitespace-nowrap">Status</th>
                <th className="px-6 py-4 font-medium text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => (
                  <tr 
                    key={emp._id} 
                    className="bg-white hover:bg-gray-50/50 transition-colors cursor-pointer group"
                    onClick={() => handleRowClick(emp)}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={`https://api.dicebear.com/7.x/notionists/svg?seed=${emp.name.replace(' ', '')}&backgroundColor=f3f4f6`}
                          alt={emp.name} 
                          className="w-8 h-8 rounded-full border bg-gray-50"
                        />
                        <span>{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{emp.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        <Briefcase className="w-3 h-3 mr-1" />
                        {emp.department || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{emp.designation}</td>
                    <td className="px-6 py-4">
                      {emp.latestTask ? (
                        <div className="line-clamp-2 text-xs text-gray-700 max-w-xs" title={emp.latestTask.description}>
                          {emp.latestTask.description}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {emp.latestTask ? (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${
                          emp.latestTask.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                          emp.latestTask.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {emp.latestTask.status}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-4 h-4 mr-1" /> Assign
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No employees found matching the filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Task Assignment Modal */}
      {isModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center space-x-4">
                <img 
                  src={`https://api.dicebear.com/7.x/notionists/svg?seed=${selectedEmployee.name.replace(' ', '')}&backgroundColor=f3f4f6`}
                  alt={selectedEmployee.name} 
                  className="w-12 h-12 rounded-full border shadow-sm bg-white"
                />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Assign Work to {selectedEmployee.name}</h2>
                  <p className="text-sm text-gray-500">{selectedEmployee.designation} • {selectedEmployee.department}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col lg:flex-row gap-8">
              
              {/* Left Column: Form */}
              <div className="flex-1 space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center text-lg">
                  <Plus className="w-5 h-5 mr-2 text-primary" /> Create New Task
                </h3>
                <form onSubmit={handleAssignTask} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Task Description</Label>
                    <Textarea 
                      required
                      placeholder="Describe the work to be completed..." 
                      className="min-h-[120px]"
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                    />
                  </div>
                  <Button type="submit" variant="gradient" className="w-full flex justify-center items-center" disabled={isAssigning}>
                    {isAssigning ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Assigning...
                      </>
                    ) : (
                      "Assign Task"
                    )}
                  </Button>
                </form>
              </div>

              {/* Right Column: Existing Tasks */}
              <div className="flex-1 space-y-4 border-l border-gray-100 lg:pl-8">
                <h3 className="font-semibold text-gray-900 flex items-center text-lg">
                  <ClipboardList className="w-5 h-5 mr-2 text-primary" /> Current Tasks
                </h3>
                {loadingTasks ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                  </div>
                ) : employeeTasks.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {employeeTasks.map(task => (
                      <div key={task._id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/80 hover:bg-gray-50 transition-colors shadow-sm">
                        {editingTaskId === task._id ? (
                          <div className="space-y-2 mb-3">
                            <Textarea 
                              value={editTaskDescription}
                              onChange={(e) => setEditTaskDescription(e.target.value)}
                              className="min-h-[80px]"
                            />
                            <div className="flex justify-end space-x-2">
                              <Button size="sm" variant="outline" onClick={() => setEditingTaskId(null)}>
                                Cancel
                              </Button>
                              <Button size="sm" onClick={() => handleUpdateTask(task._id)}>
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-sm font-medium text-gray-900 leading-snug">{task.description}</p>
                            <div className="flex items-center space-x-1 shrink-0">
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-blue-600" onClick={() => {
                                setEditingTaskId(task._id);
                                setEditTaskDescription(task.description);
                              }}>
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-rose-600" onClick={() => handleDeleteTask(task._id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {task.employeeComment && (
                          <div className="mt-3 text-xs text-gray-600 bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-primary/20 before:rounded-r">
                            <span className="font-semibold text-gray-700 block mb-0.5">Employee Comment:</span> 
                            {task.employeeComment}
                          </div>
                        )}

                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100/60">
                          <span className="text-xs text-gray-500 font-medium">
                            {new Date(task.createdAt).toLocaleDateString('en-GB')}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                            task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                            task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-gray-500 text-sm">
                    No tasks assigned yet.
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  )
}
