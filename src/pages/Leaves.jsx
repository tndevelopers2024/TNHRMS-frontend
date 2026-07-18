import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, FileText, CheckCircle, Clock, XCircle, Plus, Loader2, Download } from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import toast from "react-hot-toast";
import { useConfirm } from "../context/ConfirmContext";

export default function Leaves() {
  const { confirm } = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('userInfo') || '{}');

  const [formData, setFormData] = useState({
    type: "Casual Leave",
    startDate: "",
    endDate: "",
    reason: "",
    attachment: ""
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch leaves and attendance from backend
  const fetchLeaves = async () => {
    if (!user._id) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/leaves/${user._id}`);
      const data = await res.json();
      setLeaves(data);
      
      const attRes = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/attendance/${user._id}`);
      const attData = await attRes.json();
      setAttendance(attData);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  // Calculate days between two dates
  const calculateDays = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s) || isNaN(e)) return 0;
    const diffTime = Math.abs(e - s);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    return diffDays;
  };

  const exportLeaveCSV = () => {
    if (!leaves || leaves.length === 0) {
      toast.error("No leave records to export");
      return;
    }
    
    const headers = ['Leave Type', 'Start Date', 'End Date', 'Days', 'Reason', 'Status'];
    const rows = leaves.map(leave => [
      leave.type || '-',
      leave.startDate ? new Date(leave.startDate).toLocaleDateString('en-GB') : '-',
      leave.endDate ? new Date(leave.endDate).toLocaleDateString('en-GB') : '-',
      leave.days || '0',
      `"${(leave.reason || '').replace(/"/g, '""')}"`,
      leave.status || 'Pending'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    // Generate dynamic filename
    const empName = user?.name ? user.name.replace(/\s+/g, '_') : 'Employee';
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `${empName}_Leave_History_${dateStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!user._id) return;
    if (!formData.startDate || !formData.endDate || !formData.reason) {
      toast.error("Please fill out all required fields.");
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (end < start) {
      toast.error("End date cannot be before start date.");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDateObj = new Date(formData.startDate);
    startDateObj.setHours(0, 0, 0, 0);

    if (startDateObj < today && formData.type !== "Sick Leave") {
      toast.error(`${formData.type} must be applied in advance. Only Sick Leave can be applied for past dates.`);
      return;
    }

    setSubmitting(true);
    const days = calculateDays(formData.startDate, formData.endDate);

    const balanceConfig = {
      "Casual Leave": 10,
      "Sick Leave": 10,
      "Earned Leave": 15
    };

    const maxDays = balanceConfig[formData.type];
    const currentlyUsed = calcUsed(formData.type);
    
    if (days > (maxDays - currentlyUsed)) {
      toast.error(`You only have ${maxDays - currentlyUsed} day(s) of ${formData.type} remaining.`);
      setSubmitting(false);
      return;
    }

    try {
      const data = new FormData();
      data.append('employee', user._id);
      data.append('type', formData.type);
      data.append('startDate', formData.startDate);
      data.append('endDate', formData.endDate);
      data.append('days', days);
      data.append('reason', formData.reason);
      if (formData.attachment) {
        data.append('attachment', formData.attachment);
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/leaves`, {
        method: 'POST',
        body: data
      });

      if (res.ok) {
        const newLeave = await res.json();
        setLeaves([newLeave, ...leaves]);
        setShowForm(false);
        setFormData({ type: "Casual Leave", startDate: "", endDate: "", reason: "", attachment: "" });
        toast.success("Leave applied successfully");
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Failed to apply for leave");
      }
    } catch (err) {
      console.error("Error applying leave:", err);
      toast.error("Failed to connect to server");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should not exceed 5MB.");
        e.target.value = '';
        return;
      }
      setFormData(prev => ({ ...prev, attachment: file }));
    }
  };

  const handleCancelLeave = async (leaveId) => {
    confirm({
      title: "Cancel Leave",
      message: "Are you sure you want to cancel this leave request?",
      confirmText: "Cancel Request",
      action: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/leaves/${leaveId}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            setLeaves(leaves.filter(l => l._id !== leaveId));
            toast.success("Leave cancelled successfully");
          } else {
            const errorData = await res.json();
            toast.error(errorData.message || "Failed to cancel leave");
          }
        } catch (err) {
          console.error("Error cancelling leave:", err);
          toast.error("Failed to cancel leave");
        }
      }
    });
  };

  const canCancel = (startDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    return today < start;
  };

  // Calculate dynamically from fetched data (Only count Approved leaves)
  const calcUsed = (type) => {
    let used = leaves
      .filter(l => l.type === type && (l.status === 'Approved' || l.status === 'Pending'))
      .reduce((acc, curr) => acc + curr.days, 0);
      
    if (type === 'Casual Leave') {
      const autoLeaves = attendance.filter(a => a.status === 'Auto-Leave').length;
      used += autoLeaves;
    }
    return used;
  };

  const leaveBalances = [
    { type: "Casual Leave", total: 10, used: calcUsed("Casual Leave"), color: "bg-primary" },
    { type: "Sick Leave", total: 10, used: calcUsed("Sick Leave"), color: "bg-rose-500" },
    { type: "Earned Leave", total: 15, used: calcUsed("Earned Leave"), color: "bg-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Leave Management</h1>
          <p className="text-muted-foreground mt-1">Track your balances and apply for leaves.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"} className={!showForm ? "bg-primary text-white" : ""}>
          {showForm ? "Cancel" : <><Plus className="w-4 h-4 mr-2" /> Apply Leave</>}
        </Button>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {leaveBalances.map((leave, i) => {
          const percentage = Math.min((leave.used / leave.total) * 100, 100);
          return (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-700">{leave.type}</h3>
                  <div className="p-2 bg-gray-50 rounded-xl">
                    <FileText className="w-5 h-5 text-gray-500" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-end text-sm">
                    <span className="text-3xl font-bold text-gray-900">{leave.total - leave.used}</span>
                    <span className="text-muted-foreground font-medium mb-1">/ {leave.total} left</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${leave.color} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                  </div>
                  <p className="text-xs text-muted-foreground text-right">{leave.used} days used</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Apply Leave Form */}
      {showForm && (
        <Card className="border-0 shadow-sm bg-gray-50/50 animate-in slide-in-from-top-4 fade-in duration-300">
          <CardHeader>
            <CardTitle>New Leave Application</CardTitle>
            <CardDescription>Fill out the details to request time off.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleApplyLeave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Leave Type</Label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="flex h-10 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <option>Casual Leave</option>
                    <option>Sick Leave</option>
                    <option>Earned Leave</option>
                    <option>Loss of Pay</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Attachment (Optional) - Max 2MB</Label>
                  <Input type="file" className="bg-white" onChange={handleFileChange} />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <DatePicker 
                    value={formData.startDate}
                    onChange={(val) => setFormData({...formData, startDate: val})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <DatePicker 
                    value={formData.endDate}
                    onChange={(val) => setFormData({...formData, endDate: val})}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea 
                  placeholder="Please describe the reason for your leave..." 
                  className="bg-white min-h-[100px]" 
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" className="px-8 shadow-md" disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Submit Request
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Leave History Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="bg-white border-b border-gray-50 flex flex-row items-center justify-between pb-4">
          <CardTitle>Leave History</CardTitle>
          <Button onClick={exportLeaveCSV} variant="outline" size="sm" className="h-9 text-emerald-600 border-emerald-200 hover:bg-emerald-50 mt-0">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
        </CardHeader>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : leaves.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/80">
                <tr>
                  <th className="px-6 py-4 font-medium">Leave Type</th>
                  <th className="px-6 py-4 font-medium">Duration</th>
                  <th className="px-6 py-4 font-medium">Days</th>
                  <th className="px-6 py-4 font-medium">Reason</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leaves.map((row) => (
                  <tr key={row._id} className="bg-white hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{row.type}</td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-2 text-gray-400" />
                        {new Date(row.startDate).toLocaleDateString('en-GB')} - {new Date(row.endDate).toLocaleDateString('en-GB')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{row.days}</td>
                    <td className="px-6 py-4 text-gray-600 truncate max-w-[200px]" title={row.reason}>{row.reason}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        row.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                        row.status === 'Rejected' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {row.status === 'Approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {row.status === 'Rejected' && <XCircle className="w-3 h-3 mr-1" />}
                        {row.status === 'Pending' && <Clock className="w-3 h-3 mr-1" />}
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {canCancel(row.startDate) ? (
                        <Button variant="ghost" size="sm" onClick={() => handleCancelLeave(row._id)} className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 px-2">
                          Cancel
                        </Button>
                      ) : (
                        <span className="text-gray-400 text-xs italic">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No leave history</h3>
              <p className="text-gray-500 mt-1">You haven't requested any leaves yet.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
