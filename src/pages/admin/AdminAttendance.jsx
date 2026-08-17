import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Activity, FileText, Search, Clock, Download, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useConfirm } from "../../context/ConfirmContext";
import { useSocket } from "../../context/SocketContext";

export default function AdminAttendance() {
  const [activeTab, setActiveTab] = useState('today'); // 'today' or 'reports'
  const [todayData, setTodayData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { confirm } = useConfirm();
  
  // Filters for Today's Status
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('');

  // Employee Reports States
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [employeeAttendance, setEmployeeAttendance] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [reportTab, setReportTab] = useState('daily'); // 'daily', 'weekly', 'monthly'
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');

  const socket = useSocket();

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('/')) return `${import.meta.env.VITE_API_URL}${url}`;
    return url;
  };

  useEffect(() => {
    fetchTodayAttendance();
    fetchEmployees();
    fetchHolidays();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNotif = (notif) => {
      if (notif.type === 'attendance_update') {
        fetchTodayAttendance();
        if (activeTab === 'reports' && selectedEmployeeId) {
          fetchEmployeeAttendance(selectedEmployeeId);
        }
      }
    };
    socket.on('notification', handleNotif);
    return () => socket.off('notification', handleNotif);
  }, [socket, activeTab, selectedEmployeeId]);

  const fetchTodayAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/attendance/today`);
      const data = await res.json();
      setTodayData(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch today's attendance");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/employees`);
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHolidays = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/holidays`);
      const data = await res.json();
      setHolidays(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEmployeeAttendance = async (userId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/attendance/${userId}`);
      const data = await res.json();
      setEmployeeAttendance(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch employee attendance");
    }
  };

  const handleEmployeeSelect = (e) => {
    const id = e.target.value;
    setSelectedEmployeeId(id);
    if (id) {
      fetchEmployeeAttendance(id);
    } else {
      setEmployeeAttendance([]);
    }
  };

  const navigateToReport = (employeeId) => {
    setSelectedEmployeeId(employeeId);
    fetchEmployeeAttendance(employeeId);
    setActiveTab('reports');
  };

  const handleMarkPresent = async (recordId) => {
    confirm({
      title: "Mark as Present",
      message: "Are you sure you want to mark this employee as present? This will simulate an 8-hour shift and refund any auto-deducted salary.",
      confirmText: "Mark Present",
      cancelText: "Cancel",
      action: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/attendance/${recordId}/mark-present`, {
            method: 'PUT'
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message);
          toast.success("Successfully marked as present.");
          if (selectedEmployeeId) {
            fetchEmployeeAttendance(selectedEmployeeId);
          }
        } catch (err) {
          toast.error(err.message || "Failed to mark as present.");
        }
      }
    });
  };

  // Mark a missing day (no check-in at all) as Leave
  const handleMarkAbsent = async (date) => {
    confirm({
      title: "Mark as Leave",
      message: `Mark ${date} as a Leave day? This will create an attendance record showing the employee was absent.`,
      confirmText: "Mark as Leave",
      cancelText: "Cancel",
      action: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/attendance/mark-absent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId: selectedEmployeeId, date }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message);
          toast.success('Day marked as Leave.');
          fetchEmployeeAttendance(selectedEmployeeId);
        } catch (err) {
          toast.error(err.message || 'Failed to mark as leave.');
        }
      }
    });
  };

  // Create a record for a missing day and mark it Present
  const handleCreateAndMarkPresent = async (date) => {
    confirm({
      title: "Mark as Present",
      message: `Mark ${date} as a Present day? This will create an 8-hour attendance record for this employee.`,
      confirmText: "Mark Present",
      cancelText: "Cancel",
      action: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/attendance/create-and-mark-present`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId: selectedEmployeeId, date }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message);
          toast.success('Day marked as Present.');
          fetchEmployeeAttendance(selectedEmployeeId);
        } catch (err) {
          toast.error(err.message || 'Failed to mark as present.');
        }
      }
    });
  };

  const departments = [...new Set(employees.map(e => e.department))].filter(Boolean);

  const filteredTodayData = todayData.filter(record => {
    const matchesSearch = record.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          record.employee.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = departmentFilter ? record.employee.department === departmentFilter : true;
    const matchesEmpType = employmentTypeFilter ? record.employee.employmentType === employmentTypeFilter : true;
    return matchesSearch && matchesDept && matchesEmpType;
  });

  const exportTodayCSV = () => {
    const headers = ['Employee', 'Department', 'Check In', 'Check Out', 'Status'];
    const rows = filteredTodayData.map(record => {
      const emp = record.employee;
      const att = record.attendance;
      const isCheckedIn = !!att?.checkInTime;
      const isCheckedOut = !!att?.checkOutTime;
      const isAutoLeave = att?.status === 'Auto-Leave';
      
      let status = 'Not Checked In';
      if (isAutoLeave) status = 'Leave';
      else if (isCheckedOut) status = 'Completed';
      else if (isCheckedIn) status = 'Working';
      
      return [
        `"${emp.name}"`,
        `"${emp.department}"`,
        isCheckedIn ? new Date(att.checkInTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '-',
        isCheckedOut ? new Date(att.checkOutTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '-',
        status
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `today_status.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const availableYears = [...new Set(employeeAttendance.map(record => {
    return new Date(record.date).getFullYear().toString();
  }))].sort((a, b) => b - a);
  availableYears.unshift('All');

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const availableMonths = ['All', ...months];

  const filteredHistory = employeeAttendance.filter(record => {
    const recordDate = new Date(record.date);
    const recordYear = recordDate.getFullYear().toString();
    const recordMonthName = recordDate.toLocaleString('default', { month: 'long' });

    const yearMatch = selectedYear === 'All' || recordYear === selectedYear;
    const monthMatch = selectedMonth === 'All' || recordMonthName === selectedMonth;

    return yearMatch && monthMatch;
  });

  // Helper: check if a date (JS Date) is a working day (Mon-Sat, excluding 2nd Saturday)
  const isWorkingDay = (d) => {
    const day = d.getDay(); // 0=Sun, 6=Sat
    if (day === 0) return false; // Sunday off
    if (day === 6) {
      // 2nd Saturday off
      const date = d.getDate();
      if (date >= 8 && date <= 14) return false;
    }
    return true;
  };

  // Build a merged list of actual records + synthetic missing-day placeholders for daily view
  const mergedDailyRows = useMemo(() => {
    if (!selectedEmployeeId || filteredHistory.length === 0) return filteredHistory;

    // Build a lookup of existing records by date string
    const recordsByDate = {};
    filteredHistory.forEach(r => { recordsByDate[r.date] = r; });

    const holidayDates = new Set();
    holidays.forEach(h => {
      const hDate = new Date(h.date);
      const hStr = hDate.getFullYear() + '-' + String(hDate.getMonth() + 1).padStart(2, '0') + '-' + String(hDate.getDate()).padStart(2, '0');
      holidayDates.add(hStr);
    });

    // Determine range: from the earliest record date to yesterday (not today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dates = filteredHistory.map(r => r.date).sort();
    if (dates.length === 0) return filteredHistory;

    const startDate = new Date(dates[0]);
    startDate.setHours(0, 0, 0, 0);
    const endDate = yesterday;

    // Walk every calendar day from start to end
    const rows = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const dateStr = cursor.getFullYear() + '-' + String(cursor.getMonth() + 1).padStart(2, '0') + '-' + String(cursor.getDate()).padStart(2, '0');

      if (recordsByDate[dateStr]) {
        // Real record exists
        rows.push({ ...recordsByDate[dateStr], isMissing: false });
      } else if (isWorkingDay(cursor) && !holidayDates.has(dateStr)) {
        // Missing working day — show as Leave placeholder
        rows.push({
          _id: `missing-${dateStr}`,
          date: dateStr,
          checkInTime: null,
          checkOutTime: null,
          totalHours: null,
          status: 'Auto-Leave',
          summary: null,
          isMissing: true, // flag to render differently
        });
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    // Sort descending (newest first)
    rows.sort((a, b) => (a.date > b.date ? -1 : 1));
    return rows;
  }, [filteredHistory, selectedEmployeeId, holidays]);

  const exportReportCSV = () => {
    let headers = [];
    let rows = [];

    if (reportTab === 'daily') {
      headers = ['Date', 'Check In', 'Check Out', 'Total Hours', 'Status', 'Summary'];
      rows = filteredHistory.map(record => [
        new Date(record.date).toLocaleDateString('en-GB'),
        record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '-',
        record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '-',
        record.totalHours ? `${record.totalHours}h` : '-',
        record.status === 'Auto-Leave' ? 'Leave' : record.checkOutTime ? 'Present' : 'Working',
        `"${(record.summary || '').replace(/"/g, '""')}"`
      ]);
    } else if (reportTab === 'weekly') {
      headers = ['Week', 'Days Worked', 'Total Hours', 'Average Hours/Day'];
      const weeklyData = filteredHistory.reduce((acc, curr) => {
        const dateObj = new Date(curr.date);
        const startOfWeek = new Date(dateObj);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        const weekLabel = `Week of ${startOfWeek.toLocaleDateString('en-GB')}`;
        if (!acc[weekLabel]) acc[weekLabel] = { week: weekLabel, daysWorked: 0, totalHours: 0, sortKey: startOfWeek.getTime() };
        if (curr.checkOutTime) {
          acc[weekLabel].daysWorked += 1;
          acc[weekLabel].totalHours += curr.totalHours || 0;
        }
        return acc;
      }, {});
      rows = Object.values(weeklyData).sort((a, b) => b.sortKey - a.sortKey).map(w => [
        w.week,
        w.daysWorked,
        w.totalHours.toFixed(1),
        w.daysWorked > 0 ? (w.totalHours / w.daysWorked).toFixed(1) : 0
      ]);
    } else {
      headers = ['Month', 'Days Worked', 'Total Hours', 'Average Hours/Day'];
      const monthlyData = filteredHistory.reduce((acc, curr) => {
        const dateObj = new Date(curr.date);
        const month = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (!acc[month]) acc[month] = { month, daysWorked: 0, totalHours: 0 };
        if (curr.checkOutTime) {
          acc[month].daysWorked += 1;
          acc[month].totalHours += curr.totalHours || 0;
        }
        return acc;
      }, {});
      rows = Object.values(monthlyData).map(m => [
        m.month,
        m.daysWorked,
        m.totalHours.toFixed(1),
        m.daysWorked > 0 ? (m.totalHours / m.daysWorked).toFixed(1) : 0
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    // Generate dynamic filename
    const selectedEmp = employees.find(e => e._id === selectedEmployeeId);
    const empName = selectedEmp ? selectedEmp.name.replace(/\s+/g, '_') : 'All_Employees';
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `${empName}_${reportTab}_attendance_${dateStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Attendance Reports</h1>
          <p className="text-muted-foreground mt-1">Monitor live check-ins and view detailed attendance history.</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'today' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Today's Status
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'reports' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Employee Reports
          </button>
        </div>
      </div>

      {activeTab === 'today' && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle>Live Attendance Status</CardTitle>
                <CardDescription>Real-time view of who is currently working today.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 pl-9"
                  />
                </div>
                <select
                  value={employmentTypeFilter}
                  onChange={(e) => setEmploymentTypeFilter(e.target.value)}
                  className="flex h-9 w-full sm:w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <option value="">All Types</option>
                  <option value="fulltime">Full-Time</option>
                  <option value="freelancer">Freelancer</option>
                  <option value="intern">Intern</option>
                  <option value="contractor">Contractor</option>
                </select>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="flex h-9 w-full sm:w-48 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <Button onClick={fetchTodayAttendance} variant="outline" size="sm" className="w-full sm:w-auto h-9">
                  <Clock className="h-4 w-4 mr-2" /> Refresh
                </Button>
                <Button onClick={exportTodayCSV} variant="outline" size="sm" className="w-full sm:w-auto h-9 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-gray-500 animate-pulse">Loading data...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-4 font-medium">Employee</th>
                      <th className="px-6 py-4 font-medium">Department</th>
                      <th className="px-6 py-4 font-medium">Check In</th>
                      <th className="px-6 py-4 font-medium">Check Out</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredTodayData.length > 0 ? (
                      filteredTodayData.map((record) => {
                        const emp = record.employee;
                        const att = record.attendance;
                        const isCheckedIn = !!att?.checkInTime;
                        const isCheckedOut = !!att?.checkOutTime;
                        const isAutoLeave = att?.status === 'Auto-Leave';

                        let statusBadge = <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-600">Not Checked In</span>;
                        if (isAutoLeave) {
                          statusBadge = <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-rose-100 text-rose-700">Leave</span>;
                        } else if (isCheckedOut) {
                          statusBadge = <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">Completed</span>;
                        } else if (isCheckedIn) {
                          statusBadge = <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700">Working</span>;
                        }

                        return (
                          <tr 
                            key={emp._id} 
                            onClick={() => navigateToReport(emp._id)}
                            className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                <img 
                                  src={getImageUrl(emp.profileImage) || `https://api.dicebear.com/7.x/notionists/svg?seed=${emp.name.replace(' ', '')}&backgroundColor=f3f4f6`}
                                  alt={emp.name} 
                                  className="w-8 h-8 rounded-full border bg-gray-50"
                                />
                                <div>
                                  <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{emp.name}</p>
                                  <p className="text-xs text-gray-500">{emp.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-gray-600">{emp.department}</td>
                            <td className="px-6 py-4 text-gray-600">
                              {isCheckedIn ? new Date(att.checkInTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="px-6 py-4 text-gray-600">
                              {isCheckedOut ? new Date(att.checkOutTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </td>
                            <td className="px-6 py-4">{statusBadge}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                          {searchQuery || departmentFilter ? "No employees match your filters." : "No employees found."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <Card className="border-0 shadow-sm bg-gray-50/50">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee</label>
                  <select 
                    value={selectedEmployeeId}
                    onChange={handleEmployeeSelect}
                    className="flex h-10 w-full sm:max-w-md rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="">-- Choose an employee --</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name} ({emp.department})</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedEmployeeId ? (
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-gray-100">
                <div className="space-y-1">
                  <CardTitle>Attendance History</CardTitle>
                  <CardDescription>Detailed daily logs and summaries for the selected employee.</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <select 
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="flex h-9 w-full sm:w-32 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    >
                      {availableYears.map(year => (
                        <option key={year} value={year}>{year === 'All' ? 'All Years' : year}</option>
                      ))}
                    </select>
                    <select 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="flex h-9 w-full sm:w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                    >
                      {availableMonths.map(month => (
                        <option key={month} value={month}>{month === 'All' ? 'All Months' : month}</option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={exportReportCSV} variant="outline" size="sm" className="w-full sm:w-auto h-9 text-emerald-600 border-emerald-200 hover:bg-emerald-50 mr-2">
                    <Download className="h-4 w-4 mr-2" /> Export
                  </Button>
                  <div className="flex bg-gray-100/80 p-1 rounded-lg">
                  <button 
                    onClick={() => setReportTab('daily')}
                    className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors ${reportTab === 'daily' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Daily
                  </button>
                  <button 
                    onClick={() => setReportTab('weekly')}
                    className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors ${reportTab === 'weekly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Weekly
                  </button>
                  <button 
                    onClick={() => setReportTab('monthly')}
                    className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors ${reportTab === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Monthly
                  </button>
                </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {reportTab === 'daily' ? (
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
                          <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {mergedDailyRows.length > 0 ? (
                          mergedDailyRows.map((record) => {
                            const isMissing = record.isMissing;
                            const isAutoLeave = record.status === 'Auto-Leave';
                            const hasCheckOut = !!record.checkOutTime;

                            // Determine status badge
                            let badgeClass = 'bg-blue-100 text-blue-700';
                            let badgeLabel = 'Working';
                            if (isAutoLeave) {
                              badgeClass = 'bg-rose-100 text-rose-700';
                              badgeLabel = 'Leave';
                            } else if (hasCheckOut) {
                              badgeClass = 'bg-emerald-100 text-emerald-700';
                              badgeLabel = 'Present';
                            }

                            return (
                              <tr
                                key={record._id}
                                className={`transition-colors ${
                                  isMissing
                                    ? 'bg-rose-50/40 hover:bg-rose-50/70'
                                    : 'hover:bg-gray-50/30'
                                }`}
                              >
                                <td className="px-6 py-4 font-medium text-gray-900">
                                  {new Date(record.date).toLocaleDateString('en-GB')}
                                  {isMissing && (
                                    <span className="ml-2 text-[9px] font-semibold uppercase text-rose-400 tracking-wide">No record</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                  {record.checkInTime && !isMissing
                                    ? new Date(record.checkInTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                                    : '-'}
                                </td>
                                <td className="px-6 py-4 text-gray-600">
                                  {record.checkOutTime && !isMissing
                                    ? new Date(record.checkOutTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                                    : '-'}
                                </td>
                                <td className="px-6 py-4 font-medium text-primary">
                                  {record.totalHours ? `${record.totalHours}h` : '-'}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>
                                    {badgeLabel}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-gray-500 max-w-xs break-words whitespace-normal">
                                  {isMissing ? (
                                    <span className="text-rose-400 italic text-xs">No check-in recorded</span>
                                  ) : (
                                    record.summary || '-'
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {isMissing ? (
                                    // Missing day: show both Mark as Leave and Mark Present
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        onClick={() => handleMarkAbsent(record.date)}
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200"
                                      >
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Mark Leave
                                      </Button>
                                      <Button
                                        onClick={() => handleCreateAndMarkPresent(record.date)}
                                        variant="outline"
                                        size="sm"
                                        className="h-8 text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200"
                                      >
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Mark Present
                                      </Button>
                                    </div>
                                  ) : (!hasCheckOut || isAutoLeave) ? (
                                    // Existing record without checkout or marked Auto-Leave
                                    <Button
                                      onClick={() => handleMarkPresent(record._id)}
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200"
                                    >
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Mark Present
                                    </Button>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No attendance history found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : reportTab === 'weekly' ? (
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
                          const weeklyData = filteredHistory.reduce((acc, curr) => {
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
                          const monthlyData = filteredHistory.reduce((acc, curr) => {
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
          ) : (
            <div className="p-12 text-center border border-dashed border-gray-200 rounded-2xl bg-white">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Employee Selected</h3>
              <p className="text-gray-500 mt-1">Please select an employee from the dropdown above to view their reports.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
