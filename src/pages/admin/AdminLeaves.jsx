import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Check, X } from "lucide-react";

import { useConfirm } from "../../context/ConfirmContext";
import toast from "react-hot-toast";
import { DocumentViewerModal } from "../../components/DocumentViewerModal";
import { FileDown, Eye } from "lucide-react";

export default function AdminLeaves() {
  const [requests, setRequests] = useState([]);
  const [viewerData, setViewerData] = useState({ isOpen: false, url: '' });
  const { confirm } = useConfirm();

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/admin/leaves`)
      .then(res => res.json())
      .then(data => setRequests(data))
      .catch(err => console.error("Error fetching leaves:", err));
  }, []);

  const handleAction = async (id, action) => {
    confirm({
      title: `${action === 'Approved' ? 'Approve' : 'Reject'} Leave`,
      message: `Are you sure you want to ${action === 'Approved' ? 'approve' : 'reject'} this leave request?`,
      confirmText: "Confirm",
      action: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/leaves/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: action })
          });
          
          if (res.ok) {
            setRequests(requests.map(req => 
              req._id === id ? { ...req, status: action } : req
            ));
            toast.success(`Leave request ${action.toLowerCase()}`);
          } else {
            toast.error("Failed to update leave status");
          }
        } catch (error) {
          console.error("Error updating leave:", error);
          toast.error("Failed to connect to server");
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Leave Approvals</h1>
          <p className="text-muted-foreground mt-1">Review and manage employee leave requests.</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-50">
          <CardTitle>Recent Requests</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search employee..." className="pl-9 h-9" />
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80">
              <tr>
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Leave Type</th>
                <th className="px-6 py-4 font-medium">Duration</th>
                <th className="px-6 py-4 font-medium">Reason</th>
                <th className="px-6 py-4 font-medium text-center">Actions / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map((req) => (
                <tr key={req._id} className="bg-white hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{req.employee?.name || 'Unknown'}</td>
                  <td className="px-6 py-4 text-gray-600">{req.type}</td>
                  <td className="px-6 py-4 text-gray-600">
                    <div className="font-medium">{req.days} Days</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {new Date(req.startDate).toLocaleDateString('en-GB')} - {new Date(req.endDate).toLocaleDateString('en-GB')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-500 max-w-xs truncate" title={req.reason}>{req.reason}</div>
                    {req.attachment && (
                      <button 
                        onClick={() => setViewerData({ isOpen: true, url: req.attachment })}
                        className="mt-2 inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-200"
                      >
                        <Eye className="w-3 h-3 mr-1" /> View Document
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {req.status === "Pending" ? (
                      <div className="flex items-center justify-center space-x-2">
                        <Button size="sm" variant="outline" className="h-8 border-emerald-200 text-emerald-600 hover:bg-emerald-50" onClick={() => handleAction(req._id, "Approved")}>
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleAction(req._id, "Rejected")}>
                          <X className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      
      <DocumentViewerModal
        isOpen={viewerData.isOpen}
        onClose={() => setViewerData({ isOpen: false, url: '' })}
        fileUrl={viewerData.url}
      />
    </div>
  )
}
