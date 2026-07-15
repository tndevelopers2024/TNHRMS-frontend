import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Eye, QrCode, X } from "lucide-react";

export default function Payslips() {
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  
  useEffect(() => {
    if (userInfo._id) {
      fetch(`${import.meta.env.VITE_API_URL}/api/employee/payslips/${userInfo._id}`)
        .then(res => res.json())
        .then(data => setPayslips(data))
        .catch(err => console.error(err));
    }
  }, []);

  const isMonthEnded = (monthStr) => {
    if (!monthStr) return false;
    const [m, y] = monthStr.split('-');
    const slipMonth = parseInt(m, 10) - 1; // 0-indexed
    const slipYear = parseInt(y, 10);
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    if (slipYear < currentYear) return true;
    if (slipYear === currentYear && slipMonth < currentMonth) return true;
    return false;
  };

  return (
    <div className="space-y-6 relative">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Payslips</h1>
        <p className="text-muted-foreground mt-1">View and download your monthly salary slips.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {payslips.length > 0 ? payslips.map((slip) => (
          <Card key={slip._id} className="border-0 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            {/* Background Decoration */}
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors"></div>
            
            <CardHeader className="pb-2 relative z-10">
              <CardTitle className="text-xl">{slip.month}</CardTitle>
              <CardDescription>Paid on {new Date(slip.createdAt).toLocaleDateString('en-GB')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 relative z-10">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Net Pay</p>
                <h3 className="text-3xl font-bold text-gray-900">₹{slip.netPay ? slip.netPay.toLocaleString() : '0'}</h3>
              </div>
            </CardContent>
            <CardFooter className="flex space-x-3 relative z-10">
              {isMonthEnded(slip.month) ? (
                <>
                  <Button variant="outline" className="flex-1 border-primary/20 hover:bg-primary/5 hover:text-primary" onClick={() => setSelectedPayslip(slip)}>
                    <Eye className="w-4 h-4 mr-2" /> Preview
                  </Button>
                  <Button variant="gradient" className="flex-1">
                    <Download className="w-4 h-4 mr-2" /> PDF
                  </Button>
                </>
              ) : (
                <div className="w-full text-center text-xs font-medium text-amber-600 bg-amber-50 py-2 rounded-md border border-amber-100">
                  Available next month
                </div>
              )}
            </CardFooter>
          </Card>
        )) : (
          <div className="col-span-full py-12 text-center text-gray-500 border border-dashed rounded-xl bg-gray-50">
            No payslips found.
          </div>
        )}
      </div>

      {/* Payslip Modal Overlay */}
      {selectedPayslip && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-4 right-4 z-10 rounded-full bg-gray-100 hover:bg-gray-200"
              onClick={() => setSelectedPayslip(null)}
            >
              <X className="w-5 h-5 text-gray-600" />
            </Button>
            
            <div className="p-8 md:p-12 space-y-8 bg-white" id="payslip-content">
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-100 pb-8 gap-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-primary/10 flex items-center justify-center rounded-2xl">
                    <img src="/logo.png" alt="Logo" className="h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Your Company Name</h2>
                    <p className="text-sm text-muted-foreground">123 Business Avenue, Tech Park, City</p>
                  </div>
                </div>
                  <div className="flex justify-between items-center bg-gray-50 rounded-b-xl px-6 py-5">
                    <span className="font-bold text-gray-900 text-lg">NET SALARY PAYABLE</span>
                    <span className="font-black text-3xl text-emerald-600">₹{(selectedPayslip.netPay || 0).toLocaleString()}</span>
                  </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Employee Details</p>
                  <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Name:</span> <span className="font-medium">{userInfo.name || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">ID:</span> <span className="font-medium">{userInfo.employeeId || userInfo._id.slice(-6).toUpperCase()}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Designation:</span> <span className="font-medium">{userInfo.designation || 'N/A'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Department:</span> <span className="font-medium">{userInfo.department || 'N/A'}</span></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Bank Details</p>
                  <div className="bg-gray-50 p-4 rounded-xl space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Bank Name:</span> <span className="font-medium">Global Bank</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Account No:</span> <span className="font-medium">XXXX XXXX 1234</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Payment Date:</span> <span className="font-medium">{new Date(selectedPayslip.createdAt).toLocaleDateString('en-GB')}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Days Paid:</span> <span className="font-medium">31</span></div>
                  </div>
                </div>
              </div>

              {/* Salary Breakdown */}
              <div>
                <table className="w-full text-sm">
                  <thead className="bg-primary text-white">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold rounded-tl-xl">Earnings</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount</th>
                      <th className="px-4 py-3 text-left font-semibold">Deductions</th>
                      <th className="px-4 py-3 text-right font-semibold rounded-tr-xl">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-700">Basic Salary (60%)</td>
                      <td className="px-4 py-3 text-right font-medium">₹{Math.round((selectedPayslip.monthlySalary || Math.round((userInfo.salary || 0) / 12)) * 0.6).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-700">Loss of Pay (LOP)</td>
                      <td className="px-4 py-3 text-right font-medium text-rose-600">-₹{(selectedPayslip.totalDeduction || 0).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-gray-700">House Rent Allowance (20%)</td>
                      <td className="px-4 py-3 text-right font-medium">₹{Math.round((selectedPayslip.monthlySalary || Math.round((userInfo.salary || 0) / 12)) * 0.2).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-700"></td>
                      <td className="px-4 py-3 text-right font-medium"></td>
                    </tr>
                    <tr className="bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-700">Special Allowance (20%)</td>
                      <td className="px-4 py-3 text-right font-medium">₹{Math.round((selectedPayslip.monthlySalary || Math.round((userInfo.salary || 0) / 12)) * 0.2).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-700"></td>
                      <td className="px-4 py-3 text-right font-medium"></td>
                    </tr>
                    <tr className="border-t-2 border-gray-200">
                      <td className="px-4 py-4 font-bold text-gray-900">Gross Earnings</td>
                      <td className="px-4 py-4 text-right font-bold text-emerald-600">₹{(selectedPayslip.monthlySalary || Math.round((userInfo.salary || 0) / 12)).toLocaleString()}</td>
                      <td className="px-4 py-4 font-bold text-gray-900">Total Deductions</td>
                      <td className="px-4 py-4 text-right font-bold text-rose-600">-₹{(selectedPayslip.totalDeduction || 0).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Net Salary & Signature */}
              <div className="flex flex-col md:flex-row justify-between items-center bg-gray-50 p-6 rounded-2xl border border-gray-100 mt-6">
                <div className="mb-6 md:mb-0">
                  <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Net Salary Payable</p>
                  <h2 className="text-4xl font-black text-primary mt-1">${(selectedPayslip.netPay || 0).toLocaleString()}</h2>
                  <p className="text-xs text-gray-400 mt-1">Amount converted to words would go here.</p>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-white border border-gray-200 rounded-xl p-2 flex items-center justify-center">
                      <QrCode className="w-full h-full text-gray-400" />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-widest">Scan to verify</p>
                  </div>
                  <div className="text-center pt-8">
                    <div className="w-32 border-b-2 border-gray-300 mb-2"></div>
                    <p className="text-xs font-semibold text-gray-600">Authorized Signatory</p>
                  </div>
                </div>
              </div>
              
              <div className="text-center text-xs text-gray-400 pt-4">
                This is a computer generated document and does not require a signature.
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3 rounded-b-xl">
              <Button variant="outline" onClick={() => setSelectedPayslip(null)}>Close</Button>
              <Button variant="gradient">
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
