import { useState, useEffect, useRef, Fragment } from 'react';
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
  ChevronDown,
  Settings
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirm } from '../../context/ConfirmContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import InvoiceDocument from '@/components/InvoiceDocument';
import FitToView from '@/components/FitToView';
import { displayInvoiceNumber } from '@/lib/invoiceNumber';
import { formatTaxId } from '@/lib/formatTaxId';

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


// Pending / Paid / Overdue as the cards count them: anything unpaid and past its due date is Overdue
const effectiveStatus = (inv) => {
  const status = inv.status || 'Pending';
  if (status !== 'Paid' && status !== 'Cancelled' && inv.dueDate && new Date(inv.dueDate) < new Date()) {
    return 'Overdue';
  }
  return status;
};

const STATUS_VIEW_LABELS = {
  Paid: 'Paid invoices',
  Pending: 'Pending dues',
  Overdue: 'Overdue invoices',
  Draft: 'Draft invoices',
  Cancelled: 'Cancelled invoices',
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
    companyName: '', taxId: '', pan: '', stateName: '', stateCode: '', address: '', postalCode: '', phone: '', email: '', logoUrl: '',
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

  // Escape closes the open popup: the email box first, otherwise the invoice preview
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (showEmailModal) setShowEmailModal(false);
      else if (showPreviewModal) setShowPreviewModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showEmailModal, showPreviewModal]);
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
  }, []);

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
    if (type === 'Proforma Invoice') return 'PRO-INV-001';
    if (type === 'Tax Invoice') return '0001';
    return `INV-${year}-0001`;
  };

  const handleOpenCreateModal = (type = 'Invoice') => {
    navigate(`/admin/invoices/create?type=${encodeURIComponent(type)}`);
  };

  
  const handleOpenEditModal = (invoice) => {
    navigate(`/admin/invoices/edit/${invoice._id}`);
  };

  // Opens the create form pre-filled from this invoice, with the next number
  const handleDuplicateInvoice = (invoice) => {
    navigate(`/admin/invoices/create?duplicate=${invoice._id}`);
  };


  // Proforma paid -> becomes a Tax Invoice with the next TAX-yyyy-nnnn number
  const handleMarkPaymentCompleted = (invoice) => {
    confirm({
      title: 'Convert to Invoice',
      message: `${invoice.customInvoiceNumber || invoice.invoiceNumber} will be converted to an Invoice with the next invoice number, and marked as Paid.`,
      confirmText: 'Convert to Invoice',
      cancelText: 'Cancel',
      action: async () => {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/invoices/${invoice._id}/mark-paid`, {
            method: 'POST',
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            toast.success(`Converted. Invoice #${displayInvoiceNumber(data)} generated.`);
            fetchInvoices();
            if (selectedInvoice?._id === invoice._id) setSelectedInvoice(data);
          } else {
            toast.error(data.message || 'Failed to convert to Invoice');
          }
        } catch (err) {
          console.error('Error converting proforma:', err);
          toast.error('Error converting to Invoice');
        }
      },
    });
  };

  const handleStatusChange = async (invoiceId, newStatus) => {
    // Paying a proforma means issuing its tax invoice, not just flipping a flag
    const target = invoices.find((inv) => inv._id === invoiceId);
    if (target?.invoiceType === 'Proforma Invoice' && newStatus === 'Paid') {
      handleMarkPaymentCompleted(target);
      return;
    }
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
      message: `Are you sure you want to delete ${invoice.invoiceType || 'invoice'} ${displayInvoiceNumber(invoice)}? This action cannot be undone.`,
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
    const text = `Hello ${invoice.client?.name || 'Client'},\n\nPlease find your ${invoice.invoiceType || 'Invoice'} *${displayInvoiceNumber(invoice)}* from *${invoice.sender?.name || invoice.sender?.companyName || 'Techie Nutpam'}*.\n\n*Amount Due:* ${sym}${invoice.totalAmount?.toLocaleString('en-IN')}\n*Due Date:* ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : 'Immediate'}\n\nYou can view and download the invoice here:\n${link}\n\nThank you!`;
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
      a.download = `${invoice.invoiceType === 'Tax Invoice' ? 'Invoice-' : ''}${displayInvoiceNumber(invoice) || 'Invoice'}.pdf`;
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
    if (statusFilter !== 'All') {
      const eff = effectiveStatus(inv);
      // "Pending dues" on the card includes drafts, so the list does too
      const matches = statusFilter === 'Pending' ? eff === 'Pending' || eff === 'Draft' : eff === statusFilter;
      if (!matches) return false;
    }
    return true;
  });

  // Clicking a summary card filters the table below it and scrolls it into view
  const tableRef = useRef(null);
  const handleCardClick = (status) => {
    setStatusFilter(statusFilter === status ? 'All' : status);
    setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };
  const cardClass = (status, ring) =>
    `cursor-pointer transition-all hover:shadow-md ${
      statusFilter === status ? `ring-2 ${ring} shadow-md` : ''
    }`;

  // Months can be folded away; all are open by default
  const [collapsedMonths, setCollapsedMonths] = useState(() => new Set());
  const toggleMonth = (key) =>
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Group the (already type-filtered) list by issue month, newest month first.
  // Applies to every tab: All, Invoice, Proforma Invoice and Tax Invoice.
  const monthGroups = (() => {
    const groups = new Map();
    filteredInvoices.forEach((inv) => {
      const d = new Date(inv.issueDate || inv.createdAt);
      const valid = !isNaN(d.getTime());
      const key = valid ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : 'unknown';
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: valid ? d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'No date',
          invoices: [],
        });
      }
      groups.get(key).invoices.push(inv);
    });
    const issueTime = (inv) => new Date(inv.issueDate || inv.createdAt).getTime() || 0;
    return [...groups.values()]
      .sort((a, b) => (a.key === 'unknown') - (b.key === 'unknown') || b.key.localeCompare(a.key))
      .map((g) => {
        const currencies = new Set(g.invoices.map((i) => i.currency || 'INR'));
        const total = g.invoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
        return {
          ...g,
          invoices: [...g.invoices].sort((a, b) => issueTime(b) - issueTime(a)),
          total: currencies.size === 1 ? total : null,
          symbol: CURRENCY_SYMBOLS[[...currencies][0]] || '₹',
        };
      });
  })();

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
            onClick={() => handleOpenCreateModal('Proforma Invoice')}
            variant="outline"
            className="border-blue-200 text-blue-700 bg-blue-50/60 hover:bg-blue-100 gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold"
          >
            <FileText className="w-4 h-4" /> 2. Proforma Invoice
          </Button>
          <Button
            onClick={() => handleOpenCreateModal('Tax Invoice')}
            variant="outline"
            className="border-purple-200 text-purple-700 bg-purple-50/60 hover:bg-purple-100 gap-1.5 h-10 px-4 rounded-xl text-xs font-semibold"
          >
            <Tag className="w-4 h-4" /> 3. Tax Invoice
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
        <Card onClick={() => { setStatusFilter('All'); setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }} className={`border-0 shadow-sm bg-gradient-to-br from-indigo-50/70 to-white border border-indigo-100/60 rounded-2xl cursor-pointer transition-all hover:shadow-md ${statusFilter === 'All' ? 'ring-2 ring-indigo-300' : ''}`}>
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

        <Card onClick={() => handleCardClick('Paid')} className={`border-0 shadow-sm bg-gradient-to-br from-emerald-50/70 to-white border border-emerald-100/60 rounded-2xl ${cardClass('Paid', 'ring-emerald-400')}`}>
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

        <Card onClick={() => handleCardClick('Pending')} className={`border-0 shadow-sm bg-gradient-to-br from-amber-50/70 to-white border border-amber-100/60 rounded-2xl ${cardClass('Pending', 'ring-amber-400')}`}>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600/80">Pending Dues</p>
              <h3 className="text-2xl font-bold text-amber-700 mt-1">
                ₹{(stats.totalPending || 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-xs text-amber-600/70 mt-0.5">{(stats.counts?.pending || 0) + (stats.counts?.draft || 0)} Awaiting payment</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-inner">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card onClick={() => handleCardClick('Overdue')} className={`border-0 shadow-sm bg-gradient-to-br from-rose-50/70 to-white border border-rose-100/60 rounded-2xl ${cardClass('Overdue', 'ring-rose-400')}`}>
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
            {['All', 'Invoice', 'Proforma Invoice', 'Tax Invoice'].map((type) => (
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

      {/* Fold / unfold every month at once */}
      {monthGroups.length > 1 && (
        <div className="flex justify-end items-center gap-3 text-xs font-semibold text-indigo-700 -mb-2">
          <button
            onClick={() => setCollapsedMonths(new Set())}
            className="hover:text-indigo-900 hover:underline"
          >
            Expand all
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => setCollapsedMonths(new Set(monthGroups.map((g) => g.key)))}
            className="hover:text-indigo-900 hover:underline"
          >
            Collapse all
          </button>
        </div>
      )}

      {/* Active summary filter */}
      {statusFilter !== 'All' && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs">
          <span className="font-semibold text-indigo-900">
            Showing {STATUS_VIEW_LABELS[statusFilter] || statusFilter}: {filteredInvoices.length}{' '}
            {filteredInvoices.length === 1 ? 'document' : 'documents'}
            {filteredInvoices.length > 0 &&
              ` · ₹${filteredInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0).toLocaleString('en-IN')}`}
          </span>
          <button
            onClick={() => setStatusFilter('All')}
            className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
          >
            Show all
          </button>
        </div>
      )}

      {/* Invoices List Table */}
      <div ref={tableRef} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden scroll-mt-4">
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
                  <th className="py-3 pr-3 pl-5 whitespace-nowrap">Type &amp; Document #</th>
                  <th className="py-3 px-3 whitespace-nowrap">Recipient</th>
                  <th className="py-3 px-3 whitespace-nowrap">Order # / Dates</th>
                  <th className="py-3 px-3 whitespace-nowrap">Amount</th>
                  <th className="py-3 px-3 whitespace-nowrap">Status</th>
                  <th className="py-3 pl-3 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {monthGroups.map((group) => (
                  <Fragment key={group.key}>
                  <tr
                    onClick={() => toggleMonth(group.key)}
                    className="bg-indigo-50/60 border-y border-indigo-100 cursor-pointer select-none hover:bg-indigo-100/60 transition-colors"
                  >
                    <td colSpan={6} className="py-2.5 px-6">
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          aria-expanded={!collapsedMonths.has(group.key)}
                          title={collapsedMonths.has(group.key) ? 'Expand this month' : 'Collapse this month'}
                          className="flex items-center gap-2 text-xs font-bold text-indigo-900 uppercase tracking-wider"
                        >
                          <ChevronDown
                            className={`w-4 h-4 text-indigo-600 transition-transform duration-200 ${
                              collapsedMonths.has(group.key) ? '-rotate-90' : ''
                            }`}
                          />
                          {group.label}
                        </button>
                        <span className="text-[11px] font-medium text-indigo-700/80">
                          {group.invoices.length} {group.invoices.length === 1 ? 'document' : 'documents'}
                          {group.total !== null && ` · ${group.symbol}${group.total.toLocaleString('en-IN')}`}
                        </span>
                      </div>
                    </td>
                  </tr>
                {!collapsedMonths.has(group.key) && group.invoices.map((invoice) => {
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
                      onClick={(e) => {
                        if (e.target.closest('button, select, a, input, textarea, label')) return;
                        setSelectedInvoice(invoice);
                        setShowPreviewModal(true);
                      }}
                      className="hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                    >
                      {/* Type (left) and document number (right), on one line */}
                      <td className="py-2.5 pr-3 pl-5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`inline-flex items-center leading-none text-[10px] font-bold px-2.5 py-1.5 rounded-full border uppercase tracking-wider ${
                              TYPE_COLORS[docType] || 'bg-indigo-50 text-indigo-700'
                            }`}
                          >
                            {docType}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowPreviewModal(true);
                            }}
                            className="font-mono font-bold text-gray-900 hover:text-indigo-600 hover:underline"
                          >
                            {displayInvoiceNumber(invoice)}
                          </button>
                        </div>
                        {(invoice.proformaNumber ||
                          invoice.orderNumber ||
                          (docType !== 'Tax Invoice' &&
                            invoice.customInvoiceNumber &&
                            invoice.customInvoiceNumber !== invoice.invoiceNumber)) && (
                          <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                            {[
                              invoice.proformaNumber
                                ? `from ${invoice.proformaNumber}`
                                : docType !== 'Tax Invoice' &&
                                  invoice.customInvoiceNumber &&
                                  invoice.customInvoiceNumber !== invoice.invoiceNumber &&
                                  invoice.customInvoiceNumber,
                              invoice.orderNumber && `Order #${invoice.orderNumber}`,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        )}
                      </td>

                      {/* Recipient: name, then tax id / email */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-gray-900 truncate max-w-[190px]" title={invoice.client?.name}>
                          {invoice.client?.name || '-'}
                        </div>
                        {(invoice.client?.taxId || invoice.client?.email) && (
                          <div
                            className="text-[11px] text-gray-500 truncate max-w-[190px]"
                            title={[
                              invoice.client?.taxId && formatTaxId(invoice.client.taxIdLabel, invoice.client.taxId),
                              invoice.client?.email,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          >
                            {[
                              invoice.client?.taxId && formatTaxId(invoice.client.taxIdLabel, invoice.client.taxId),
                              invoice.client?.email,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        )}
                      </td>

                      {/* Dates (and order number) */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="text-gray-700 text-[11px]">
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
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {invSymbol}
                          {(invoice.totalAmount || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Subtotal: {invSymbol}{(invoice.subtotal || 0).toLocaleString('en-IN')}
                        </div>
                      </td>

                      {/* Status (+ convert action, side by side) */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
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
                          {docType === 'Proforma Invoice' && currentStatus !== 'Cancelled' && (
                            <button
                              title="Payment received: convert this proforma to an Invoice"
                              onClick={() => handleMarkPaymentCompleted(invoice)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-full transition-colors flex items-center gap-1 whitespace-nowrap"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Convert to Invoice
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 pl-3 pr-5 text-right whitespace-nowrap">
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
                            title="Duplicate (new number, same details)"
                            onClick={() => handleDuplicateInvoice(invoice)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Copy className="w-4 h-4" />
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
                  </Fragment>
                ))}
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
                  <p className="text-xs text-gray-500 font-mono">{displayInvoiceNumber(emailTargetInvoice)}</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-[1180px] h-[calc(100vh-1.5rem)] rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex animate-in fade-in zoom-in-95 duration-200">
            {/* Invoice: scaled to fit so it can be read top to bottom without scrolling */}
            <div className="flex-1 min-w-0 bg-gray-100 p-3">
              <FitToView>
                <InvoiceDocument invoice={selectedInvoice} fit />
              </FitToView>
            </div>

            {/* Actions (excluded from printing) */}
            <aside className="print:hidden w-56 shrink-0 border-l border-gray-100 bg-white p-4 flex flex-col gap-2 overflow-y-auto">
              <div className="flex items-start justify-between gap-2 pb-3 mb-1 border-b border-gray-100">
                <div className="min-w-0">
                  <div className="font-mono font-bold text-gray-900 text-sm break-all">
                    {displayInvoiceNumber(selectedInvoice)}
                  </div>
                  {selectedInvoice.proformaNumber && (
                    <div className="text-[10px] text-gray-400 mt-0.5">from {selectedInvoice.proformaNumber}</div>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span
                      className={`inline-flex items-center whitespace-nowrap leading-none text-[10px] font-bold px-2.5 py-1.5 rounded-full border uppercase tracking-wider ${
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
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedInvoice.invoiceType === 'Proforma Invoice' && selectedInvoice.status !== 'Cancelled' && (
                <Button
                  onClick={() => handleMarkPaymentCompleted(selectedInvoice)}
                  size="sm"
                  className="w-full justify-start text-xs h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" /> Convert to Invoice
                </Button>
              )}

              <Button
                onClick={() => handleDownloadPdf(selectedInvoice)}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-9 px-3 rounded-lg border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 gap-2"
              >
                <Download className="w-4 h-4 text-indigo-600" /> Download PDF
              </Button>

              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-9 px-3 rounded-lg border-gray-300 gap-2"
              >
                <Printer className="w-4 h-4 text-gray-600" /> Print
              </Button>

              <Button
                onClick={() => handleSendEmail(selectedInvoice)}
                disabled={sendingEmailId === selectedInvoice._id}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-9 px-3 rounded-lg border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-100 gap-2"
              >
                {sendingEmailId === selectedInvoice._id ? (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Email Client
              </Button>

              <Button
                onClick={() => handleShareWhatsApp(selectedInvoice)}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-9 px-3 rounded-lg border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 gap-2"
              >
                <Send className="w-4 h-4" /> Share on WhatsApp
              </Button>

              <Button
                onClick={() => handleDuplicateInvoice(selectedInvoice)}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-9 px-3 rounded-lg border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 gap-2"
              >
                <Copy className="w-4 h-4" /> Duplicate
              </Button>

              <Button
                onClick={() => handleCopyLink(selectedInvoice)}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-9 px-3 rounded-lg border-gray-300 gap-2"
              >
                <Copy className="w-4 h-4 text-gray-600" /> Copy client link
              </Button>

              <Button
                onClick={() => {
                  handleDeleteInvoice(selectedInvoice);
                  setShowPreviewModal(false);
                }}
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs h-9 px-3 rounded-lg border-rose-200 text-rose-600 bg-rose-50/50 hover:bg-rose-100 hover:text-rose-700 gap-2 mt-auto"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            </aside>
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
                  <input
                    type="text"
                    value={companySettings.taxIdLabel !== undefined ? companySettings.taxIdLabel : 'Tax ID / GSTIN'}
                    onChange={(e) => setCompanySettings({...companySettings, taxIdLabel: e.target.value})}
                    className="text-sm font-semibold text-gray-700 block mb-1 border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors w-full max-w-[200px]"
                    placeholder="e.g. GSTIN, VAT"
                  />
                  <Input 
                    value={companySettings.taxId || ''}
                    onChange={(e) => setCompanySettings({...companySettings, taxId: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">PAN / IT No</label>
                  <Input 
                    value={companySettings.pan || ''}
                    onChange={(e) => setCompanySettings({...companySettings, pan: e.target.value})}
                    placeholder="e.g. AAJCT7527M"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">State Name</label>
                  <Input 
                    value={companySettings.stateName || ''}
                    onChange={(e) => setCompanySettings({...companySettings, stateName: e.target.value})}
                    placeholder="e.g. Tamil Nadu"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">State Code</label>
                  <Input 
                    value={companySettings.stateCode || ''}
                    onChange={(e) => setCompanySettings({...companySettings, stateCode: e.target.value})}
                    placeholder="e.g. 33"
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
