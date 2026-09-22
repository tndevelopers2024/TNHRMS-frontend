import { useState, useEffect, useRef } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Download,
  Printer,
  Mail,
  Share2,
  Trash2,
  Edit3,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Copy,
  Send,
  X,
  Building2,
  User,
  Calendar,
  CreditCard,
  Upload,
  PenTool,
  Image as ImageIcon,
  Eraser,
  Type,
  Check,
  Tag,
  RotateCcw,
  Settings
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirm } from '../../context/ConfirmContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import InvoiceDocument from '@/components/InvoiceDocument';

const STATUS_COLORS = {
  Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Draft: 'bg-slate-50 text-slate-700 border-slate-200',
  Overdue: 'bg-rose-50 text-rose-700 border-rose-200',
  Cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

const TYPE_COLORS = {
  Invoice: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Tax Invoice': 'bg-purple-50 text-purple-700 border-purple-200',
  'Proforma Invoice': 'bg-blue-50 text-blue-700 border-blue-200',
};

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};


export default function AdminInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    totalInvoiced: 0,
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    counts: { total: 0, paid: 0, pending: 0, overdue: 0, draft: 0, cancelled: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' or 'settings'
  const [companySettings, setCompanySettings] = useState({
    companyName: '', taxId: '', address: '', postalCode: '', phone: '', email: '', logoUrl: '',
    paymentDetails: {
      primaryHolderName: '', accountNumber: '', accountType: '', bankName: '', ifscCode: '', branch: ''
    }
  });
  const [isUpdatingCompany, setIsUpdatingCompany] = useState(false);

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/settings/company`);
      if (res.ok) {
        const data = await res.json();
        if (data) setCompanySettings(data);
      }
    } catch (err) {
      console.error('Failed to load company settings', err);
    }
  };

  const handleCompanySettingsChange = async (e) => {
    e.preventDefault();
    setIsUpdatingCompany(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/settings/company`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companySettings)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Company settings updated successfully!');
      } else {
        toast.error(data.message || 'Error updating settings');
      }
    } catch (err) {
      toast.error('Network error occurred');
    } finally {
      setIsUpdatingCompany(false);
    }
  };

  const handleCompanyLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setCompanySettings((prev) => ({
        ...prev,
        logoUrl: uploadEvent.target.result,
      }));
      toast.success('Logo uploaded');
    };
    reader.readAsDataURL(file);
  };

  // Modals state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTargetInvoice, setEmailTargetInvoice] = useState(null);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const { confirm } = useConfirm();
  const navigate = useNavigate();

  const fetchInvoices = async (overrideStatus, overrideSearch) => {
    setLoading(true);
    try {
      const activeStatus = overrideStatus !== undefined ? overrideStatus : statusFilter;
      const activeSearch = overrideSearch !== undefined ? overrideSearch : searchQuery;

      let url = `${import.meta.env.VITE_API_URL}/api/admin/invoices?`;
      if (activeStatus !== 'All') url += `status=${encodeURIComponent(activeStatus)}&`;
      if (activeSearch && activeSearch.trim()) url += `search=${encodeURIComponent(activeSearch.trim())}&`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch next serial invoice number based on selected invoice type
  const fetchNextInvoiceNumber = async (type) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/invoices/next-number?type=${encodeURIComponent(type)}`);
      if (res.ok) {
        const data = await res.json();
        return data.invoiceNumber;
      }
    } catch (e) {
      console.error('Failed to fetch next number:', e);
    }
    const year = new Date().getFullYear();
    const prefix = type === 'Tax Invoice' ? 'TAX' : type === 'Proforma Invoice' ? 'PRO' : 'INV';
    return `${prefix}-${year}-0001`;
  };

  const handleOpenCreateModal = (type = 'Invoice') => {
    navigate(`/admin/invoices/create?type=${encodeURIComponent(type)}`);
  };

  
  const handleOpenEditModal = (invoice) => {
    navigate(`/admin/invoices/edit/${invoice._id}`);
  };


  const handleStatusChange = async (invoiceId, newStatus) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/invoices/${invoiceId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Invoice marked as ${newStatus}`);
        fetchInvoices();
        if (selectedInvoice && selectedInvoice._id === invoiceId) {
          setSelectedInvoice((prev) => ({ ...prev, status: newStatus }));
        }
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Error updating status');
    }
  };

  const handleDeleteInvoice = async (invoice) => {
    confirm({
      title: 'Delete Invoice',
      message: `Are you sure you want to delete ${invoice.invoiceType || 'invoice'} ${invoice.invoiceNumber}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      action: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/invoices/${invoice._id}`, {
            method: 'DELETE',
          });
          if (res.ok) {
            toast.success('Invoice deleted');
            fetchInvoices();
            if (showPreviewModal && selectedInvoice?._id === invoice._id) {
              setShowPreviewModal(false);
            }
          } else {
            toast.error('Failed to delete invoice');
          }
        } catch (err) {
          toast.error('Error deleting invoice');
        }
      },
    });
  };

  const handleOpenEmailModal = (invoice) => {
    setEmailTargetInvoice(invoice);
    setEmailRecipient(invoice.client?.email || '');
    setShowEmailModal(true);
  };

  const handleExecuteSendEmail = async (e) => {
    e?.preventDefault();
    if (!emailRecipient || !emailRecipient.trim()) {
      toast.error('Please provide a recipient email address');
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/invoices/${emailTargetInvoice._id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailRecipient.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Invoice sent successfully to ${emailRecipient.trim()}!`);
        setShowEmailModal(false);
      } else {
        toast.error(data.message || 'Failed to send email');
      }
    } catch (err) {
      console.error('Error sending invoice email:', err);
      toast.error('Error sending invoice email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendEmail = (invoice) => {
    handleOpenEmailModal(invoice);
  };

  const handleCopyLink = (invoice) => {
    const link = `${window.location.origin}/view-invoice/${invoice._id}`;
    navigator.clipboard.writeText(link);
    toast.success('Public invoice link copied to clipboard!');
  };

  const handleShareWhatsApp = (invoice) => {
    const sym = CURRENCY_SYMBOLS[invoice.currency] || '₹';
    const link = `${window.location.origin}/view-invoice/${invoice._id}`;
    const text = `Hello ${invoice.client?.name || 'Client'},\n\nPlease find your ${invoice.invoiceType || 'Invoice'} *${invoice.invoiceNumber}* from *${invoice.sender?.name || invoice.sender?.companyName || 'Techie Nutpam'}*.\n\n*Amount Due:* ${sym}${invoice.totalAmount?.toLocaleString('en-IN')}\n*Due Date:* ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : 'Immediate'}\n\nYou can view and download the invoice here:\n${link}\n\nThank you!`;
    const phone = invoice.client?.phone ? invoice.client.phone.replace(/[^0-9]/g, '') : '';
    const whatsappUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async (invoice) => {
    try {
      toast.loading('Downloading PDF...', { id: 'downloading-pdf' });
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/invoices/${invoice._id}/download-pdf`);
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber || 'Invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice PDF downloaded!', { id: 'downloading-pdf' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to download invoice PDF', { id: 'downloading-pdf' });
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (typeFilter !== 'All' && (inv.invoiceType || 'Invoice') !== typeFilter) {
      return false;
    }
    return true;
  });

  

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-600/10 text-indigo-600 rounded-2xl">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                Invoice Management
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Generate standard invoices, tax invoices, and proforma invoices to share with clients.
              </p>
            </div>
          </div>
        </div>

        {/* 3 Quick Action Buttons for Distinct Types */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => handleOpenCreateModal('Invoice')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold"
          >
            <Plus className="w-4 h-4" /> 1. Invoice
          </Button>
          <Button
            onClick={() => handleOpenCreateModal('Tax Invoice')}
            variant="outline"
            className="border-purple-200 text-purple-700 bg-purple-50/60 hover:bg-purple-100 gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold"
          >
            <Tag className="w-4 h-4" /> 2. Tax Invoice
          </Button>
          <Button
            onClick={() => handleOpenCreateModal('Proforma Invoice')}
            variant="outline"
            className="border-blue-200 text-blue-700 bg-blue-50/60 hover:bg-blue-100 gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold"
          >
            <FileText className="w-4 h-4" /> 3. Proforma Invoice
          </Button>
          <Button
            onClick={() => setActiveTab(activeTab === 'settings' ? 'invoices' : 'settings')}
            variant="outline"
            className="border-gray-200 text-gray-700 bg-gray-50 hover:bg-gray-100 gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold"
          >
            <Settings className="w-4 h-4" /> 4. Issuer Settings
          </Button>
        </div>
      </div>

      {activeTab === 'invoices' ? (
        <div className="space-y-6">
      {/* Metric Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50/70 to-white border border-indigo-100/60 rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600/80">Total Invoiced</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                ₹{(stats.totalInvoiced || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">{stats.counts?.total || 0} Invoices generated</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-inner">
              <FileText className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50/70 to-white border border-emerald-100/60 rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600/80">Paid Amount</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">
                ₹{(stats.totalPaid || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-xs text-emerald-600/70 mt-0.5">{stats.counts?.paid || 0} Completed</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50/70 to-white border border-amber-100/60 rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600/80">Pending Dues</p>
              <h3 className="text-2xl font-bold text-amber-700 mt-1">
                ₹{(stats.totalPending || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-xs text-amber-600/70 mt-0.5">{stats.counts?.pending || 0} Awaiting payment</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-inner">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50/70 to-white border border-rose-100/60 rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-600/80">Overdue Amount</p>
              <h3 className="text-2xl font-bold text-rose-700 mt-1">
                ₹{(stats.totalOverdue || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-xs text-rose-600/70 mt-0.5">{stats.counts?.overdue || 0} Past due</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-inner">
              <AlertCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Document Type Filter */}
          <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl">
            {['All', 'Invoice', 'Tax Invoice', 'Proforma Invoice'].map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  typeFilter === type
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
            {['All', 'Pending', 'Paid', 'Overdue', 'Draft', 'Cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px] md:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search #, client, email..."
            className="pl-9 bg-gray-50/50 border-gray-200 text-xs h-9 rounded-xl focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gray-400 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-medium">Loading invoices...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <Receipt className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-gray-800">No Documents Found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">
              {searchQuery || statusFilter !== 'All' || typeFilter !== 'All'
                ? 'No records match your selected filters.'
                : 'Start billing your clients by creating your first document.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {(searchQuery || statusFilter !== 'All' || typeFilter !== 'All') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('All');
                    setTypeFilter('All');
                    fetchInvoices('All', '');
                  }}
                  className="rounded-xl text-xs h-9 px-4 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Clear Filters
                </Button>
              )}
              <Button
                onClick={() => handleOpenCreateModal('Invoice')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs h-9 px-4"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Create Invoice
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  <th className="py-3.5 px-4 pl-6">Type & Document #</th>
                  <th className="py-3.5 px-4">Recipient</th>
                  <th className="py-3.5 px-4">Order # / Dates</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {filteredInvoices.map((invoice) => {
                  const invSymbol = CURRENCY_SYMBOLS[invoice.currency] || '₹';
                  const isPastDue =
                    invoice.status !== 'Paid' &&
                    invoice.status !== 'Cancelled' &&
                    invoice.dueDate &&
                    new Date(invoice.dueDate) < new Date();
                  const currentStatus = invoice.status || 'Pending';
                  const docType = invoice.invoiceType || 'Invoice';

                  return (
                    <tr
                      key={invoice._id}
                      className="hover:bg-indigo-50/30 transition-colors group"
                    >
                      {/* Type and Invoice Number */}
                      <td className="py-4 px-4 pl-6">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                            TYPE_COLORS[docType] || 'bg-indigo-50 text-indigo-700'
                          }`}
                        >
                          {docType}
                        </span>
                        <div className="mt-1">
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowPreviewModal(true);
                            }}
                            className="font-mono font-bold text-gray-900 hover:text-indigo-600 hover:underline"
                          >
                            {invoice.invoiceNumber}
                          </button>
                        </div>
                      </td>

                      {/* Recipient */}
                      <td className="py-4 px-4">
                        <div className="font-semibold text-gray-900">{invoice.client?.name || '-'}</div>
                        {invoice.client?.taxId && (
                          <div className="text-[11px] font-mono text-gray-500">
                            Tax ID: {invoice.client.taxId}
                          </div>
                        )}
                        {invoice.client?.email && (
                          <div className="text-[11px] text-gray-400">{invoice.client.email}</div>
                        )}
                      </td>

                      {/* Order No and Dates */}
                      <td className="py-4 px-4">
                        {invoice.orderNumber && (
                          <div className="text-[11px] font-mono font-medium text-gray-800">
                            Order #{invoice.orderNumber}
                          </div>
                        )}
                        <div className="text-gray-600 text-[11px]">
                          Date: {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString('en-GB') : '-'}
                        </div>
                        <div
                          className={`text-[11px] ${
                            isPastDue ? 'text-rose-600 font-semibold' : 'text-gray-400'
                          }`}
                        >
                          Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : '-'}
                          {isPastDue && currentStatus !== 'Overdue' && (
                            <span className="ml-1 text-[10px] text-rose-500 font-medium">(Past Due)</span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4">
                        <div className="text-sm font-bold text-gray-900">
                          {invSymbol}
                          {(invoice.totalAmount || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Subtotal: {invSymbol}{(invoice.subtotal || 0).toLocaleString('en-IN')}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(invoice._id, e.target.value)}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border cursor-pointer outline-none transition-all ${
                            STATUS_COLORS[currentStatus] || 'bg-gray-50 text-gray-600'
                          }`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Paid">Paid</option>
                          <option value="Overdue">Overdue</option>
                          <option value="Draft">Draft</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Preview Document"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowPreviewModal(true);
                            }}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            title="Download PDF"
                            onClick={() => handleDownloadPdf(invoice)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            title="Send to client via Email"
                            disabled={sendingEmailId === invoice._id}
                            onClick={() => handleSendEmail(invoice)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {sendingEmailId === invoice._id ? (
                              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            title="Edit Document"
                            onClick={() => handleOpenEditModal(invoice)}
                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            title="Delete Document"
                            onClick={() => handleDeleteInvoice(invoice)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* SEND EMAIL MODAL */}
      {/* ========================================================= */}
      {showEmailModal && emailTargetInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Email Invoice</h3>
                  <p className="text-xs text-gray-500 font-mono">{emailTargetInvoice.invoiceNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleExecuteSendEmail} className="p-6 space-y-4">
              {/* Invoice Summary Pill */}
              <div className="bg-blue-50/60 border border-blue-100/80 rounded-xl p-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Client:</span>
                  <span className="font-semibold text-gray-900">
                    {emailTargetInvoice.client?.name || 'Valued Client'}
                  </span>
                </div>
                {emailTargetInvoice.client?.companyName && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Company:</span>
                    <span className="text-gray-700">{emailTargetInvoice.client.companyName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Total Amount:</span>
                  <span className="font-bold text-blue-700">
                    {CURRENCY_SYMBOLS[emailTargetInvoice.currency] || '₹'}
                    {(emailTargetInvoice.totalAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Recipient Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  Recipient Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    type="email"
                    required
                    value={emailRecipient}
                    onChange={(e) => setEmailRecipient(e.target.value)}
                    placeholder="e.g. client@example.com"
                    className="pl-9 text-xs h-10 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  The client will receive an email containing a complete invoice breakdown and a direct link to view & download it.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEmailModal(false)}
                  disabled={isSendingEmail}
                  className="text-xs h-9 px-4 rounded-xl border-gray-200 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSendingEmail}
                  className="text-xs h-9 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all flex items-center gap-1.5"
                >
                  {isSendingEmail ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Send Email Now
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PREVIEW & SHARE MODAL */}
      {/* ========================================================= */}
      {showPreviewModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-gray-100 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Control Bar (Excluded from printing) */}
            <div className="print:hidden flex flex-wrap items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80 gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-gray-900 text-sm">
                  {selectedInvoice.invoiceNumber}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                    TYPE_COLORS[selectedInvoice.invoiceType || 'Invoice'] || 'bg-indigo-50 text-indigo-700'
                  }`}
                >
                  {selectedInvoice.invoiceType || 'Invoice'}
                </span>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                    STATUS_COLORS[selectedInvoice.status] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {selectedInvoice.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => handleDownloadPdf(selectedInvoice)}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-3 rounded-lg border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" /> Download PDF
                </Button>

                <Button
                  onClick={handlePrint}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-3 rounded-lg border-gray-300 gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-gray-600" /> Print
                </Button>

                <Button
                  onClick={() => handleSendEmail(selectedInvoice)}
                  disabled={sendingEmailId === selectedInvoice._id}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-3 rounded-lg border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 gap-1.5"
                >
                  {sendingEmailId === selectedInvoice._id ? (
                    <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Mail className="w-3.5 h-3.5" />
                  )}
                  Email Client
                </Button>

                <Button
                  onClick={() => {
                    handleDeleteInvoice(selectedInvoice);
                    setShowPreviewModal(false);
                  }}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-3 rounded-lg border-rose-200 text-rose-600 bg-rose-50/50 hover:bg-rose-100 hover:text-rose-700 gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>

                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Document */}
            <InvoiceDocument invoice={selectedInvoice} />
          </div>
        </div>
      )}
        </div>
      ) : (
        <Card className="border-0 shadow-sm mt-6">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Company Settings (Invoice Defaults)</h2>
            <p className="text-sm text-gray-500">Update default issuer details used when creating invoices.</p>
          </div>
          <CardContent className="p-6">
            <form onSubmit={handleCompanySettingsChange} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company Name</label>
                  <Input 
                    value={companySettings.companyName || ''}
                    onChange={(e) => setCompanySettings({...companySettings, companyName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tax ID / GSTIN</label>
                  <Input 
                    value={companySettings.taxId || ''}
                    onChange={(e) => setCompanySettings({...companySettings, taxId: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Address</label>
                  <Input 
                    value={companySettings.address || ''}
                    onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Postal Code</label>
                  <Input 
                    value={companySettings.postalCode || ''}
                    onChange={(e) => setCompanySettings({...companySettings, postalCode: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input 
                    value={companySettings.phone || ''}
                    onChange={(e) => setCompanySettings({...companySettings, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input 
                    value={companySettings.email || ''}
                    onChange={(e) => setCompanySettings({...companySettings, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-gray-100">
                <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wider">Bank Details (Tax Invoice Only)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-sm font-medium">Primary holder's name</label>
                    <Input 
                      value={companySettings.paymentDetails?.primaryHolderName || ''}
                      onChange={(e) => setCompanySettings({...companySettings, paymentDetails: {...companySettings.paymentDetails, primaryHolderName: e.target.value}})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Account Number</label>
                    <Input 
                      value={companySettings.paymentDetails?.accountNumber || ''}
                      onChange={(e) => setCompanySettings({...companySettings, paymentDetails: {...companySettings.paymentDetails, accountNumber: e.target.value}})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Account Type</label>
                    <Input 
                      value={companySettings.paymentDetails?.accountType || ''}
                      onChange={(e) => setCompanySettings({...companySettings, paymentDetails: {...companySettings.paymentDetails, accountType: e.target.value}})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bank Name</label>
                    <Input 
                      value={companySettings.paymentDetails?.bankName || ''}
                      onChange={(e) => setCompanySettings({...companySettings, paymentDetails: {...companySettings.paymentDetails, bankName: e.target.value}})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">IFSC Code</label>
                    <Input 
                      value={companySettings.paymentDetails?.ifscCode || ''}
                      onChange={(e) => setCompanySettings({...companySettings, paymentDetails: {...companySettings.paymentDetails, ifscCode: e.target.value}})}
                    />
                  </div>
                  <div className="space-y-2 lg:col-span-3">
                    <label className="text-sm font-medium">Branch</label>
                    <Input 
                      value={companySettings.paymentDetails?.branch || ''}
                      onChange={(e) => setCompanySettings({...companySettings, paymentDetails: {...companySettings.paymentDetails, branch: e.target.value}})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Company Logo</label>
                  {companySettings.logoUrl && companySettings.logoUrl !== '/logo.png' && (
                    <button
                      type="button"
                      onClick={() => setCompanySettings({...companySettings, logoUrl: '/logo.png'})}
                      className="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded border border-indigo-200 font-medium transition-colors"
                    >
                      Default App Logo
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {companySettings.logoUrl ? (
                    <div className="relative group bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
                      <img
                        src={companySettings.logoUrl}
                        alt="Company Logo"
                        className="h-12 w-32 object-contain"
                        onError={(e) => { e.target.src = '/logo.png'; }}
                      />
                      <button
                        type="button"
                        onClick={() => setCompanySettings({...companySettings, logoUrl: ''})}
                        className="absolute -top-2 -right-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-sm transition-transform hover:scale-110"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-12 px-4 bg-gray-100 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
                      No logo selected
                    </div>
                  )}

                  <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm px-4 py-2 rounded-xl font-medium shadow-sm transition-all flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    Change Logo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCompanyLogoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" disabled={isUpdatingCompany}>
                  {isUpdatingCompany ? 'Saving...' : 'Save Company Settings'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
