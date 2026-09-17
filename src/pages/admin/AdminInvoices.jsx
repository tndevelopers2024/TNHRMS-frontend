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
  RotateCcw
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirm } from '../../context/ConfirmContext';
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

// Default Banking Details for Tax Invoice only
const DEFAULT_TAX_INVOICE_BANKING = {
  primaryHolderName: 'TECHIENUTPAM (OPC) PRIVATE LIMITED',
  accountNumber: '5020 0123 8459 51',
  accountType: 'Current Account',
  bankName: 'HDFC Bank',
  ifscCode: 'HDFC0002050',
  branch: 'PALLAVARAM',
  notes: ''
};

const EMPTY_BANKING = {
  primaryHolderName: '',
  accountNumber: '',
  accountType: '',
  bankName: '',
  ifscCode: '',
  branch: '',
  notes: ''
};

const initialInvoiceState = {
  invoiceType: 'Invoice',
  invoiceNumber: '',
  orderNumber: '',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: '',
  status: 'Pending',
  currency: 'INR',
  sender: {
    name: '',
    companyName: '',
    taxId: '',
    address: '',
    postalCode: '',
    email: '',
    phone: '',
    logoUrl: '/logo.png',
    website: '',
  },
  client: {
    name: '',
    companyName: '',
    taxId: '',
    address: '',
    postalCode: '',
    email: '',
    phone: '',
  },
  items: [
    { description: '', quantity: 1, rate: 0, tax: 0, amount: 0 }
  ],
  taxRate: 0,
  discount: 0,
  signature: {
    signatureType: 'typed',
    signatoryName: '',
    data: '',
  },
  paymentDetails: { ...EMPTY_BANKING },
  terms: '',
  notes: '',
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

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialInvoiceState);
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTaxPopoverIndex, setActiveTaxPopoverIndex] = useState(null);
  const [customTaxInput, setCustomTaxInput] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTargetInvoice, setEmailTargetInvoice] = useState(null);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Signature modal state
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureMode, setSignatureMode] = useState('typed');
  const [typedSignName, setTypedSignName] = useState('');
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const { confirm } = useConfirm();

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

  const handleOpenCreateModal = async (type = 'Invoice') => {
    setIsEditing(false);
    setEditingId(null);
    const bankDetails = type === 'Tax Invoice'
      ? { ...DEFAULT_TAX_INVOICE_BANKING }
      : { ...EMPTY_BANKING };

    const nextNumber = await fetchNextInvoiceNumber(type);

    setFormData({
      ...initialInvoiceState,
      invoiceType: type,
      invoiceNumber: nextNumber,
      paymentDetails: bankDetails,
    });
    setShowCreateModal(true);
  };

  const handleTypeChange = async (newType) => {
    const bankDetails = newType === 'Tax Invoice'
      ? { ...DEFAULT_TAX_INVOICE_BANKING }
      : { ...EMPTY_BANKING };

    // When creating, re-fetch the serial number for the new type pattern
    let nextNum = formData.invoiceNumber;
    if (!isEditing) {
      nextNum = await fetchNextInvoiceNumber(newType);
    }

    setFormData((prev) => ({
      ...prev,
      invoiceType: newType,
      invoiceNumber: nextNum,
      paymentDetails: bankDetails,
    }));
  };

  const handleOpenEditModal = (invoice) => {
    setIsEditing(true);
    setEditingId(invoice._id);
    setFormData({
      invoiceType: invoice.invoiceType || 'Invoice',
      invoiceNumber: invoice.invoiceNumber,
      orderNumber: invoice.orderNumber || '',
      currency: invoice.currency || 'INR',
      issueDate: invoice.issueDate ? invoice.issueDate.split('T')[0] : '',
      dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : '',
      status: invoice.status || 'Pending',
      client: {
        name: invoice.client?.name || '',
        companyName: invoice.client?.companyName || '',
        taxId: invoice.client?.taxId || invoice.client?.gstin || '',
        address: invoice.client?.address || '',
        postalCode: invoice.client?.postalCode || '',
        email: invoice.client?.email || '',
        phone: invoice.client?.phone || '',
      },
      sender: {
        name: invoice.sender?.name || invoice.sender?.companyName || '',
        companyName: invoice.sender?.companyName || '',
        taxId: invoice.sender?.taxId || invoice.sender?.gstin || '',
        address: invoice.sender?.address || '',
        postalCode: invoice.sender?.postalCode || '',
        email: invoice.sender?.email || '',
        phone: invoice.sender?.phone || '',
        logoUrl: invoice.sender?.logoUrl !== undefined ? invoice.sender.logoUrl : '/logo.png',
        website: invoice.sender?.website || '',
      },
      items: invoice.items?.length
        ? invoice.items.map((it) => ({
            description: it.description || '',
            quantity: it.quantity,
            rate: it.rate,
            tax: it.tax || 0,
            amount: it.amount,
          }))
        : [{ description: '', quantity: 1, rate: 0, tax: 0, amount: 0 }],
      taxRate: invoice.taxRate ?? 0,
      discount: invoice.discount ?? 0,
      signature: invoice.signature || {
        signatureType: 'typed',
        signatoryName: '',
        data: '',
      },
      paymentDetails: {
        primaryHolderName: invoice.paymentDetails?.primaryHolderName || (invoice.invoiceType === 'Tax Invoice' ? DEFAULT_TAX_INVOICE_BANKING.primaryHolderName : ''),
        accountNumber: invoice.paymentDetails?.accountNumber || (invoice.invoiceType === 'Tax Invoice' ? DEFAULT_TAX_INVOICE_BANKING.accountNumber : ''),
        accountType: invoice.paymentDetails?.accountType || (invoice.invoiceType === 'Tax Invoice' ? DEFAULT_TAX_INVOICE_BANKING.accountType : ''),
        bankName: invoice.paymentDetails?.bankName || (invoice.invoiceType === 'Tax Invoice' ? DEFAULT_TAX_INVOICE_BANKING.bankName : ''),
        ifscCode: invoice.paymentDetails?.ifscCode || (invoice.invoiceType === 'Tax Invoice' ? DEFAULT_TAX_INVOICE_BANKING.ifscCode : ''),
        branch: invoice.paymentDetails?.branch || (invoice.invoiceType === 'Tax Invoice' ? DEFAULT_TAX_INVOICE_BANKING.branch : ''),
        notes: invoice.paymentDetails?.notes || '',
      },
      terms: invoice.terms || '',
      notes: invoice.notes || '',
    });
    setShowCreateModal(true);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setFormData((prev) => ({
        ...prev,
        sender: {
          ...prev.sender,
          logoUrl: uploadEvent.target.result,
        },
      }));
      toast.success('Logo uploaded');
    };
    reader.readAsDataURL(file);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
    };

    const qty = parseFloat(field === 'quantity' ? value : newItems[index].quantity) || 0;
    const rate = parseFloat(field === 'rate' ? value : newItems[index].rate) || 0;
    newItems[index].amount = Math.round(qty * rate * 100) / 100;

    setFormData({ ...formData, items: newItems });
  };

  const addItemRow = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { description: '', quantity: 1, rate: 0, tax: 0, amount: 0 },
      ],
    });
  };

  const removeItemRow = (index) => {
    if (formData.items.length <= 1) {
      toast.error('Invoice must contain at least one item');
      return;
    }
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalItemTaxes = 0;

    formData.items.forEach((item) => {
      const amt = parseFloat(item.amount) || 0;
      subtotal += amt;
      const taxPct = parseFloat(item.tax) || 0;
      if (taxPct > 0) {
        totalItemTaxes += Math.round(amt * (taxPct / 100) * 100) / 100;
      }
    });

    const discount = parseFloat(formData.discount) || 0;
    const overallTaxRate = parseFloat(formData.taxRate) || 0;
    const taxAmount = overallTaxRate > 0
      ? Math.round(Math.max(0, subtotal - discount) * (overallTaxRate / 100) * 100) / 100
      : totalItemTaxes;
    const totalAmount = Math.max(0, Math.round((subtotal - discount + taxAmount) * 100) / 100);

    return { subtotal, discount, taxAmount, totalAmount };
  };

  const { subtotal, taxAmount, totalAmount } = calculateTotals();

  // Signature drawing
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e1b4b';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveSignature = () => {
    if (signatureMode === 'drawn') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      setFormData((prev) => ({
        ...prev,
        signature: {
          signatureType: 'drawn',
          signatoryName: typedSignName || 'Authorized Signatory',
          data: dataUrl,
        },
      }));
    } else if (signatureMode === 'typed') {
      setFormData((prev) => ({
        ...prev,
        signature: {
          signatureType: 'typed',
          signatoryName: typedSignName || 'Authorized Signatory',
          data: typedSignName,
        },
      }));
    }
    setShowSignatureModal(false);
    toast.success('Signature saved!');
  };

  const handleSignatureUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setFormData((prev) => ({
        ...prev,
        signature: {
          signatureType: 'uploaded',
          signatoryName: typedSignName || 'Authorized Signatory',
          data: uploadEvent.target.result,
        },
      }));
      setShowSignatureModal(false);
      toast.success('Signature uploaded!');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitInvoice = async (e) => {
    e?.preventDefault();
    if (!formData.client.name.trim()) {
      toast.error('Recipient Name / Business is required');
      return;
    }
    if (!formData.items.length || !formData.items.some((i) => i.description.trim())) {
      toast.error('Please add at least one item description');
      return;
    }

    setIsSaving(true);
    try {
      const url = isEditing
        ? `${import.meta.env.VITE_API_URL}/api/admin/invoices/${editingId}`
        : `${import.meta.env.VITE_API_URL}/api/admin/invoices`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(
          isEditing
            ? `${formData.invoiceType} updated successfully!`
            : `${formData.invoiceType} created successfully!`
        );
        setShowCreateModal(false);
        setSearchQuery('');
        setStatusFilter('All');
        setTypeFilter('All');
        await fetchInvoices('All', '');
      } else {
        toast.error(data.message || 'Failed to save invoice');
      }
    } catch (err) {
      console.error('Error saving invoice:', err);
      toast.error('Error saving invoice');
    } finally {
      setIsSaving(false);
    }
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

  const symbol = CURRENCY_SYMBOLS[formData.currency] || '₹';

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
        </div>
      </div>

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
      {/* CREATE / EDIT INVOICE MODAL */}
      {/* ========================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-100 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header with Invoice Type Selector */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 via-white to-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-gray-900">
                        {isEditing ? `Edit ${formData.invoiceType}` : `Create ${formData.invoiceType}`}
                      </h2>
                      {formData.invoiceNumber && (
                        <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {formData.invoiceNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Specify the document details, its issuer, and its recipient.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Document Type Selector Tabs */}
              <div className="flex items-center gap-2 p-1 bg-gray-100/90 rounded-2xl w-fit">
                {['Invoice', 'Tax Invoice', 'Proforma Invoice'].map((type, idx) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      formData.invoiceType === type
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>{idx + 1}. {type}</span>
                    {formData.invoiceType === type && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitInvoice} className="p-6 space-y-6 max-h-[78vh] overflow-y-auto custom-scrollbar">
              
              {/* SECTION 1: General Information (Date, Due date) */}
              <div className="space-y-3">
                <div className="border-b border-gray-100 pb-2">
                  <h3 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    General Information
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Date
                    </label>
                    <Input
                      type="date"
                      required
                      value={formData.issueDate}
                      onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                      className="text-xs h-9 bg-white"
                    />
                  </div>

                  {/* Due date */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Due date
                    </label>
                    <Input
                      type="date"
                      placeholder="DD/MM/YYYY"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="text-xs h-9 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Issuer & Recipient details (No prefilled text) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Issuer details */}
                <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200/70 pb-2">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600" /> Issuer details
                    </h3>
                  </div>

                  {/* Name / Business * */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Name / Business <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="My company"
                      value={formData.sender.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sender: { ...formData.sender, name: e.target.value, companyName: e.target.value },
                        })
                      }
                      className="text-xs h-9 bg-white"
                    />
                  </div>

                  {/* Tax ID */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Tax ID
                    </label>
                    <Input
                      placeholder="E.g. 010101"
                      value={formData.sender.taxId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sender: { ...formData.sender, taxId: e.target.value },
                        })
                      }
                      className="text-xs h-9 bg-white font-mono"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Address
                    </label>
                    <Input
                      placeholder="E.g. Av. Calle Principal 1010, Bs As"
                      value={formData.sender.address}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sender: { ...formData.sender, address: e.target.value },
                        })
                      }
                      className="text-xs h-9 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Postal Code */}
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">
                        Postal Code
                      </label>
                      <Input
                        placeholder="E.g. 0909"
                        value={formData.sender.postalCode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sender: { ...formData.sender, postalCode: e.target.value },
                          })
                        }
                        className="text-xs h-9 bg-white font-mono"
                      />
                    </div>
                    {/* Phone */}
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">
                        Phone
                      </label>
                      <Input
                        placeholder="E.g. 012345678"
                        value={formData.sender.phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            sender: { ...formData.sender, phone: e.target.value },
                          })
                        }
                        className="text-xs h-9 bg-white"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="E.g. name@email.com"
                      value={formData.sender.email}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sender: { ...formData.sender, email: e.target.value },
                        })
                      }
                      className="text-xs h-9 bg-white"
                    />
                  </div>

                  {/* Company Logo */}
                  <div className="pt-2.5 border-t border-gray-200/70">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-gray-700">
                        Company Logo
                      </label>
                      {formData.sender.logoUrl === '/logo.png' && (
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          Default App Logo
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {formData.sender.logoUrl ? (
                        <div className="relative group bg-white p-1.5 rounded-xl border border-gray-200 shadow-2xs">
                          <img
                            src={formData.sender.logoUrl}
                            alt="Company Logo"
                            className="h-10 w-28 object-contain"
                            onError={(e) => {
                              e.target.src = '/logo.png';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                sender: { ...formData.sender, logoUrl: '' },
                              })
                            }
                            title="Remove logo"
                            className="absolute -top-1.5 -right-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full p-1 shadow-sm transition-transform hover:scale-110"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-10 px-3 bg-gray-100 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-[11px] text-gray-400">
                          No logo selected
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs px-3 py-2 rounded-xl font-medium shadow-2xs transition-all inline-flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          {formData.sender.logoUrl ? 'Change Logo' : 'Upload Logo'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>

                        {formData.sender.logoUrl !== '/logo.png' && (
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                sender: { ...formData.sender, logoUrl: '/logo.png' },
                              })
                            }
                            title="Reset to default app logo"
                            className="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-2 rounded-xl border border-indigo-200 font-medium transition-colors flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Default Logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recipient details */}
                <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                    <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-4 h-4 text-indigo-600" /> Recipient details
                    </h3>
                  </div>

                  {/* Name / Business * */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Name / Business <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      required
                      placeholder="My company"
                      value={formData.client.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          client: { ...formData.client, name: e.target.value },
                        })
                      }
                      className="text-xs h-9 bg-white"
                    />
                  </div>

                  {/* Tax ID */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Tax ID
                    </label>
                    <Input
                      placeholder="E.g. 010101"
                      value={formData.client.taxId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          client: { ...formData.client, taxId: e.target.value },
                        })
                      }
                      className="text-xs h-9 bg-white font-mono"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Address
                    </label>
                    <Input
                      placeholder="E.g. Av. Calle Principal 1010, Bs As"
                      value={formData.client.address}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          client: { ...formData.client, address: e.target.value },
                        })
                      }
                      className="text-xs h-9 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Postal Code */}
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">
                        Postal Code
                      </label>
                      <Input
                        placeholder="E.g. 0909"
                        value={formData.client.postalCode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            client: { ...formData.client, postalCode: e.target.value },
                          })
                        }
                        className="text-xs h-9 bg-white font-mono"
                      />
                    </div>
                    {/* Phone */}
                    <div>
                      <label className="text-xs font-medium text-gray-700 block mb-1">
                        Phone
                      </label>
                      <Input
                        placeholder="E.g. 012345678"
                        value={formData.client.phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            client: { ...formData.client, phone: e.target.value },
                          })
                        }
                        className="text-xs h-9 bg-white"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="E.g. name@email.com"
                      value={formData.client.email}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          client: { ...formData.client, email: e.target.value },
                        })
                      }
                      className="text-xs h-9 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Bank Details ONLY IN TAX INVOICE */}
              {formData.invoiceType === 'Tax Invoice' && (
                <div className="p-4 rounded-2xl border border-purple-200/80 bg-purple-50/30 space-y-3 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-purple-600" />
                      <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                        Bank Details (Tax Invoice Only)
                      </h3>
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                        Default & Editable
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          paymentDetails: { ...DEFAULT_TAX_INVOICE_BANKING },
                        })
                      }
                      className="text-[11px] text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1 hover:underline"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset Defaults
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Primary holder's name */}
                    <div className="lg:col-span-2">
                      <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                        Primary holder's name
                      </label>
                      <Input
                        value={formData.paymentDetails?.primaryHolderName || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentDetails: {
                              ...formData.paymentDetails,
                              primaryHolderName: e.target.value,
                              accountName: e.target.value,
                            },
                          })
                        }
                        placeholder="TECHIENUTPAM (OPC) PRIVATE LIMITED"
                        className="text-xs h-9 bg-white font-medium uppercase"
                      />
                    </div>

                    {/* Account Number */}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                        Account Number
                      </label>
                      <Input
                        value={formData.paymentDetails?.accountNumber || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentDetails: {
                              ...formData.paymentDetails,
                              accountNumber: e.target.value,
                            },
                          })
                        }
                        placeholder="5020 0123 8459 51"
                        className="text-xs h-9 bg-white font-mono font-medium"
                      />
                    </div>

                    {/* Account Type */}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                        Account Type
                      </label>
                      <Input
                        value={formData.paymentDetails?.accountType || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentDetails: {
                              ...formData.paymentDetails,
                              accountType: e.target.value,
                            },
                          })
                        }
                        placeholder="Current Account"
                        className="text-xs h-9 bg-white"
                      />
                    </div>

                    {/* Bank */}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                        Bank
                      </label>
                      <Input
                        value={formData.paymentDetails?.bankName || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentDetails: {
                              ...formData.paymentDetails,
                              bankName: e.target.value,
                            },
                          })
                        }
                        placeholder="HDFC Bank"
                        className="text-xs h-9 bg-white"
                      />
                    </div>

                    {/* IFSC */}
                    <div>
                      <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                        IFSC
                      </label>
                      <Input
                        value={formData.paymentDetails?.ifscCode || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentDetails: {
                              ...formData.paymentDetails,
                              ifscCode: e.target.value,
                            },
                          })
                        }
                        placeholder="HDFC0002050"
                        className="text-xs h-9 bg-white font-mono uppercase font-semibold"
                      />
                    </div>

                    {/* Branch */}
                    <div className="lg:col-span-3">
                      <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                        Branch
                      </label>
                      <Input
                        value={formData.paymentDetails?.branch || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentDetails: {
                              ...formData.paymentDetails,
                              branch: e.target.value,
                            },
                          })
                        }
                        placeholder="PALLAVARAM"
                        className="text-xs h-9 bg-white uppercase font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: Add items, quantities, and taxes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    Add items, quantities, and taxes.
                  </h3>
                  <Button
                    type="button"
                    onClick={addItemRow}
                    variant="outline"
                    className="text-xs h-8 px-3 rounded-xl border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add item
                  </Button>
                </div>

                <div className="border border-gray-200 rounded-2xl shadow-2xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-20 text-center">Qty</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 w-28 text-right">Price</th>
                        <th className="py-2.5 px-3 w-28 text-center">Taxes</th>
                        <th className="py-2.5 px-3 w-32 text-right">Subtotal</th>
                        <th className="py-2.5 px-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {formData.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          {/* Qty */}
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="10"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              className="text-xs h-8 text-center bg-white font-mono"
                            />
                          </td>

                          {/* Description */}
                          <td className="py-2 px-3">
                            <Input
                              required
                              placeholder="Item name"
                              value={item.description}
                              onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                              className="text-xs h-8 bg-white"
                            />
                          </td>

                          {/* Price */}
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="00.00"
                              value={item.rate}
                              onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                              className="text-xs h-8 text-right bg-white font-mono"
                            />
                          </td>

                          {/* Taxes */}
                          <td className="py-2 px-3 relative text-center">
                            {!item.tax || parseFloat(item.tax) === 0 ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTaxPopoverIndex(activeTaxPopoverIndex === idx ? null : idx);
                                  setCustomTaxInput('');
                                }}
                                className="w-full max-w-[96px] mx-auto h-8 px-3 rounded-lg border border-[#0f4c5c] text-[#0f4c5c] hover:bg-[#0f4c5c]/10 text-xs font-semibold flex items-center justify-center gap-1 transition-all"
                              >
                                + Add
                              </button>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveTaxPopoverIndex(activeTaxPopoverIndex === idx ? null : idx);
                                    setCustomTaxInput(String(item.tax));
                                  }}
                                  className="h-8 px-2.5 rounded-lg border border-[#0f4c5c] bg-[#0f4c5c]/10 text-[#0f4c5c] hover:bg-[#0f4c5c]/20 text-xs font-bold font-mono transition-all flex items-center gap-1"
                                  title="Click to edit tax"
                                >
                                  {item.tax}%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleItemChange(idx, 'tax', 0);
                                    if (activeTaxPopoverIndex === idx) setActiveTaxPopoverIndex(null);
                                  }}
                                  className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                                  title="Remove tax"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Tax Rate Popover */}
                            {activeTaxPopoverIndex === idx && (
                              <>
                                <div
                                  className="fixed inset-0 z-40 bg-transparent"
                                  onClick={() => setActiveTaxPopoverIndex(null)}
                                />
                                <div className="absolute z-50 left-1/2 -translate-x-1/2 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-gray-200 p-3 text-left animate-in fade-in zoom-in-95 duration-150">
                                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-100">
                                    <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">Select Tax Rate</span>
                                    <button
                                      type="button"
                                      onClick={() => setActiveTaxPopoverIndex(null)}
                                      className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                                    {[5, 12, 18, 28].map((rate) => (
                                      <button
                                        key={rate}
                                        type="button"
                                        onClick={() => {
                                          handleItemChange(idx, 'tax', rate);
                                          setActiveTaxPopoverIndex(null);
                                        }}
                                        className={`py-1.5 px-1 text-center text-xs font-bold rounded-lg border transition-all ${
                                          Number(item.tax) === rate
                                            ? 'border-[#0f4c5c] bg-[#0f4c5c] text-white shadow-xs'
                                            : 'border-gray-200 hover:border-[#0f4c5c] hover:bg-[#0f4c5c]/10 hover:text-[#0f4c5c]'
                                        }`}
                                      >
                                        {rate}%
                                      </button>
                                    ))}
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="any"
                                      placeholder="Custom %"
                                      value={customTaxInput}
                                      onChange={(e) => setCustomTaxInput(e.target.value)}
                                      className="text-xs h-8 px-2 font-mono"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const val = parseFloat(customTaxInput) || 0;
                                        handleItemChange(idx, 'tax', val);
                                        setActiveTaxPopoverIndex(null);
                                      }}
                                      className="px-3 py-1.5 text-xs font-semibold bg-[#0f4c5c] text-white rounded-lg hover:bg-[#0f4c5c]/90 transition-colors shadow-xs"
                                    >
                                      Apply
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </td>

                          {/* Subtotal */}
                          <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                            {symbol}
                            {(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Remove */}
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              className="text-gray-400 hover:text-rose-500 transition-colors p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  onClick={addItemRow}
                  className="w-full border border-[#0f4c5c] text-[#0f4c5c] hover:bg-[#0f4c5c]/5 text-xs h-9 rounded-full font-semibold transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add item
                </button>
              </div>

              {/* SECTION 5: Signature, Extras & Totals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  {/* Signature Section */}
                  <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                        <PenTool className="w-4 h-4 text-indigo-600" /> Signature
                      </h4>
                      <div className="flex items-center gap-1.5">
                        {formData.signature?.data && (
                          <Button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                signature: {
                                  signatureType: 'typed',
                                  signatoryName: '',
                                  data: '',
                                },
                              }));
                              toast.success('Signature removed');
                            }}
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2.5 rounded-lg border-rose-200 text-rose-600 bg-rose-50/50 hover:bg-rose-100 hover:text-rose-700 gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </Button>
                        )}
                        <Button
                          type="button"
                          onClick={() => setShowSignatureModal(true)}
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 px-2.5 rounded-lg border-indigo-200 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100"
                        >
                          {formData.signature?.data ? 'Change signature' : 'Create a signature'}
                        </Button>
                      </div>
                    </div>

                    <div className="relative bg-white p-3 rounded-xl border border-gray-200 min-h-[70px] flex items-center justify-center group">
                      {formData.signature?.data ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                signature: {
                                  signatureType: 'typed',
                                  signatoryName: '',
                                  data: '',
                                },
                              }));
                              toast.success('Signature removed');
                            }}
                            title="Remove signature"
                            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {formData.signature.signatureType === 'typed' ? (
                            <div className="text-center">
                              <p className="font-serif italic text-2xl text-indigo-900 font-bold tracking-wide">
                                {formData.signature.data}
                              </p>
                              <span className="text-[10px] text-gray-400 uppercase tracking-wider block mt-1">
                                {formData.signature.signatoryName || 'Authorized Signatory'}
                              </span>
                            </div>
                          ) : (
                            <div className="text-center">
                              <img
                                src={formData.signature.data}
                                alt="Signature"
                                className="h-12 max-w-full object-contain mx-auto"
                              />
                              <span className="text-[10px] text-gray-400 uppercase tracking-wider block mt-1">
                                {formData.signature.signatoryName || 'Authorized Signatory'}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center text-gray-400 text-xs">
                          <p>No signature created yet.</p>
                          <button
                            type="button"
                            onClick={() => setShowSignatureModal(true)}
                            className="text-indigo-600 font-medium hover:underline text-[11px] mt-0.5"
                          >
                            Click here to create a signature
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Extras: Terms and conditions */}
                  <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Extras
                    </h4>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                        Terms and conditions
                      </label>
                      <textarea
                        rows={3}
                        value={formData.terms}
                        onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                        className="w-full text-xs rounded-xl border border-gray-200 bg-white p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="Enter terms and conditions..."
                      />
                    </div>
                  </div>
                </div>

                {/* Calculation Summary Box */}
                <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100 space-y-3">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-mono font-semibold text-gray-900">
                      {symbol}{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Discount ({symbol}):</span>
                    <div className="w-32">
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={formData.discount}
                        onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                        className="text-xs h-7 text-right bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Taxes:</span>
                    <span className="font-mono text-gray-900 font-semibold">
                      +{symbol}{taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-indigo-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block">
                        Total Amount
                      </span>
                      <span className="text-[10px] text-gray-500">Including all items & taxes</span>
                    </div>
                    <span className="text-2xl font-black text-indigo-700 font-mono">
                      {symbol}{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Currency selector */}
                  <div className="pt-2 border-t border-indigo-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Billing Currency:</span>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="text-xs h-7 rounded-lg border border-gray-200 bg-white px-2 font-medium"
                    >
                      <option value="INR">INR (₹)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600 font-medium">Status:</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="text-xs h-8 rounded-lg border border-gray-200 bg-white px-2.5 font-medium"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </div>

                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        handleDeleteInvoice({
                          _id: editingId,
                          invoiceType: formData.invoiceType,
                          invoiceNumber: formData.invoiceNumber,
                        })
                      }
                      className="text-xs h-8 px-3 rounded-lg border-rose-200 text-rose-600 bg-rose-50/50 hover:bg-rose-100 hover:text-rose-700 gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove Invoice
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="text-xs h-10 px-4 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-10 px-6 rounded-xl font-semibold shadow-sm"
                  >
                    {isSaving
                      ? 'Saving...'
                      : isEditing
                      ? `Update ${formData.invoiceType}`
                      : `Generate & Save ${formData.invoiceType}`}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SIGNATURE CREATION MODAL */}
      {/* ========================================================= */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/70">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <PenTool className="w-4 h-4 text-indigo-600" /> Create a signature
              </h3>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSignatureMode('typed')}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                    signatureMode === 'typed' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" /> Type
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode('drawn')}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                    signatureMode === 'drawn' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" /> Draw
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode('upload')}
                  className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
                    signatureMode === 'upload' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-500'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" /> Upload
                </button>
              </div>

              {signatureMode === 'typed' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Enter Signatory Name
                    </label>
                    <Input
                      value={typedSignName}
                      onChange={(e) => setTypedSignName(e.target.value)}
                      placeholder="e.g. John Doe / Karthik Raja"
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center">
                    <p className="text-xs text-gray-400 mb-1">Signature Preview:</p>
                    <p className="font-serif italic text-3xl text-indigo-900 font-bold tracking-wider">
                      {typedSignName || 'Signature'}
                    </p>
                  </div>
                </div>
              )}

              {signatureMode === 'drawn' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Draw with mouse or fingertip:</span>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-rose-600 hover:underline flex items-center gap-1"
                    >
                      <Eraser className="w-3 h-3" /> Clear
                    </button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={380}
                    height={140}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="border border-gray-300 rounded-xl bg-white w-full cursor-crosshair shadow-inner touch-none"
                  />
                </div>
              )}

              {signatureMode === 'upload' && (
                <div className="space-y-3 text-center py-4 border-2 border-dashed border-gray-200 rounded-2xl">
                  <Upload className="w-8 h-8 text-indigo-500 mx-auto" />
                  <p className="text-xs text-gray-600">Upload signature PNG or JPG with transparent background</p>
                  <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-xl font-medium inline-block shadow-sm">
                    Browse File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSignatureUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSignatureModal(false)}
                  className="text-xs h-8 px-3 rounded-xl"
                >
                  Cancel
                </Button>
                {signatureMode !== 'upload' && (
                  <Button
                    type="button"
                    onClick={handleSaveSignature}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-4 rounded-xl"
                  >
                    Apply Signature
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
  );
}
