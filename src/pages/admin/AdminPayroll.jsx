import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Download, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MonthPicker } from "@/components/ui/MonthPicker";
import toast from "react-hot-toast";
import { useSocket } from "../../context/SocketContext";

export default function AdminPayroll() {
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState("All");
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const socket = useSocket();

  useEffect(() => {
    fetchPayrollData();
  }, [selectedDate]);

  useEffect(() => {
    if (!socket) return;
    const handleNotif = (notif) => {
      if (notif.type === 'payroll_generated') {
        fetchPayrollData();
      }
    };
    socket.on('notification', handleNotif);
    return () => socket.off('notification', handleNotif);
  }, [socket, selectedDate]);

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      const [year, month] = selectedDate.split('-');
      const monthIndex = parseInt(month, 10) - 1;
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/payroll?month=${monthIndex}&year=${year}`);
      const data = await res.json();
      setPayrollData(data);
    } catch (err) {
      console.error("Error fetching payroll data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (emp, newStatus) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/payroll/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employeeId: emp._id, 
          month: emp.monthStr, 
          netPay: emp.netPay, 
          status: newStatus,
          lpa: emp.lpa,
          monthlySalary: emp.monthlySalary,
          lopDays: emp.lopDays,
          totalDeduction: emp.totalDeduction
        })
      });
      if (res.ok) {
        toast.success(`Payroll marked as ${newStatus}`);
        setPayrollData(prev => prev.map(p => 
          p._id === emp._id ? { ...p, status: newStatus } : p
        ));
      } else {
        toast.error("Failed to update status");
      }
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Error updating status");
    }
  };

  const departments = ["All", ...new Set(payrollData.map(emp => emp.department || 'General'))];

  const filteredData = payrollData.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (emp.email && emp.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDept = departmentFilter === "All" || (emp.department || 'General') === departmentFilter;
    const matchesEmpType = employmentTypeFilter === "All" || (emp.employmentType || 'fulltime') === employmentTypeFilter;
    return matchesSearch && matchesDept && matchesEmpType;
  });

  const handleDownloadCSV = () => {
    if (filteredData.length === 0) return;
    const headers = ['Employee Name', 'Department', 'Designation', 'Annual Salary', 'Monthly Salary', 'LOP Rate Per Day', 'LOP Days Taken', 'Total LOP Deduction', 'Net Pay', 'Status'];
    const rows = filteredData.map(emp => [
      emp.name,
      emp.department,
      emp.designation,
      emp.lpa,
      emp.monthlySalary,
      emp.perDayLopRate,
      emp.lopDays,
      emp.totalDeduction,
      emp.netPay,
      emp.status
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `payroll_report_${new Date().toLocaleString('en-GB', { month: 'short', year: 'numeric' })}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Payroll Calculations</h1>
          <p className="text-muted-foreground mt-1">Review monthly salary and Loss of Pay deductions for all employees.</p>
        </div>
        <Button onClick={handleDownloadCSV} variant="outline" className="shadow-sm">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="bg-white border-b border-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center text-emerald-800 gap-4">
            <div className="flex items-center">
              <Wallet className="w-5 h-5 mr-2" />
              Payroll Data
            </div>
            <MonthPicker 
              value={selectedDate}
              onChange={setSelectedDate}
              className="w-full sm:w-auto"
            />
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search employees..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-gray-50/50 border-gray-200 w-full"
              />
            </div>
              <select
                value={employmentTypeFilter}
                onChange={(e) => setEmploymentTypeFilter(e.target.value)}
                className="h-10 rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-40"
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
                className="h-10 rounded-md border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-full sm:w-48"
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : payrollData.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/80">
                <tr>
                  <th className="px-6 py-4 font-medium">Employee</th>
                  <th className="px-6 py-4 font-medium">Annual Salary</th>
                  <th className="px-6 py-4 font-medium">Monthly Salary</th>
                  <th className="px-6 py-4 font-medium">LOP Rate/Day</th>
                  <th className="px-6 py-4 font-medium">LOP Days</th>
                  <th className="px-6 py-4 font-medium">LOP Deduction</th>
                  <th className="px-6 py-4 font-medium text-emerald-700">Net Pay</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.length > 0 ? filteredData.map((emp) => (
                  <tr key={emp._id} className="bg-white hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{emp.name}</p>
                        <p className="text-xs text-gray-500">{emp.department}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">₹{emp.lpa.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-600">₹{emp.monthlySalary.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-600">₹{emp.perDayLopRate.toLocaleString()}</td>
                    <td className="px-6 py-4 text-rose-600 font-medium">{emp.lopDays}</td>
                    <td className="px-6 py-4 text-rose-600 font-medium">-₹{emp.totalDeduction.toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-emerald-700 text-lg">₹{emp.netPay.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <select
                        value={emp.status}
                        onChange={(e) => handleStatusChange(emp, e.target.value)}
                        className={`text-xs font-semibold rounded-full px-3 py-1 border outline-none cursor-pointer ${
                          emp.status === 'Paid' 
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                            : 'bg-amber-100 text-amber-700 border-amber-200'
                        }`}
                      >
                        <option value="Pending" className="bg-white text-gray-900">Pending</option>
                        <option value="Paid" className="bg-white text-gray-900">Paid</option>
                      </select>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center">
              <Wallet className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No payroll data</h3>
              <p className="text-gray-500 mt-1">There are no employees found.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
