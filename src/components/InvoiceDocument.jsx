import React from 'react';

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/**
 * Shared Invoice Document Component
 * Used across AdminInvoices Preview Modal and ViewInvoicePublic page
 * to guarantee 100% layout and visual consistency.
 */
export default function InvoiceDocument({ invoice }) {
  if (!invoice) return null;

  const symbol = CURRENCY_SYMBOLS[invoice.currency] || '₹';

  return (
    <div
      id="printable-invoice"
      className="p-8 sm:p-10 space-y-8 bg-white max-h-[80vh] overflow-y-auto custom-scrollbar print:p-4 print:max-h-none print:overflow-visible"
    >
      {/* Header: Brand & Document Title */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          {invoice.sender?.logoUrl ? (
            <div className="mb-2.5">
              <img
                src={invoice.sender.logoUrl}
                alt="Logo"
                className="h-12 w-auto object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          ) : null}
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-900">
              {invoice.sender?.name || invoice.sender?.companyName || 'Techie Nutpam'}
            </h2>
            {invoice.sender?.website && (
              <p className="text-xs text-indigo-600 font-semibold tracking-wide mt-0.5">
                {invoice.sender.website}
              </p>
            )}
          </div>

          <div className="text-xs text-gray-500 mt-2.5 space-y-0.5">
            {invoice.sender?.taxId && (
              <p className="font-mono">
                <span className="text-gray-400">Tax ID: </span>
                {invoice.sender.taxId}
              </p>
            )}
            {invoice.sender?.address && (
              <p>
                {invoice.sender.address}
                {invoice.sender?.postalCode ? ` - ${invoice.sender.postalCode}` : ''}
              </p>
            )}
            {invoice.sender?.email && <p>Email: {invoice.sender.email}</p>}
            {invoice.sender?.phone && <p>Phone: {invoice.sender.phone}</p>}
          </div>
        </div>

        <div className="sm:text-right">
          <span className="text-2xl sm:text-3xl font-black text-gray-900 tracking-wider block uppercase">
            {invoice.invoiceType || 'INVOICE'}
          </span>
          <div className="font-mono font-bold text-indigo-600 text-sm mt-1">
            #{invoice.invoiceNumber}
          </div>
          {invoice.orderNumber && (
            <div className="font-mono text-xs text-gray-600 mt-0.5">
              Order No: {invoice.orderNumber}
            </div>
          )}

          <div className="mt-3 text-xs text-gray-500 space-y-1">
            <div>
              <span className="text-gray-400">Date: </span>
              <span className="font-medium text-gray-800">
                {invoice.issueDate
                  ? new Date(invoice.issueDate).toLocaleDateString('en-GB')
                  : '-'}
              </span>
            </div>
            {invoice.dueDate && (
              <div>
                <span className="text-gray-400">Due date: </span>
                <span className="font-medium text-gray-800">
                  {new Date(invoice.dueDate).toLocaleDateString('en-GB')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recipient Details */}
      <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-100">
        <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mb-2">
          Recipient details
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              {invoice.client?.name || '-'}
            </h3>
            {invoice.client?.taxId && (
              <p className="font-mono text-gray-600 mt-0.5">
                <span className="text-gray-400">Tax ID: </span>
                {invoice.client.taxId}
              </p>
            )}
            {invoice.client?.address && (
              <p className="text-gray-500 mt-1 leading-relaxed">
                {invoice.client.address}
                {invoice.client?.postalCode ? ` - ${invoice.client.postalCode}` : ''}
              </p>
            )}
          </div>
          <div className="sm:text-right space-y-1 text-gray-600">
            {invoice.client?.email && (
              <p>
                <span className="text-gray-400">Email: </span>
                {invoice.client.email}
              </p>
            )}
            {invoice.client?.phone && (
              <p>
                <span className="text-gray-400">Phone: </span>
                {invoice.client.phone}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              <th className="py-3 px-2 w-12 text-center">Qty</th>
              <th className="py-3 px-2">Description</th>
              <th className="py-3 px-2 text-right">Price ({symbol})</th>
              <th className="py-3 px-2 text-center">Taxes</th>
              <th className="py-3 px-2 text-right">Subtotal ({symbol})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {invoice.items?.map((item, idx) => (
              <tr key={idx}>
                <td className="py-3.5 px-2 text-center font-mono text-gray-700">
                  {item.quantity}
                </td>
                <td className="py-3.5 px-2 font-medium text-gray-800">
                  {item.description}
                </td>
                <td className="py-3.5 px-2 text-right font-mono text-gray-600">
                  {(item.rate || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="py-3.5 px-2 text-center font-mono text-gray-500">
                  {item.tax ? `${item.tax}%` : '-'}
                </td>
                <td className="py-3.5 px-2 text-right font-mono font-bold text-gray-900">
                  {(item.amount || 0).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bank Details & Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
        <div className="space-y-3">
          {/* Bank Details displayed ONLY in Tax Invoice */}
          {invoice.invoiceType === 'Tax Invoice' && (
            <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/40 text-xs">
              <span className="font-bold text-purple-900 uppercase tracking-wider text-[11px] block mb-2">
                Bank Details
              </span>
              <div className="space-y-1.5 text-gray-700 font-sans">
                {invoice.paymentDetails?.primaryHolderName && (
                  <p>
                    <span className="text-gray-400 block sm:inline">
                      Primary holder's name:{' '}
                    </span>
                    <strong className="text-gray-900 uppercase font-semibold">
                      {invoice.paymentDetails.primaryHolderName}
                    </strong>
                  </p>
                )}
                {invoice.paymentDetails?.accountNumber && (
                  <p className="font-mono">
                    <span className="text-gray-400 font-sans">Account Number: </span>
                    <strong className="text-indigo-900 font-bold tracking-wider">
                      {invoice.paymentDetails.accountNumber}
                    </strong>
                  </p>
                )}
                {invoice.paymentDetails?.accountType && (
                  <p>
                    <span className="text-gray-400">Account Type: </span>
                    <span className="text-gray-800 font-medium">
                      {invoice.paymentDetails.accountType}
                    </span>
                  </p>
                )}
                {invoice.paymentDetails?.bankName && (
                  <p>
                    <span className="text-gray-400">Bank: </span>
                    <span className="text-gray-800 font-medium">
                      {invoice.paymentDetails.bankName}
                    </span>
                  </p>
                )}
                {invoice.paymentDetails?.ifscCode && (
                  <p className="font-mono">
                    <span className="text-gray-400 font-sans">IFSC: </span>
                    <strong className="text-gray-900 font-semibold uppercase">
                      {invoice.paymentDetails.ifscCode}
                    </strong>
                  </p>
                )}
                {invoice.paymentDetails?.branch && (
                  <p>
                    <span className="text-gray-400">Branch: </span>
                    <span className="text-gray-800 font-medium uppercase">
                      {invoice.paymentDetails.branch}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {invoice.terms && (
            <div className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 text-xs">
              <span className="font-bold text-gray-700 uppercase tracking-wider text-[10px] block mb-1">
                Terms and conditions
              </span>
              <p className="text-gray-500 leading-relaxed text-[11px]">
                {invoice.terms}
              </p>
            </div>
          )}
        </div>

        {/* Financial Summary */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
            <span>Subtotal</span>
            <span className="font-mono font-medium text-gray-900">
              {symbol}
              {(invoice.subtotal || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>

          {invoice.discount > 0 && (
            <div className="flex justify-between py-1 border-b border-gray-100 text-emerald-600">
              <span>Discount</span>
              <span className="font-mono font-medium">
                -{symbol}
                {(invoice.discount || 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          )}

          {invoice.taxAmount > 0 && (
            <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
              <span>Taxes</span>
              <span className="font-mono font-medium text-gray-900">
                +{symbol}
                {(invoice.taxAmount || 0).toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          )}

          <div className="flex justify-between py-3 border-t-2 border-gray-900 text-base font-black text-gray-900">
            <span>Total Amount</span>
            <span className="font-mono text-indigo-700 text-xl">
              {symbol}
              {(invoice.totalAmount || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Signature Display in Document Footer */}
      <div className="pt-6 border-t border-gray-100 flex items-end justify-between">
        <p className="text-[10px] text-gray-400">
          This document was electronically generated and is valid without physical seal.
        </p>

        <div className="text-center sm:text-right">
          {invoice.signature?.data ? (
            invoice.signature.signatureType === 'typed' ? (
              <div className="font-serif italic text-2xl text-indigo-900 font-bold mb-1">
                {invoice.signature.data}
              </div>
            ) : (
              <img
                src={invoice.signature.data}
                alt="Signature"
                className="h-12 max-w-[150px] object-contain ml-auto mb-1"
              />
            )
          ) : (
            <div className="font-serif italic text-sm text-gray-500 font-bold mb-2">
              {invoice.sender?.name || ''}
            </div>
          )}
          <div className="w-40 border-t border-gray-300 ml-auto"></div>
          <span className="text-[10px] text-gray-400 uppercase tracking-widest block mt-1">
            {invoice.signature?.signatoryName || 'Authorized Signature'}
          </span>
        </div>
      </div>
    </div>
  );
}
