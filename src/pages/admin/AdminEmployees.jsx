import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Users, Briefcase, X, ClipboardList, Settings2, Trash2, Edit2, Check, Wallet } from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import toast from "react-hot-toast";
import { useConfirm } from "../../context/ConfirmContext";

export default function AdminEmployees() {
  const { confirm } = useConfirm();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [editingDeptName, setEditingDeptName] = useState('');
  
  // Modal states
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [formData, setFormData] = useState({
    name: '', email: '', department: '', designation: '', phone: '', address: '', gender: '', dob: '', joiningDate: '', salary: '',
    emergencyContact: { name: '', relationship: '', phone: '' }
  });

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/departments`);
      const data = await res.json();
      setDepartments(data);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/employees`);
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  const handleCardClick = async (empId) => {
    setIsModalOpen(true);
    setLoadingDetails(true);
    setSelectedDetails(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/employees/${empId}/details`);
      const data = await res.json();
      setSelectedDetails(data);
    } catch (err) {
      console.error("Error fetching employee details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleEditDepartment = async (deptId) => {
    if (!editingDeptName.trim()) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/departments/${deptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingDeptName })
      });
      if (res.ok) {
        setEditingDeptId(null);
        setEditingDeptName('');
        fetchDepartments();
        fetchEmployees();
        toast.success("Department updated successfully");
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to update department');
      }
    } catch (err) {
      console.error("Error updating department:", err);
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/departments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeptName })
      });
      if (res.ok) {
        setNewDeptName('');
        fetchDepartments();
        toast.success("Department added successfully");
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to add department');
      }
    } catch (err) {
      console.error("Error adding department:", err);
    }
  };

  const handleDeleteDepartment = async (deptId) => {
    const isConfirmed = await confirm("Are you sure? Employees in this department will be moved to 'General'.", "Delete Department");
    if (!isConfirmed) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/departments/${deptId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchDepartments();
        fetchEmployees(); // Re-fetch employees
        toast.success("Department deleted successfully");
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to delete department');
      }
    } catch (err) {
      console.error("Error deleting department:", err);
    }
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    try {
      const isEditing = !!editingEmployeeId;
      const url = isEditing 
        ? `${import.meta.env.VITE_API_URL}/api/admin/employees/${editingEmployeeId}`
        : `${import.meta.env.VITE_API_URL}/api/admin/employees`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowAddForm(false);
        setEditingEmployeeId(null);
        setFormData({ name: '', email: '', department: '', designation: '', phone: '', address: '', gender: '', dob: '', joiningDate: '', salary: '', emergencyContact: { name: '', relationship: '', phone: '' } });
        fetchEmployees();
        toast.success(isEditing ? "Employee updated successfully" : "Employee added successfully");
        if (isEditing && selectedDetails) {
            handleCardClick(editingEmployeeId);
        }
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || `Failed to ${isEditing ? 'update' : 'add'} employee`);
      }
    } catch (err) {
      console.error("Error saving employee:", err);
    }
  };

  const handleDeleteEmployee = async (empId) => {
    const isConfirmed = await confirm("Are you sure you want to delete this employee? This action cannot be undone.", "Delete Employee");
    if (!isConfirmed) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/employees/${empId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchEmployees();
        toast.success("Employee deleted successfully");
      } else {
        const err = await res.json();
        toast.error(err.message || 'Failed to delete employee');
      }
    } catch (err) {
      console.error("Error deleting employee:", err);
    }
  };

  // Group employees by department
  const employeesByDepartment = employees.reduce((acc, emp) => {
    const dept = emp.department || 'General';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(emp);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Employees Directory</h1>
          <p className="text-muted-foreground mt-1">Manage users and organize them by department.</p>
        </div>
        <Button onClick={() => {
          setEditingEmployeeId(null);
          setFormData({ name: '', email: '', department: '', designation: '', phone: '', address: '', gender: '', dob: '', joiningDate: '', salary: '', emergencyContact: { name: '', relationship: '', phone: '' } });
          setShowAddForm(!showAddForm);
        }} className="bg-primary hover:bg-primary/90 text-white shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          {showAddForm ? "Cancel" : "Add Employee"}
        </Button>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{editingEmployeeId ? "Edit Employee" : "Add New Employee"}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSaveEmployee} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Details */}
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="john@example.com" />
                  </div>
                  
                  {/* Work Details */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Department</Label>
                      <button type="button" onClick={() => setShowDeptModal(true)} className="text-xs text-primary flex items-center hover:underline">
                        <Settings2 className="w-3 h-3 mr-1" /> Manage
                      </button>
                    </div>
                    <select required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                      <option value="" disabled>Select a department</option>
                      {departments.map(dept => (
                        <option key={dept._id} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Designation</Label>
                    <Input required value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} placeholder="e.g. Software Engineer" />
                  </div>
                  <div className="space-y-2">
                    <Label>Joining Date</Label>
                    <DatePicker required value={formData.joiningDate} onChange={val => setFormData({...formData, joiningDate: val})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Salary (Annual)</Label>
                    <Input type="number" required value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} placeholder="e.g. 500000 for 5 LPA" />
                  </div>

                  {/* Personal Details */}
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="e.g. +1 234 567 8900" />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <select required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                      <option value="" disabled>Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <DatePicker required value={formData.dob} onChange={val => setFormData({...formData, dob: val})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="e.g. 123 Main St, City" />
                  </div>

                  {/* Emergency Contact */}
                  <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Emergency Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input required value={formData.emergencyContact?.name || ''} onChange={e => setFormData({...formData, emergencyContact: {...(formData.emergencyContact || {}), name: e.target.value}})} placeholder="e.g. Jane Doe" />
                      </div>
                      <div className="space-y-2">
                        <Label>Relationship</Label>
                        <Input required value={formData.emergencyContact?.relationship || ''} onChange={e => setFormData({...formData, emergencyContact: {...(formData.emergencyContact || {}), relationship: e.target.value}})} placeholder="e.g. Spouse" />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input required value={formData.emergencyContact?.phone || ''} onChange={e => setFormData({...formData, emergencyContact: {...(formData.emergencyContact || {}), phone: e.target.value}})} placeholder="e.g. +1 555 987 6543" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4 border-t border-gray-100 mt-6">
                  <Button type="button" variant="outline" className="mr-2" onClick={() => setShowAddForm(false)}>Cancel</Button>
                  <Button type="submit">{editingEmployeeId ? "Save Changes" : "Save Employee"}</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8 mt-6">
        {Object.entries(employeesByDepartment).map(([department, emps]) => (
          <div key={department} className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center text-gray-800 border-b pb-2">
              <Briefcase className="w-5 h-5 mr-2 text-primary" />
              {department} <span className="ml-2 text-sm font-normal bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{emps.length} Users</span>
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {emps.map(emp => (
                <Card 
                  key={emp._id} 
                  className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleCardClick(emp._id)}
                >
                  <CardContent className="p-5 flex items-center space-x-4">
                    <img 
                      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${emp.name.replace(' ', '')}&backgroundColor=f3f4f6`}
                      alt={emp.name} 
                      className="w-12 h-12 rounded-full border bg-gray-50"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">{emp.name}</h3>
                      <p className="text-sm text-gray-500">{emp.designation}</p>
                      <p className="text-xs text-primary mt-1">{emp.email}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
        {employees.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>No employees found. Add some users to get started!</p>
          </div>
        )}
      </div>

      {/* Employee Details Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Employee Details</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {loadingDetails ? (
                <div className="flex justify-center items-center py-12">
                  <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                </div>
              ) : selectedDetails ? (
                <div className="space-y-8">
                  {/* Profile Header */}
                  <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6 border-b pb-6">
                    <img 
                      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${selectedDetails.employee.name.replace(' ', '')}&backgroundColor=f3f4f6`}
                      alt={selectedDetails.employee.name} 
                      className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-gray-50 shrink-0"
                    />
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900">{selectedDetails.employee.name}</h3>
                      <p className="text-lg text-gray-600 font-medium">{selectedDetails.employee.designation}</p>
                      <div className="flex items-center space-x-4 mt-2 flex-wrap gap-y-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          <Briefcase className="w-3 h-3 mr-1" />
                          {selectedDetails.employee.department}
                        </span>
                        <span className="text-sm text-gray-500">{selectedDetails.employee.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Comprehensive Details */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl text-sm border border-gray-100">
                    <div><p className="text-gray-500 mb-1 text-xs uppercase tracking-wider font-semibold">Phone</p><p className="font-medium text-gray-900">{selectedDetails.employee.phone || 'N/A'}</p></div>
                    <div><p className="text-gray-500 mb-1 text-xs uppercase tracking-wider font-semibold">Joining Date</p><p className="font-medium text-gray-900">{selectedDetails.employee.joiningDate ? new Date(selectedDetails.employee.joiningDate).toLocaleDateString('en-GB') : 'N/A'}</p></div>
                    <div><p className="text-gray-500 mb-1 text-xs uppercase tracking-wider font-semibold">Salary</p><p className="font-medium text-emerald-600">${selectedDetails.employee.salary ? selectedDetails.employee.salary.toLocaleString() : 'N/A'}</p></div>
                    <div><p className="text-gray-500 mb-1 text-xs uppercase tracking-wider font-semibold">Gender</p><p className="font-medium text-gray-900">{selectedDetails.employee.gender || 'N/A'}</p></div>
                    <div><p className="text-gray-500 mb-1 text-xs uppercase tracking-wider font-semibold">Date of Birth</p><p className="font-medium text-gray-900">{selectedDetails.employee.dob ? new Date(selectedDetails.employee.dob).toLocaleDateString('en-GB') : 'N/A'}</p></div>
                    <div><p className="text-gray-500 mb-1 text-xs uppercase tracking-wider font-semibold">Address</p><p className="font-medium text-gray-900">{selectedDetails.employee.address || 'N/A'}</p></div>
                  </div>

                  {/* Payroll / LOP Info */}
                  {selectedDetails.employee.salary ? (
                    <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 mt-6">
                      <h4 className="text-lg font-semibold text-emerald-800 mb-4 flex items-center">
                        <Wallet className="w-5 h-5 mr-2" />
                        Payroll & LOP Calculation (Current Month)
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                          <p className="text-emerald-600/80 mb-1 text-sm">Monthly Salary</p>
                          <p className="font-bold text-emerald-900 text-lg">₹{Math.round(selectedDetails.employee.salary / 12).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-emerald-600/80 mb-1 text-sm">Per Day Pay (LOP Rate)</p>
                          <p className="font-bold text-emerald-900 text-lg">₹{Math.round((selectedDetails.employee.salary / 12) / 30).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-rose-600/80 mb-1 text-sm">LOP Days Taken</p>
                          <p className="font-bold text-rose-700 text-lg">
                            {(() => {
                              const currentMonth = new Date().getMonth();
                              const currentYear = new Date().getFullYear();
                              return (selectedDetails.leaves || []).filter(leave => {
                                const leaveDate = new Date(leave.startDate);
                                return leave.type === 'Loss of Pay' && 
                                       leave.status === 'Approved' && 
                                       leaveDate.getMonth() === currentMonth && 
                                       leaveDate.getFullYear() === currentYear;
                              }).reduce((acc, curr) => acc + curr.days, 0);
                            })()} Days
                          </p>
                        </div>
                        <div>
                          <p className="text-rose-600/80 mb-1 text-sm">Total LOP Deduction</p>
                          <p className="font-bold text-rose-700 text-lg">
                            ₹{(() => {
                              const currentMonth = new Date().getMonth();
                              const currentYear = new Date().getFullYear();
                              const days = (selectedDetails.leaves || []).filter(leave => {
                                const leaveDate = new Date(leave.startDate);
                                return leave.type === 'Loss of Pay' && 
                                       leave.status === 'Approved' && 
                                       leaveDate.getMonth() === currentMonth && 
                                       leaveDate.getFullYear() === currentYear;
                              }).reduce((acc, curr) => acc + curr.days, 0);
                              return Math.round(days * ((selectedDetails.employee.salary / 12) / 30)).toLocaleString();
                            })()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Emergency Contact */}
                  {selectedDetails.employee.emergencyContact && selectedDetails.employee.emergencyContact.name && (
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mt-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">Emergency Contact</h4>
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-gray-500 mb-1 text-sm">Name</p>
                          <p className="font-medium text-gray-900">{selectedDetails.employee.emergencyContact.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1 text-sm">Relationship</p>
                          <p className="font-medium text-gray-900">{selectedDetails.employee.emergencyContact.relationship}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-500 mb-1 text-sm">Phone Number</p>
                          <p className="font-medium text-gray-900">{selectedDetails.employee.emergencyContact.phone}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Assigned Tasks */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold flex items-center text-gray-800">
                      <ClipboardList className="w-5 h-5 mr-2 text-primary" />
                      Assigned Tasks
                    </h4>
                    
                    {selectedDetails.tasks && selectedDetails.tasks.length > 0 ? (
                      <div className="space-y-3">
                        {selectedDetails.tasks.map(task => (
                          <div key={task._id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{task.description}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Assigned: {new Date(task.createdAt).toLocaleDateString('en-GB')}
                              </p>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              task.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {task.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-gray-500 text-sm">
                        No tasks assigned to this employee yet.
                      </div>
                    )}
                  </div>

                  {/* Recent Attendance */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold flex items-center text-gray-800 mt-6 border-t pt-6">
                      <ClipboardList className="w-5 h-5 mr-2 text-primary" />
                      Recent Attendance
                    </h4>
                    
                    {selectedDetails.attendance && selectedDetails.attendance.length > 0 ? (
                      <div className="space-y-3">
                        {selectedDetails.attendance.map(att => (
                          <div key={att._id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{att.date}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Check In: {att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '-'} | Check Out: {att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '-'}
                              </p>
                              {att.summary && <p className="text-xs text-gray-500 mt-1 italic">{att.summary}</p>}
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              att.status === 'Auto-Leave' ? 'bg-rose-100 text-rose-700' : 
                              att.checkOutTime ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {att.status === 'Auto-Leave' ? 'Leave' : att.checkOutTime ? 'Present' : 'Working'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-gray-500 text-sm">
                        No recent attendance records found.
                      </div>
                    )}
                  </div>

                  {/* Leaves History */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold flex items-center text-gray-800 mt-6 border-t pt-6">
                      <ClipboardList className="w-5 h-5 mr-2 text-primary" />
                      Leaves History
                    </h4>
                    
                    {selectedDetails.leaves && selectedDetails.leaves.length > 0 ? (
                      <div className="space-y-3">
                        {selectedDetails.leaves.map(leave => (
                          <div key={leave._id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{leave.type} ({leave.days} Days)</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(leave.startDate).toLocaleDateString('en-GB')} to {new Date(leave.endDate).toLocaleDateString('en-GB')}
                              </p>
                              {leave.reason && <p className="text-xs text-gray-500 mt-1 italic">{leave.reason}</p>}
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                              leave.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                              leave.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {leave.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-gray-500 text-sm">
                        No leave records found.
                      </div>
                    )}
                  </div>

                  {/* Payslips */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold flex items-center text-gray-800 mt-6 border-t pt-6">
                      <ClipboardList className="w-5 h-5 mr-2 text-primary" />
                      Payslips
                    </h4>
                    
                    {selectedDetails.payslips && selectedDetails.payslips.length > 0 ? (
                      <div className="space-y-3">
                        {selectedDetails.payslips.map(slip => (
                          <div key={slip._id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-900">{slip.month}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Generated: {new Date(slip.createdAt).toLocaleDateString('en-GB')}
                              </p>
                            </div>
                            <p className="font-bold text-gray-900">
                              ${slip.netPay ? slip.netPay.toLocaleString() : 0}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-gray-500 text-sm">
                        No payslips found.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-rose-500 py-8">Failed to load details.</div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-2">
              {selectedDetails && selectedDetails.employee && (
                <>
                  <Button variant="outline" onClick={() => {
                    const emp = selectedDetails.employee;
                    setFormData({
                      name: emp.name || '',
                      email: emp.email || '',
                      department: emp.department || '',
                      designation: emp.designation || '',
                      phone: emp.phone || '',
                      address: emp.address || '',
                      gender: emp.gender || '',
                      dob: emp.dob ? new Date(emp.dob).toISOString().split('T')[0] : '',
                      joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().split('T')[0] : '',
                      salary: emp.salary || '',
                      emergencyContact: emp.emergencyContact || { name: '', relationship: '', phone: '' }
                    });
                    setEditingEmployeeId(emp._id);
                    setIsModalOpen(false); // Close details modal before opening edit form
                    setShowAddForm(true);
                  }} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200">
                    <Edit2 className="w-4 h-4 mr-2" /> Edit
                  </Button>
                  <Button variant="destructive" onClick={() => handleDeleteEmployee(selectedDetails.employee._id)}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Departments Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Manage Departments</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowDeptModal(false)} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <form onSubmit={handleAddDepartment} className="flex gap-2">
                <Input required value={newDeptName} onChange={e => setNewDeptName(e.target.value)} placeholder="New Department Name" />
                <Button type="submit">Add</Button>
              </form>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Existing Departments</h3>
                {departments.length > 0 ? (
                  departments.map(dept => (
                    <div key={dept._id} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 bg-gray-50">
                      {editingDeptId === dept._id ? (
                        <div className="flex flex-1 items-center gap-2 mr-2">
                          <Input value={editingDeptName} onChange={(e) => setEditingDeptName(e.target.value)} className="h-8" />
                          <Button size="icon" variant="ghost" onClick={() => handleEditDepartment(dept._id)} className="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 h-8 w-8">
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingDeptId(null)} className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 h-8 w-8">
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-gray-700">{dept.name}</span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingDeptId(dept._id); setEditingDeptName(dept.name); }} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8 w-8">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteDepartment(dept._id)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 w-8">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No departments found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
