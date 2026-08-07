import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function Attendance() {
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedYear, setSelectedYear] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');

  useEffect(() => {
    const fetchAttendance = async () => {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      if (!userInfo || !userInfo._id) return;
      
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/employee/attendance/${userInfo._id}`);
        const data = await res.json();
        
        if (Array.isArray(data)) {
          setAttendanceHistory(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    fetchAttendance();
  }, []);

  const availableYears = [...new Set(attendanceHistory.map(record => {
    return new Date(record.date).getFullYear().toString();
  }))].sort((a, b) => b - a);
  availableYears.unshift('All');

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const availableMonths = ['All', ...months];

  const filteredHistory = attendanceHistory.filter(record => {
    const recordDate = new Date(record.date);
    const recordYear = recordDate.getFullYear().toString();
    const recordMonthName = recordDate.toLocaleString('default', { month: 'long' });

    const yearMatch = selectedYear === 'All' || recordYear === selectedYear;
    const monthMatch = selectedMonth === 'All' || recordMonthName === selectedMonth;

    return yearMatch && monthMatch;
  });

  // Check if a JS Date is a working day (Mon-Sat, skip 2nd Saturday)
  const isWorkingDay = (d) => {
    const day = d.getDay();
    if (day === 0) return false; // Sunday
    if (day === 6 && d.getDate() >= 8 && d.getDate() <= 14) return false; // 2nd Saturday
    return true;
  };

  // Fill gaps: add placeholder Leave rows for working days with no attendance record
  const mergedDailyRows = useMemo(() => {
    if (filteredHistory.length === 0) return [];

    const recordsByDate = {};
    filteredHistory.forEach(r => { recordsByDate[r.date] = r; });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const sortedDates = filteredHistory.map(r => r.date).sort();
    const startDate = new Date(sortedDates[0]);
    startDate.setHours(0, 0, 0, 0);

    const rows = [];
    const cursor = new Date(startDate);
    while (cursor <= yesterday) {
      const dateStr = cursor.getFullYear() + '-' + String(cursor.getMonth() + 1).padStart(2, '0') + '-' + String(cursor.getDate()).padStart(2, '0');
      if (recordsByDate[dateStr]) {
        rows.push({ ...recordsByDate[dateStr], isMissing: false });
      } else if (isWorkingDay(cursor)) {
        rows.push({
          _id: `missing-${dateStr}`,
          date: dateStr,
          checkInTime: null,
          checkOutTime: null,
          totalHours: null,
          status: 'Auto-Leave',
          summary: null,
          isMissing: true,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    // Also include today's record if it exists (don't fill today as missing)
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    if (recordsByDate[todayStr]) {
      rows.push({ ...recordsByDate[todayStr], isMissing: false });
    }

    rows.sort((a, b) => (a.date > b.date ? -1 : 1));
    return rows;
  }, [filteredHistory]);

  const exportToCSV = () => {
    let headers = [];
    let rows = [];

    if (activeTab === 'daily') {
      headers = ['Date', 'Check In', 'Check Out', 'Total Hours', 'Status', 'Summary'];
      rows = filteredHistory.map(record => [
        new Date(record.date).toLocaleDateString('en-GB'),
        record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '-',
        record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '-',
        record.totalHours ? `${record.totalHours}h` : '-',
        record.status === 'Auto-Leave' ? 'Leave' : record.checkOutTime ? 'Present' : 'Working',
        `"${(record.summary || '').replace(/"/g, '""')}"`
      ]);
    } else if (activeTab === 'weekly') {
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
    link.setAttribute("download", `my_attendance_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Attendance History</h1>
        <p className="text-muted-foreground mt-1">View your daily logs and monthly summaries.</p>
      </div>

      <div className="mt-8">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-4 border-b border-gray-100 gap-4">
            <div className="space-y-1">
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>View your daily logs and monthly summaries.</CardDescription>
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
              <Button onClick={exportToCSV} variant="outline" size="sm" className="w-full sm:w-auto h-9 text-emerald-600 border-emerald-200 hover:bg-emerald-50 mr-2">
                <Download className="h-4 w-4 mr-2" /> Export
              </Button>
              <div className="flex bg-gray-100/80 p-1 rounded-lg w-full sm:w-auto justify-between sm:justify-start">
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
                    {mergedDailyRows.length > 0 ? (
                      mergedDailyRows.map((record) => {
                        const isMissing = record.isMissing;
                        const isAutoLeave = record.status === 'Auto-Leave';
                        const hasCheckOut = !!record.checkOutTime;

                        let badgeClass = 'bg-blue-100 text-blue-700';
                        let badgeLabel = 'Working';
                        if (isAutoLeave) { badgeClass = 'bg-rose-100 text-rose-700'; badgeLabel = 'Leave'; }
                        else if (record.status === 'Half-Day Leave') { badgeClass = 'bg-amber-100 text-amber-700'; badgeLabel = 'Half Day'; }
                        else if (hasCheckOut) { badgeClass = 'bg-emerald-100 text-emerald-700'; badgeLabel = 'Present'; }

                        return (
                          <tr
                            key={record._id}
                            className={`transition-colors ${isMissing ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'hover:bg-gray-50/30'}`}
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
                              {isMissing
                                ? <span className="text-rose-400 italic text-xs">No check-in recorded</span>
                                : record.summary || '-'}
                            </td>
                          </tr>
                        );
                      })
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
      </div>
    </div>
  );
}
