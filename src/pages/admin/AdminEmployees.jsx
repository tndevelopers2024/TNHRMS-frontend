import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Users, Briefcase, X, ClipboardList, Settings2, Trash2, Edit2, Check, Wallet, User, Search, Lock, Unlock } from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import toast from "react-hot-toast";
import { useConfirm } from "../../context/ConfirmContext";
import { useSocket } from "../../context/SocketContext";
import { DocumentViewerModal } from "../../components/DocumentViewerModal";

export default function AdminEmployees() {
  const { confirm } = useConfirm();
  const socket = useSocket();
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
  const [isSaving, setIsSaving] = useState(false);
  const [viewerData, setViewerData] = useState({ isOpen: false, url: '' });

  const [formData, setFormData] = useState({
    name: '', email: '', secondaryEmail: '', employmentType: 'fulltime', department: '', designation: '', phone: '', address: '', gender: '', dob: '', joiningDate: '', salary: '',
    emergencyContact: { name: '', relationship: '', phone: '' }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('');

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNotification = (notif) => {
      if (notif.type === 'profile_update' || notif.type === 'employee_registered') {
        fetchEmployees();
      }
    };
    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, [socket]);

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

  const handleOfferLetterUpload = async (e, empId) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('offerLetter', file);

    const toastId = toast.loading('Uploading offer letter...');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/employees/${empId}/offer-letter`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        toast.success('Offer letter uploaded successfully', { id: toastId });
        handleCardClick(empId);
      } else {
        const data = await res.json();
        toast.error(data.message || 'Failed to upload', { id: toastId });
      }
    } catch (err) {
      toast.error('An error occurred', { id: toastId });
      console.error(err);
    }
    // reset file input
    e.target.value = null;
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
    confirm({
      title: "Delete Department",
      message: "Are you sure? Employees in this department will be moved to 'General'.",
      confirmText: "Delete",
      action: async () => {
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
      }
    });
  };

  const handleApproveProfile = async (empId) => {
    confirm({
      title: "Approve Updates",
      message: "Are you sure you want to approve these profile updates? This will overwrite the employee's current live data.",
      confirmText: "Approve",
      action: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/employees/${empId}/approve-profile`, { method: 'POST' });
          if (res.ok) {
            toast.success("Profile updates approved successfully");
            fetchEmployees();
            handleCardClick(empId); // refresh modal
          } else {
            const err = await res.json();
            toast.error(err.message || 'Failed to approve updates');
          }
        } catch (err) {
          console.error(err);
          toast.error('An error occurred');
        }
      }
    });
  };

  const handleRejectProfile = async (empId) => {
    confirm({
      title: "Reject Updates",
      message: "Are you sure you want to reject these profile changes? Please provide a reason.",
      confirmText: "Reject",
      showInput: true,
      inputPlaceholder: "Reason for rejection...",
      action: async (reason) => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/employees/${empId}/reject-profile`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason }) 
          });
          if (res.ok) {
            toast.success("Profile updates rejected and discarded");
            fetchEmployees();
            handleCardClick(empId); // refresh modal
          } else {
            const err = await res.json();
            toast.error(err.message || 'Failed to reject updates');
          }
        } catch (err) {
          console.error(err);
          toast.error('An error occurred');
        }
      }
    });
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    setIsSaving(true);
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
        setFormData({ name: '', email: '', secondaryEmail: '', employmentType: 'fulltime', department: '', designation: '', phone: '', address: '', gender: '', dob: '', joiningDate: '', salary: '', emergencyContact: { name: '', relationship: '', phone: '' } });
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEmployee = async (empId) => {
    confirm({
      title: "Delete Employee",
      message: "Are you sure you want to delete this employee? This action cannot be undone.",
      confirmText: "Delete",
      action: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/employees/${empId}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            setIsModalOpen(false);
            fetchEmployees();
            toast.success("Employee deleted successfully");
          } else {
            const errorData = await res.json();
            toast.error(errorData.message || 'Failed to delete employee');
          }
        } catch (err) {
          console.error("Error deleting employee:", err);
          toast.error("An error occurred while deleting employee");
        }
      }
    });
  };

  const handleToggleLock = async (empId, currentStatus, e) => {
    e.stopPropagation();
    confirm({
      title: currentStatus ? "Lock Employee" : "Unlock Employee",
      message: `Are you sure you want to ${currentStatus ? 'lock' : 'unlock'} this employee? ${currentStatus ? 'They will not be able to log in.' : 'They will regain access to their account.'}`,
      confirmText: currentStatus ? "Lock" : "Unlock",
      action: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/employees/${empId}/toggle-lock`, { method: 'PUT' });
          if (res.ok) {
            toast.success(`Employee ${currentStatus ? 'locked' : 'unlocked'} successfully`);
            fetchEmployees();
          } else {
            const err = await res.json();
            toast.error(err.message || 'Failed to toggle lock status');
          }
        } catch (err) {
          console.error(err);
          toast.error('An error occurred');
        }
      }
    });
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (emp.designation && emp.designation.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDept = departmentFilter ? emp.department === departmentFilter : true;
    const matchesEmpType = employmentTypeFilter ? emp.employmentType === employmentTypeFilter : true;
    return matchesSearch && matchesDept && matchesEmpType;
  });

  // Group employees by department
  const employeesByDepartment = filteredEmployees.reduce((acc, emp) => {
    const dept = emp.department || 'General';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(emp);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <DocumentViewerModal isOpen={viewerData.isOpen} url={viewerData.url} onClose={() => setViewerData({ isOpen: false, url: '' })} />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Employees Directory</h1>
          <p className="text-muted-foreground mt-1">Manage users and organize them by department.</p>
        </div>
        <Button onClick={() => {
          setEditingEmployeeId(null);
          setFormData({ name: '', email: '', secondaryEmail: '', employmentType: 'fulltime', department: '', designation: '', phone: '', address: '', gender: '', dob: '', joiningDate: '', salary: '', emergencyContact: { name: '', relationship: '', phone: '' } });
          setShowAddForm(!showAddForm);
        }} className="bg-primary hover:bg-primary/90 text-white shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          {showAddForm ? "Cancel" : "Add Employee"}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search employees by name, email or designation..." 
            className="pl-9 bg-gray-50/50 border-gray-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <select 
            className="flex h-10 w-full rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            value={employmentTypeFilter}
            onChange={(e) => setEmploymentTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="fulltime">Full-Time</option>
            <option value="freelancer">Freelancer</option>
            <option value="intern">Intern</option>
            <option value="contractor">Contractor</option>
          </select>
        </div>
        <div className="w-full sm:w-64">
          <select 
            className="flex h-10 w-full rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept._id} value={dept.name}>{dept.name}</option>
            ))}
          </select>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 !mt-0 z-50 flex items-start pt-10 justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">{editingEmployeeId ? "Edit Employee" : "Add New Employee"}</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 pt-2 overflow-y-auto">
              <form onSubmit={handleSaveEmployee} className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                  {/* Basic Details */}
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="Email" />
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Email</Label>
                    <Input type="email" value={formData.secondaryEmail} onChange={e => setFormData({...formData, secondaryEmail: e.target.value})} placeholder="Secondary Email" />
                  </div>
                  
                  {/* Work Details */}
                  <div className="space-y-2">
                    <Label>Employment Type</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.employmentType} onChange={e => setFormData({...formData, employmentType: e.target.value})}>
                      <option value="fulltime">Full-Time</option>
                      <option value="freelancer">Freelancer</option>
                      <option value="intern">Intern</option>
                      <option value="contractor">Contractor</option>
                    </select>
                  </div>
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
                    <DatePicker value={formData.joiningDate} onChange={val => setFormData({...formData, joiningDate: val})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Salary (Annual)</Label>
                    <Input type="number" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} placeholder="e.g. 500000 for 5 LPA" />
                  </div>

                  {/* Personal Details */}
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="e.g. +1 234 567 8900" />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                      <option value="" disabled>Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <DatePicker value={formData.dob} onChange={val => setFormData({...formData, dob: val})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="e.g. 123 Main St, City" />
                  </div>

                  {/* Emergency Contact */}
                  <div className="col-span-1 md:col-span-2 space-y-4 pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Emergency Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={formData.emergencyContact?.name || ''} onChange={e => setFormData({...formData, emergencyContact: {...(formData.emergencyContact || {}), name: e.target.value}})} placeholder="e.g. Jane Doe" />
                      </div>
                      <div className="space-y-2">
                        <Label>Relationship</Label>
                        <Input value={formData.emergencyContact?.relationship || ''} onChange={e => setFormData({...formData, emergencyContact: {...(formData.emergencyContact || {}), relationship: e.target.value}})} placeholder="e.g. Spouse" />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input value={formData.emergencyContact?.phone || ''} onChange={e => setFormData({...formData, emergencyContact: {...(formData.emergencyContact || {}), phone: e.target.value}})} placeholder="e.g. +1 555 987 6543" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-4 border-t border-gray-100 mt-6">
                  <Button type="button" variant="outline" className="mr-2" onClick={() => setShowAddForm(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : (editingEmployeeId ? "Save Changes" : "Save Employee")}
                  </Button>
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
                  <CardContent className="p-5 flex items-center space-x-4 relative">
                    <img 
                      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${emp.name.replace(' ', '')}&backgroundColor=f3f4f6`}
                      alt={emp.name} 
                      className={`w-12 h-12 rounded-full border ${emp.isActive === false ? 'opacity-50 grayscale' : 'bg-gray-50'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold text-gray-900 truncate ${emp.isActive === false ? 'line-through text-gray-500' : ''}`}>
                          {emp.name}
                          {emp.employeeId && <span className="ml-2 text-xs font-normal text-gray-500">({emp.employeeId})</span>}
                        </h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleToggleLock(emp._id, emp.isActive !== false, e)}
                          className={`h-8 w-8 rounded-full hover:bg-gray-100 ${emp.isActive === false ? 'text-rose-500 hover:text-rose-600' : 'text-gray-400 hover:text-gray-600'}`}
                          title={emp.isActive === false ? 'Unlock Employee' : 'Lock Employee'}
                        >
                          {emp.isActive === false ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{emp.designation}</p>
                      <p className="text-xs text-primary mt-1 truncate">{emp.email}</p>
                      {emp.pendingProfileUpdates && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                            Updates Pending
                          </span>
                        </div>
                      )}
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
        <div className="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom-4">
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
                  {(() => {
                    const p = selectedDetails.employee.pendingProfileUpdates;
                    if (!p) return null;
                    const old = selectedDetails.employee;
                    let hasChanges = false;
                    
                    Object.entries(p).forEach(([key, value]) => {
                      if (!['documents', 'bankingDetails', 'emergencyContact', 'professionalReferences'].includes(key)) {
                        const oldValue = old[key];
                        if (value !== oldValue && !(!value && !oldValue)) {
                          if ((key === 'dob' || key === 'joiningDate') && value && oldValue) {
                            if (new Date(value).getTime() !== new Date(oldValue).getTime()) hasChanges = true;
                          } else {
                            hasChanges = true;
                          }
                        }
                      }
                    });

                    if (p.bankingDetails) {
                      Object.entries(p.bankingDetails).forEach(([k, v]) => {
                        if (v !== old.bankingDetails?.[k] && !(!v && !old.bankingDetails?.[k])) hasChanges = true;
                      });
                    }

                    if (p.emergencyContact) {
                      Object.entries(p.emergencyContact).forEach(([k, v]) => {
                        if (v !== old.emergencyContact?.[k] && !(!v && !old.emergencyContact?.[k])) hasChanges = true;
                      });
                    }

                    if (p.documents) {
                      Object.entries(p.documents).forEach(([k, v]) => {
                        if (v && v !== old.documents?.[k]) hasChanges = true;
                      });
                    }

                    if (p.professionalReferences && p.professionalReferences.length > 0) hasChanges = true;

                    if (!hasChanges) return null;

                    return (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
                        <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center">
                          <svg className="w-6 h-6 text-amber-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <h4 className="text-lg font-bold text-amber-800">Pending Profile Updates</h4>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => handleRejectProfile(selectedDetails.employee._id)}
                            className="bg-rose-100 hover:bg-rose-200 text-rose-700" 
                            size="sm"
                          >
                            Reject
                          </Button>
                          <Button 
                            onClick={() => handleApproveProfile(selectedDetails.employee._id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white" 
                            size="sm"
                          >
                            Approve Updates
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-amber-700 mb-4">The employee has submitted the following profile updates. Approving will overwrite their live profile data.</p>
                      
                      <div className="bg-white rounded-lg border border-amber-100 overflow-hidden">
                        <div className="p-4 bg-amber-50/50 border-b border-amber-100">
                           <p className="font-semibold text-gray-800">Submitted Data</p>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
                            {Object.entries(selectedDetails.employee.pendingProfileUpdates).filter(([key, value]) => {
                              if (['documents', 'bankingDetails', 'emergencyContact', 'professionalReferences'].includes(key)) return false;
                              const oldValue = selectedDetails.employee[key];
                              if (!value && !oldValue) return false;
                              if (value === oldValue) return false;
                              if ((key === 'dob' || key === 'joiningDate') && value && oldValue) {
                                if (new Date(value).getTime() === new Date(oldValue).getTime()) return false;
                              }
                              return true;
                            }).map(([key, value]) => (
                                <div key={key}>
                                  <p className="text-gray-500 mb-1 text-xs uppercase tracking-wider font-semibold">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                  <p className="font-medium text-gray-900">{value || 'N/A'}</p>
                                </div>
                            ))}
                          </div>
                          
                          {(() => {
                            const pendingBanking = selectedDetails.employee.pendingProfileUpdates.bankingDetails || {};
                            const oldBanking = selectedDetails.employee.bankingDetails || {};
                            const changedBanking = Object.entries(pendingBanking).filter(([k, v]) => v !== oldBanking[k] && !(!v && !oldBanking[k]));
                            
                            if (changedBanking.length === 0) return null;
                            
                            return (
                              <div className="mb-6">
                                <h5 className="font-semibold text-gray-800 mb-2 border-b pb-1">Banking Details</h5>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  {changedBanking.map(([key, value]) => (
                                    <div key={key}>
                                      <p className="text-gray-500 mb-1 text-xs uppercase tracking-wider font-semibold">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                      <p className="font-medium text-gray-900">{value || 'N/A'}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {(() => {
                            const pendingEmergency = selectedDetails.employee.pendingProfileUpdates.emergencyContact || {};
                            const oldEmergency = selectedDetails.employee.emergencyContact || {};
                            const changedEmergency = Object.entries(pendingEmergency).filter(([k, v]) => v !== oldEmergency[k] && !(!v && !oldEmergency[k]));
                            
                            if (changedEmergency.length === 0) return null;
                            
                            return (
                              <div className="mb-6">
                                <h5 className="font-semibold text-gray-800 mb-2 border-b pb-1">Emergency Contact</h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                  {changedEmergency.map(([key, value]) => (
                                    <div key={key}>
                                      <p className="text-gray-500 mb-1 text-xs uppercase tracking-wider font-semibold">{key}</p>
                                      <p className="font-medium text-gray-900">{value || 'N/A'}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {selectedDetails.employee.pendingProfileUpdates.professionalReferences && selectedDetails.employee.pendingProfileUpdates.professionalReferences.length > 0 && (
                            <div className="mb-6">
                              <h5 className="font-semibold text-gray-800 mb-2 border-b pb-1">Professional References</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                {selectedDetails.employee.pendingProfileUpdates.professionalReferences.map((ref, idx) => (
                                  <div key={idx} className="p-3 border rounded-lg bg-gray-50/50">
                                    <p className="font-semibold text-gray-900">{ref.name}</p>
                                    <p className="text-gray-600 text-xs">Desig: {ref.designation || 'N/A'}</p>
                                    <p className="text-gray-600 text-xs">Company: {ref.company || 'N/A'}</p>
                                    <p className="text-gray-600 text-xs">Phone: {ref.contactNumber || 'N/A'}</p>
                                    <p className="text-gray-600 text-xs">Email: {ref.email || 'N/A'}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(() => {
                            const pendingDocs = selectedDetails.employee.pendingProfileUpdates.documents || {};
                            const oldDocs = selectedDetails.employee.documents || {};
                            const changedDocs = Object.entries(pendingDocs).filter(([k, v]) => v && v !== oldDocs[k]);
                            
                            if (changedDocs.length === 0) return null;
                            
                            return (
                              <div>
                                <h5 className="font-semibold text-gray-800 mb-2 border-b pb-1">Uploaded Documents</h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                  {changedDocs.map(([key, value]) => {
                                    return (
                                      <button 
                                        key={key} 
                                        onClick={(e) => { e.preventDefault(); setViewerData({ isOpen: true, url: `${import.meta.env.VITE_API_URL}${value}` }); }}
                                        className="p-2 border rounded hover:border-primary hover:bg-primary/5 flex items-center transition-colors"
                                      >
                                        <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center mr-2 text-blue-600 shrink-0">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                          </svg>
                                        </div>
                                        <span className="text-xs font-medium text-gray-700 capitalize truncate w-full ml-2 text-left">{key === 'passport' ? 'Passport / Driving Licence' : key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    );
                  })()}

                  {/* Profile Header */}
                  <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6 border-b pb-6">
                    <img 
                      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${selectedDetails.employee.name.replace(' ', '')}&backgroundColor=f3f4f6`}
                      alt={selectedDetails.employee.name} 
                      className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-gray-50 shrink-0"
                    />
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {selectedDetails.employee.name}
                        {selectedDetails.employee.employeeId && <span className="ml-3 text-lg font-medium text-gray-500">({selectedDetails.employee.employeeId})</span>}
                      </h3>
                      <p className="text-lg text-gray-600 font-medium">{selectedDetails.employee.designation}</p>
                      <div className="flex items-center space-x-4 mt-2 flex-wrap gap-y-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          <Briefcase className="w-3 h-3 mr-1" />
                          {selectedDetails.employee.department}
                        </span>
                        <span className="text-sm text-gray-500">{selectedDetails.employee.email}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {selectedDetails.employee.documents?.offerLetter && (
                        <button 
                          onClick={(e) => { e.preventDefault(); setViewerData({ isOpen: true, url: selectedDetails.employee.documents.offerLetter }); }}
                          className="inline-flex items-center justify-center px-4 py-2 bg-white text-primary border border-primary hover:bg-primary/5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                          View Offer Letter
                        </button>
                      )}
                      <input 
                        type="file" 
                        id="offer-letter-upload" 
                        className="hidden" 
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        onChange={(e) => handleOfferLetterUpload(e, selectedDetails.employee._id)}
                      />
                      <label 
                        htmlFor="offer-letter-upload" 
                        className="cursor-pointer inline-flex items-center justify-center px-4 py-2 bg-primary text-white hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors shadow-sm"
                      >
                        <Plus className="w-4 h-4 mr-2" /> {selectedDetails.employee.documents?.offerLetter ? 'Update' : 'Upload'} Offer Letter
                      </label>
                    </div>
                  </div>

                  {/* Comprehensive Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl text-sm border border-gray-100">
                    <div><p className="text-gray-500 mb-1 text-xs uppercase tracking-wider font-semibold">Phone</p><p className="font-medium text-gray-900">{selectedDetails.employee.phone || 'N/A'}</p></div>
                    <div><p className="text-gray-500 mb-1 text-xs uppercase tracking-wider font-semibold">Secondary Email</p><p className="font-medium text-gray-900">{selectedDetails.employee.secondaryEmail || 'N/A'}</p></div>
                    <div><p className="text-gray-500 mb-1 text-xs uppercase tracking-wider font-semibold">Emp. Type</p><p className="font-medium text-gray-900 capitalize">{selectedDetails.employee.employmentType || 'fulltime'}</p></div>
                    <div><p className="text-gray-500 mb-1 text-xs uppercase tracking-wider font-semibold">Joining Date</p><p className="font-medium text-gray-900">{selectedDetails.employee.joiningDate ? new Date(selectedDetails.employee.joiningDate).toLocaleDateString('en-GB') : 'N/A'}</p></div>
                    <div><p className="text-gray-500 mb-1 text-xs uppercase tracking-wider font-semibold">Salary</p><p className="font-medium text-emerald-600">₹{selectedDetails.employee.salary ? selectedDetails.employee.salary.toLocaleString() : 'N/A'}</p></div>
                    <div><p className="text-gray-500 mb-1 text-xs uppercase tracking-wider font-semibold">Gender</p><p className="font-medium text-gray-900">{selectedDetails.employee.gender || 'N/A'}</p></div>
                    <div><p className="text-gray-500 mb-1 text-xs uppercase tracking-wider font-semibold">Date of Birth</p><p className="font-medium text-gray-900">{selectedDetails.employee.dob ? new Date(selectedDetails.employee.dob).toLocaleDateString('en-GB') : 'N/A'}</p></div>
                    <div><p className="text-gray-500 mb-1 text-xs uppercase tracking-wider font-semibold">Marital Status</p><p className="font-medium text-gray-900">{selectedDetails.employee.maritalStatus || 'N/A'}</p></div>
                    <div><p className="text-gray-500 mb-1 text-xs uppercase tracking-wider font-semibold">Blood Group</p><p className="font-medium text-gray-900">{selectedDetails.employee.bloodGroup || 'N/A'}</p></div>
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

                  {/* Banking Details */}
                  {selectedDetails.employee.bankingDetails && selectedDetails.employee.bankingDetails.accountNumber && (
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mt-6">
                      <h4 className="text-lg font-semibold text-gray-800 mb-4">Banking Details</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                          <p className="text-gray-500 mb-1 text-sm">Account Holder</p>
                          <p className="font-medium text-gray-900">{selectedDetails.employee.bankingDetails.accountHolderName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1 text-sm">Bank Name</p>
                          <p className="font-medium text-gray-900">{selectedDetails.employee.bankingDetails.bankName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1 text-sm">Account Number</p>
                          <p className="font-medium text-gray-900">{selectedDetails.employee.bankingDetails.accountNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1 text-sm">IFSC Code</p>
                          <p className="font-medium text-gray-900">{selectedDetails.employee.bankingDetails.ifscCode || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-1 text-sm">UAN</p>
                          <p className="font-medium text-gray-900">{selectedDetails.employee.bankingDetails.uan || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Uploaded Documents */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mt-6 border-t pt-6">
                      <h4 className="text-lg font-semibold flex items-center text-gray-800">
                        <ClipboardList className="w-5 h-5 mr-2 text-primary" />
                        Uploaded Documents
                      </h4>
                    </div>
                    {selectedDetails.employee.documents && Object.keys(selectedDetails.employee.documents).length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(selectedDetails.employee.documents).map(([key, value]) => {
                          if (!value) return null;
                          return (
                            <button 
                              key={key} 
                              onClick={(e) => { e.preventDefault(); setViewerData({ isOpen: true, url: `${import.meta.env.VITE_API_URL}${value}` }); }}
                              className="p-3 border rounded-lg hover:border-primary hover:bg-primary/5 flex items-center transition-colors"
                            >
                              <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center mr-3 text-blue-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                              </div>
                              <span className="text-sm font-medium text-gray-700 capitalize truncate w-full text-left">{key === 'passport' ? 'Passport / Driving Licence' : key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="p-6 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50 text-gray-500 text-sm">
                        No documents found.
                      </div>
                    )}
                  </div>

                  {/* Professional References */}
                  {selectedDetails.employee.professionalReferences && selectedDetails.employee.professionalReferences.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold flex items-center text-gray-800 mt-6 border-t pt-6">
                        <User className="w-5 h-5 mr-2 text-primary" />
                        Professional References
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedDetails.employee.professionalReferences.map((ref, idx) => (
                          <div key={idx} className="p-4 border rounded-xl bg-gray-50 text-sm">
                            <p className="font-semibold text-gray-900 mb-2">{ref.name}</p>
                            <p className="text-gray-600"><span className="text-gray-400">Desig:</span> {ref.designation || 'N/A'}</p>
                            <p className="text-gray-600"><span className="text-gray-400">Company:</span> {ref.company || 'N/A'}</p>
                            <p className="text-gray-600"><span className="text-gray-400">Phone:</span> {ref.contactNumber || 'N/A'}</p>
                            <p className="text-gray-600"><span className="text-gray-400">Email:</span> {ref.email || 'N/A'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
                      secondaryEmail: emp.secondaryEmail || '',
                      employmentType: emp.employmentType || 'fulltime',
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
        <div className="fixed inset-0 !mt-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
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

      <DocumentViewerModal 
        isOpen={viewerData.isOpen} 
        fileUrl={viewerData.url} 
        onClose={() => setViewerData({ isOpen: false, url: '' })} 
      />
    </div>
  );
}
