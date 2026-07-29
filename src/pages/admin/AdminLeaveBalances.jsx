import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FileText, Edit2, Check, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminLeaveBalances() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editBalances, setEditBalances] = useState({ casual: '', sick: '', earned: '' });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/employee-leave-balances`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch employees');
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (employee) => {
    setEditingId(employee._id);
    setEditBalances({
      casual: employee.casualLeavesAvailable !== undefined ? employee.casualLeavesAvailable.toString() : (employee.casualLeavesTotal?.toString() || '3'),
      sick: employee.sickLeavesAvailable !== undefined ? employee.sickLeavesAvailable.toString() : (employee.sickLeavesTotal?.toString() || '6'),
      earned: employee.earnedLeavesAvailable?.toString() || (employee.earnedLeavesTotal?.toString() || '0')
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditBalances({ casual: '', sick: '', earned: '' });
  };

  const handleSaveBalance = async (id) => {
    try {
      const casualAvailable = parseInt(editBalances.casual, 10);
      const sickAvailable = parseInt(editBalances.sick, 10);
      const earnedAvailable = parseInt(editBalances.earned, 10);
      
      if (isNaN(casualAvailable) || casualAvailable < 0 || isNaN(sickAvailable) || sickAvailable < 0 || isNaN(earnedAvailable) || earnedAvailable < 0) {
        toast.error("Please enter valid non-negative numbers.");
        return;
      }
      
      const emp = employees.find(e => e._id === id);
      if (!emp) return;
      
      const casualTotal = casualAvailable + (emp.casualLeavesUsed || 0);
      const sickTotal = sickAvailable + (emp.sickLeavesUsed || 0);
      const earnedTotal = earnedAvailable + (emp.earnedLeavesUsed || 0);
      
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/employees/${id}/leave-balance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          casualLeaves: casualTotal,
          sickLeaves: sickTotal,
          earnedLeaves: earnedTotal 
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update leave balance');
      }
      
      toast.success("Leave balances updated successfully");
      setEmployees(employees.map(e => e._id === id ? { 
        ...e, 
        casualLeavesTotal: casualTotal, 
        sickLeavesTotal: sickTotal, 
        earnedLeavesTotal: earnedTotal,
        casualLeavesAvailable: casualAvailable,
        sickLeavesAvailable: sickAvailable,
        earnedLeavesAvailable: earnedAvailable
      } : e));
      setEditingId(null);
      setEditBalances({ casual: '', sick: '', earned: '' });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Balances</h1>
          <p className="text-gray-500 mt-1">Manage available leave days for all employees</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search by name, ID, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border-gray-200 focus:ring-primary/20 rounded-xl"
            />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Emp ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Casual</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Sick</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Earned</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No employees found</p>
                    <p className="text-sm">Try adjusting your search</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <img 
                          src={emp.profileImage ? (emp.profileImage.startsWith('/') ? `${import.meta.env.VITE_API_URL}${emp.profileImage}` : emp.profileImage) : `https://api.dicebear.com/7.x/notionists/svg?seed=${emp.name.replace(' ', '')}&backgroundColor=f3f4f6`}
                          alt={emp.name}
                          className="h-10 w-10 rounded-full object-cover border border-gray-200 bg-white"
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                          <div className="text-sm text-gray-500">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                      {emp.employeeId || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {emp.department || 'General'}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      {editingId === emp._id ? (
                        <div className="flex justify-center items-center">
                          <Input
                            type="number"
                            min="0"
                            value={editBalances.casual}
                            onChange={(e) => setEditBalances({ ...editBalances, casual: e.target.value })}
                            className="w-16 text-center h-8 px-1"
                          />
                        </div>
                      ) : (
                        <span className="font-semibold text-gray-800 bg-blue-50 px-3 py-1 rounded-full text-lg border border-blue-100" title={`Total: ${emp.casualLeavesTotal || 3}`}>
                          {emp.casualLeavesAvailable !== undefined ? emp.casualLeavesAvailable : (emp.casualLeaves || 3)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      {editingId === emp._id ? (
                        <div className="flex justify-center items-center">
                          <Input
                            type="number"
                            min="0"
                            value={editBalances.sick}
                            onChange={(e) => setEditBalances({ ...editBalances, sick: e.target.value })}
                            className="w-16 text-center h-8 px-1"
                          />
                        </div>
                      ) : (
                        <span className="font-semibold text-gray-800 bg-rose-50 px-3 py-1 rounded-full text-lg border border-rose-100" title={`Total: ${emp.sickLeavesTotal || 6}`}>
                          {emp.sickLeavesAvailable !== undefined ? emp.sickLeavesAvailable : (emp.sickLeaves || 6)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      {editingId === emp._id ? (
                        <div className="flex justify-center items-center">
                          <Input
                            type="number"
                            min="0"
                            value={editBalances.earned}
                            onChange={(e) => setEditBalances({ ...editBalances, earned: e.target.value })}
                            className="w-16 text-center h-8 px-1"
                          />
                        </div>
                      ) : (
                        <span className="font-semibold text-gray-800 bg-emerald-50 px-3 py-1 rounded-full text-lg border border-emerald-100" title={`Total: ${emp.earnedLeavesTotal || 0}`}>
                          {emp.earnedLeavesAvailable !== undefined ? emp.earnedLeavesAvailable : (emp.earnedLeaves || 0)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      {editingId === emp._id ? (
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleSaveBalance(emp._id)}
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 px-2"
                          >
                            <Check className="w-4 h-4 mr-1" /> Save
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleCancelEdit}
                            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 h-8 px-2"
                          >
                            <X className="w-4 h-4 mr-1" /> Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(emp)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8"
                        >
                          <Edit2 className="w-4 h-4 mr-2" /> Edit Balance
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
