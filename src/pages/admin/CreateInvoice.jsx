import { useState, useEffect, useRef } from 'react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Receipt,
  Building2,
  User,
  CreditCard,
  Upload,
  PenTool,
  Eraser,
  Type,
  Check,
  RotateCcw,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

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
  invoiceTitle: 'INVOICE',
  invoiceNumber: '',
  customInvoiceNumber: '',
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
    taxIdLabel: 'Tax ID',
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
  extraFields: [],
  notes: '',
};

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export default function CreateInvoice() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState(initialInvoiceState);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  const [activeTaxPopoverIndex, setActiveTaxPopoverIndex] = useState(null);
  const [customTaxInput, setCustomTaxInput] = useState('');

  // Signature modal state
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureMode, setSignatureMode] = useState('typed');
  const [typedSignName, setTypedSignName] = useState('');
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

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

  useEffect(() => {
    const initializeForm = async () => {
      if (isEditing) {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/invoices`);
          if (res.ok) {
            const data = await res.json();
            const invoice = data.invoices?.find(inv => inv._id === id);
            if (invoice) {
              setFormData({
                invoiceType: invoice.invoiceType || 'Invoice',
                invoiceTitle: invoice.invoiceTitle || (invoice.invoiceType || 'Invoice').toUpperCase(),
                invoiceNumber: invoice.invoiceNumber,
                customInvoiceNumber: invoice.customInvoiceNumber || '',
                orderNumber: invoice.orderNumber || '',
                currency: invoice.currency || 'INR',
                issueDate: invoice.issueDate ? invoice.issueDate.split('T')[0] : '',
                dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : '',
                status: invoice.status || 'Pending',
                client: {
                  name: invoice.client?.name || '',
                  companyName: invoice.client?.companyName || '',
                  taxId: invoice.client?.taxId || invoice.client?.gstin || '',
                  taxIdLabel: invoice.client?.taxIdLabel || 'Tax ID',
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
                extraFields: invoice.extraFields?.length 
                  ? invoice.extraFields 
                  : invoice.terms ? [{ label: 'Terms and conditions', value: invoice.terms }] : [{ label: 'Terms and conditions', value: '' }],
                notes: invoice.notes || '',
              });
            } else {
              toast.error('Invoice not found');
              navigate('/admin/invoices');
            }
          }
        } catch (err) {
          console.error(err);
          toast.error('Failed to load invoice');
        } finally {
          setLoading(false);
        }
      } else {
        const initialType = searchParams.get('type') || 'Invoice';
        const bankDetails = initialType === 'Tax Invoice' ? { ...DEFAULT_TAX_INVOICE_BANKING } : { ...EMPTY_BANKING };
        const nextNumber = await fetchNextInvoiceNumber(initialType);
        
        let defaultSender = { ...initialInvoiceState.sender };
        try {
          const settingsRes = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/settings/company`);
          if (settingsRes.ok) {
            const data = await settingsRes.json();
            if (data) {
              defaultSender = {
                name: data.companyName || '',
                companyName: data.companyName || '',
                taxId: data.taxId || '',
                taxIdLabel: data.taxIdLabel || 'Tax ID',
                address: data.address || '',
                postalCode: data.postalCode || '',
                email: data.email || '',
                phone: data.phone || '',
                logoUrl: data.logoUrl || '/logo.png',
                website: '',
              };
              if (data.paymentDetails) {
                // Update DEFAULT_TAX_INVOICE_BANKING in memory so type switching uses it
                Object.assign(DEFAULT_TAX_INVOICE_BANKING, data.paymentDetails);
                if (initialType === 'Tax Invoice') {
                  Object.assign(bankDetails, data.paymentDetails);
                }
              }
            }
          }
        } catch (err) {
          console.error('Error fetching default company settings:', err);
        }

        setFormData({
          ...initialInvoiceState,
          invoiceType: initialType,
          invoiceTitle: initialType.toUpperCase(),
          invoiceNumber: nextNumber,
          paymentDetails: bankDetails,
          sender: defaultSender,
        });
      }
    };
    
    initializeForm();
  }, [isEditing, id, searchParams]);

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
      invoiceTitle: newType.toUpperCase(),
      invoiceNumber: nextNum,
      paymentDetails: bankDetails,
    }));
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
        ? `${import.meta.env.VITE_API_URL}/api/admin/invoices/${id}`
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
        navigate('/admin/invoices');
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

  const symbol = CURRENCY_SYMBOLS[formData.currency] || '₹';

  if (loading) {
    return (
      <div className="py-20 text-center text-gray-400 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => navigate('/admin/invoices')}
              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-2 bg-indigo-600/10 text-indigo-600 rounded-xl">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                  {isEditing ? `Edit ${formData.invoiceType}` : `Create ${formData.invoiceType}`}
                </h1>
                {formData.invoiceNumber !== undefined && (
                  <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {formData.invoiceNumber}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Specify the document details, its issuer, and its recipient.
              </p>
            </div>
          </div>
        </div>

        {/* Document Type Selector Tabs */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 p-1 bg-white border border-gray-200 shadow-sm rounded-2xl w-fit">
            {['Invoice', 'Tax Invoice', 'Proforma Invoice'].map((type, idx) => (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeChange(type)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  formData.invoiceType === type
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100'
                    : 'text-gray-600 hover:text-gray-900 border border-transparent'
                }`}
              >
                <span>{idx + 1}. {type}</span>
                {formData.invoiceType === type && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </button>
            ))}
          </div>

        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Form Body */}
        <form onSubmit={handleSubmitInvoice} className="p-6 space-y-6">
          
          {/* SECTION 1: General Information (Date, Due date) */}
          <div className="space-y-3">
            <div className="border-b border-gray-100 pb-2">
              <h3 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                General Information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Custom Invoice Number */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Invoice Number
                </label>
                <Input
                  type="text"
                  value={formData.customInvoiceNumber || ''}
                  onChange={(e) => setFormData({ ...formData, customInvoiceNumber: e.target.value })}
                  placeholder={formData.invoiceNumber || "Invoice #"}
                  className="text-xs h-9 bg-white"
                />
              </div>

              {/* Invoice Title */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Invoice Title
                </label>
                <Input
                  type="text"
                  value={formData.invoiceTitle}
                  onChange={(e) => setFormData({ ...formData, invoiceTitle: e.target.value.toUpperCase() })}
                  placeholder="e.g. TAX INVOICE"
                  className="text-xs h-9 bg-white uppercase"
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Date
                </label>
                <div className="relative">
                  <DatePicker
                    selected={formData.issueDate ? new Date(formData.issueDate) : null}
                    onChange={(date) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        setFormData({ ...formData, issueDate: `${year}-${month}-${day}` });
                      } else {
                        setFormData({ ...formData, issueDate: '' });
                      }
                    }}
                    dateFormat="dd/MM/yyyy"
                    className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 h-9"
                    placeholderText="DD/MM/YYYY"
                    required
                  />
                </div>
              </div>

              {/* Due date */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Due date
                </label>
                <div className="relative">
                  <DatePicker
                    selected={formData.dueDate ? new Date(formData.dueDate) : null}
                    onChange={(date) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        setFormData({ ...formData, dueDate: `${year}-${month}-${day}` });
                      } else {
                        setFormData({ ...formData, dueDate: '' });
                      }
                    }}
                    dateFormat="dd/MM/yyyy"
                    className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 h-9"
                    placeholderText="DD/MM/YYYY"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Recipient details */}
          <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/20 space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
              <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-600" /> Recipient details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <input
                  type="text"
                  value={formData.client.taxIdLabel}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      client: { ...formData.client, taxIdLabel: e.target.value },
                    })
                  }
                  className="text-xs font-semibold text-gray-700 block mb-1 border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-colors w-full max-w-[150px]"
                  placeholder="e.g. GSTIN, VAT"
                />
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
              <div className="md:col-span-2">
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

              {/* Email */}
              <div className="md:col-span-2">
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
                    <th className="py-2.5 px-3 w-20 text-center rounded-tl-2xl">Qty</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 w-28 text-right">Price</th>
                    <th className="py-2.5 px-3 w-28 text-center">Taxes</th>
                    <th className="py-2.5 px-3 w-32 text-right">Subtotal</th>
                    <th className="py-2.5 px-2 w-10 rounded-tr-2xl"></th>
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
                {formData.extraFields.map((field, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-gray-200 p-3">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <Input
                        value={field.label}
                        onChange={(e) => {
                          const newFields = [...formData.extraFields];
                          newFields[idx].label = e.target.value;
                          setFormData({ ...formData, extraFields: newFields });
                        }}
                        placeholder="Field Title (e.g. Terms and conditions)"
                        className="text-xs font-semibold h-7 border-none bg-transparent px-1 shadow-none focus-visible:ring-0 placeholder:font-normal"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newFields = formData.extraFields.filter((_, i) => i !== idx);
                          setFormData({ ...formData, extraFields: newFields });
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={field.value}
                      onChange={(e) => {
                        const newFields = [...formData.extraFields];
                        newFields[idx].value = e.target.value;
                        setFormData({ ...formData, extraFields: newFields });
                      }}
                      className="w-full text-xs bg-gray-50/50 rounded-lg border border-gray-100 p-2.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-y min-h-[60px]"
                      placeholder="Enter details here..."
                    />
                  </div>
                ))}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      extraFields: [...formData.extraFields, { label: '', value: '' }]
                    });
                  }}
                  className="w-full text-xs h-8 border-dashed border-gray-300 text-gray-600 hover:bg-gray-100"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Extra Field
                </Button>
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

          {/* Form Actions */}
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
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/invoices')}
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

      {/* SIGNATURE CREATION MODAL */}
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
    </div>
  );
}
