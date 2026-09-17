import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, ShieldCheck, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InvoiceDocument from '@/components/InvoiceDocument';

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

const STATUS_COLORS = {
  Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Draft: 'bg-slate-50 text-slate-700 border-slate-200',
  Overdue: 'bg-rose-50 text-rose-700 border-rose-200',
  Cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

export default function ViewInvoicePublic() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInvoice = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/invoices/public/${id}`);
        if (res.ok) {
          const data = await res.json();
          setInvoice(data);
        } else {
          setError('Invoice not found or expired.');
        }
      } catch (err) {
        console.error('Error fetching invoice:', err);
        setError('Failed to connect to server. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchInvoice();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/invoices/${id}/download-pdf`);
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
    } catch (err) {
      console.error('Error downloading invoice PDF:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 font-medium text-sm">Loading invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Invoice Unavailable</h2>
          <p className="text-gray-500 text-xs mt-1 leading-relaxed">
            {error || 'We could not locate this document. Please contact the administrator.'}
          </p>
        </div>
      </div>
    );
  }

  const symbol = CURRENCY_SYMBOLS[invoice.currency] || '₹';
  const isOverdue =
    invoice.status === 'Pending' &&
    invoice.dueDate &&
    new Date(invoice.dueDate) < new Date();
  const effectiveStatus = isOverdue ? 'Overdue' : invoice.status;

  return (
    <div className="min-h-screen bg-slate-100/70 py-8 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Floating Action Bar (Hidden in print) */}
        <div className="print:hidden flex items-center justify-between bg-white px-5 py-3.5 rounded-2xl shadow-sm border border-gray-200/80">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span className="text-xs font-semibold text-gray-700">Verified Client Document</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDownloadPdf}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-4 rounded-xl gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="text-gray-700 hover:bg-gray-50 text-xs h-8 px-3 rounded-xl gap-1.5 border-gray-300 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-gray-500" /> Print
            </Button>
          </div>
        </div>

        {/* Paper Container */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-gray-200/70 overflow-hidden print:border-0 print:shadow-none print:rounded-none">
          <InvoiceDocument invoice={invoice} />
        </div>
      </div>
    </div>
  );
}
