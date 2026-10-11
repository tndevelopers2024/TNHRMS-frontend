import React from 'react';
import { formatTaxId } from '@/lib/formatTaxId';
import {
  displayInvoiceNumber,
  displayInvoiceTitle,
  cleanCompanyName,
  fullAddress,
  senderRegistrationLines,
} from '@/lib/invoiceNumber';

const CURRENCY_SYMBOLS = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

const money = (value) =>
  (value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

/**
 * Shared Invoice Document Component
 * Used across AdminInvoices Preview Modal and ViewInvoicePublic page
 * to guarantee 100% layout and visual consistency.
 *
 * A4 page: purple header band, content, bank details / notes bottom-left,
 * signature, and a purple band at the very bottom.
 */
export default function InvoiceDocument({ invoice, fit = false }) {
  if (!invoice) return null;

  const symbol = CURRENCY_SYMBOLS[invoice.currency] || '₹';
  const companyName = cleanCompanyName(
    invoice.sender?.name || invoice.sender?.companyName || 'Techie Nutpam'
  );
  const pDetails = invoice.paymentDetails;
  const showBank =
    ['Tax Invoice', 'Proforma Invoice'].includes(invoice.invoiceType) && pDetails;

  return (
    <div
      id="printable-invoice"
      className={`bg-white print:p-0 print:max-h-none print:overflow-visible ${
        fit ? 'p-3' : 'p-3 max-h-[85vh] overflow-y-auto custom-scrollbar'
      }`}
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
    >
      {/* A4 page: bold outer border, fine inner border */}
      <div className="border-2 border-indigo-900 p-1 flex flex-col" style={{ aspectRatio: '210 / 297' }}>
        <div className="relative flex-1 flex flex-col border border-purple-200 bg-white">
          {/* ===== Header band ===== */}
          <div className="shrink-0 bg-gradient-to-r from-indigo-900 via-purple-800 to-purple-600 text-white px-7 py-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="min-w-0 sm:max-w-[62%]">
              {invoice.sender?.logoUrl ? (
                <div className="inline-block bg-white rounded-xl px-3 py-2 mb-3">
                  <img
                    src={invoice.sender.logoUrl}
                    alt="Logo"
                    className="h-9 w-auto object-contain block"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              ) : null}
              <h2 className="text-lg font-black tracking-tight">{companyName}</h2>
              <div className="text-xs text-purple-100 mt-2 space-y-0.5">
                {fullAddress(invoice.sender) && <p>{fullAddress(invoice.sender)}</p>}
                {invoice.sender?.taxId && (
                  <p className="font-mono">{formatTaxId(invoice.sender.taxIdLabel, invoice.sender.taxId)}</p>
                )}
                {senderRegistrationLines(invoice.sender).map((line) => (
                  <p key={line} className="font-mono">{line}</p>
                ))}
                {invoice.sender?.email && <p>Email: {invoice.sender.email}</p>}
                {invoice.sender?.phone && <p>Phone: {invoice.sender.phone}</p>}
              </div>
            </div>

            <div className="sm:text-right shrink-0 whitespace-nowrap">
              <span className="text-2xl font-black tracking-wider block uppercase">
                {displayInvoiceTitle(invoice)}
              </span>
              <div className="font-mono font-bold text-purple-100 text-sm mt-1">
                #{displayInvoiceNumber(invoice)}
              </div>
              {invoice.orderNumber && (
                <div className="font-mono text-xs text-purple-100 mt-0.5">
                  Order No: {invoice.orderNumber}
                </div>
              )}

              <div className="mt-3 text-xs text-purple-100 space-y-1">
                <div>
                  Date:{' '}
                  <span className="font-semibold text-white">
                    {invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString('en-GB') : '-'}
                  </span>
                </div>
                {invoice.dueDate && (
                  <div>
                    Due date:{' '}
                    <span className="font-semibold text-white">
                      {new Date(invoice.dueDate).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===== Body ===== */}
          <div className="relative flex-1 flex flex-col px-7 pt-5 pb-3">
            <div className="relative flex-1 space-y-4">
              {/* Recipient Details */}
              <div className="bg-purple-50 border border-purple-100 border-l-4 border-l-purple-600 p-4 rounded-xl">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block mb-1.5">
                  Recipient details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{invoice.client?.name || '-'}</h3>
                    {invoice.client?.taxId && (
                      <p className="font-mono text-gray-600 mt-0.5">
                        {formatTaxId(invoice.client.taxIdLabel, invoice.client.taxId)}
                      </p>
                    )}
                    {invoice.client?.pan && (
                      <p className="font-mono text-gray-600 mt-0.5">PAN: {invoice.client.pan}</p>
                    )}
                    {invoice.client?.address && (
                      <p className="text-gray-500 mt-1 leading-relaxed">
                        {fullAddress(invoice.client)}
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
              <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-purple-800 text-white text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3 rounded-l-lg">Description</th>
                    <th className="py-2.5 px-2 w-12 text-center">Qty</th>
                    <th className="py-2.5 px-2 text-right">Price ({symbol})</th>
                    <th className="py-2.5 px-2 text-center">Taxes</th>
                    <th className="py-2.5 px-3 text-right rounded-r-lg">Subtotal ({symbol})</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {invoice.items?.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-purple-50' : 'bg-white'}>
                      <td className="py-2.5 px-3 text-gray-800 border-b border-purple-100 align-top">
                        {/* First line is the item title; any further lines are its details */}
                        {String(item.description || '')
                          .split('\n')
                          .map((line, i) => (
                            <div key={i} className={i === 0 ? 'font-medium' : 'text-gray-500 mt-0.5 leading-snug'}>
                              {line}
                            </div>
                          ))}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-gray-700 border-b border-purple-100 align-top">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-gray-600 border-b border-purple-100 align-top">
                        {money(item.rate)}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-gray-500 border-b border-purple-100 align-top">
                        {item.tax ? `${item.tax}%` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900 border-b border-purple-100 align-top">
                        {money(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Summary (right) */}
              <div className="flex justify-end pt-1">
                <div className="space-y-1.5 text-xs w-full sm:w-1/2">
                  <div className="flex justify-between py-1 border-b border-purple-100 text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-mono font-medium text-gray-900">
                      {symbol}
                      {money(invoice.subtotal)}
                    </span>
                  </div>

                  {invoice.discount > 0 && (
                    <div className="flex justify-between py-1 border-b border-purple-100 text-emerald-600">
                      <span>Discount</span>
                      <span className="font-mono font-medium">
                        -{symbol}
                        {money(invoice.discount)}
                      </span>
                    </div>
                  )}

                  {invoice.taxAmount > 0 && (
                    <div className="flex justify-between py-1 border-b border-purple-100 text-gray-600">
                      <span>Taxes</span>
                      <span className="font-mono font-medium text-gray-900">
                        +{symbol}
                        {money(invoice.taxAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center px-3 py-2.5 rounded-lg bg-gradient-to-r from-indigo-900 to-purple-700 text-white text-sm font-black">
                    <span>Total Amount</span>
                    <span className="font-mono text-lg">
                      {symbol}
                      {money(invoice.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank details + terms / extra notes: bottom-left of the page, above the footer */}
            <div className="relative mt-4 sm:w-3/5 space-y-3">
              {/* Bank details: shown on Proforma (what the client pays against) and Tax Invoice */}
              {showBank && (
                <div className="p-4 rounded-xl border border-purple-200 bg-purple-50 text-xs">
                  <span className="font-bold text-purple-800 uppercase tracking-wider text-[11px] block mb-2">
                    Bank Details
                  </span>
                  <div className="space-y-1.5 text-gray-700 font-sans">
                    {pDetails.primaryHolderName && (
                      <p className="whitespace-nowrap">
                        <span className="text-gray-400">Primary holder's name: </span>
                        <strong className="text-gray-900 uppercase font-semibold">
                          {cleanCompanyName(pDetails.primaryHolderName)}
                        </strong>
                      </p>
                    )}
                    {pDetails.accountNumber && (
                      <p className="font-mono">
                        <span className="text-gray-400 font-sans">Account Number: </span>
                        <strong className="text-indigo-900 font-bold tracking-wider">
                          {pDetails.accountNumber}
                        </strong>
                      </p>
                    )}
                    {pDetails.accountType && (
                      <p>
                        <span className="text-gray-400">Account Type: </span>
                        <span className="text-gray-800 font-medium">{pDetails.accountType}</span>
                      </p>
                    )}
                    {pDetails.bankName && (
                      <p>
                        <span className="text-gray-400">Bank: </span>
                        <span className="text-gray-800 font-medium">{pDetails.bankName}</span>
                      </p>
                    )}
                    {pDetails.ifscCode && (
                      <p className="font-mono">
                        <span className="text-gray-400 font-sans">IFSC: </span>
                        <strong className="text-gray-900 font-semibold uppercase">
                          {pDetails.ifscCode}
                        </strong>
                      </p>
                    )}
                    {pDetails.branch && (
                      <p>
                        <span className="text-gray-400">Branch: </span>
                        <span className="text-gray-800 font-medium uppercase">{pDetails.branch}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {invoice.extraFields &&
                invoice.extraFields.map((field, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-purple-100 bg-white text-xs">
                    <span className="font-bold text-purple-800 uppercase tracking-wider text-[10px] block mb-1">
                      {field.label}
                    </span>
                    <p className="text-gray-500 leading-relaxed text-[11px] whitespace-pre-wrap">
                      {field.value}
                    </p>
                  </div>
                ))}
            </div>

            {/* Signature: always at the bottom of the page, above the band */}
            <div className="relative mt-4 pt-3 border-t border-purple-100 flex items-end justify-end">
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
                    {companyName}
                  </div>
                )}
                <div className="w-40 border-t border-gray-300 ml-auto"></div>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest block mt-1">
                  {invoice.signature?.signatoryName || 'Authorized Signature'}
                </span>
              </div>
            </div>
            {/* Logo watermark: faint, centered, drawn ABOVE the content so cards and notes never hide it */}
            <div
              aria-hidden="true"
              className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none select-none overflow-hidden"
            >
              <img
                src={invoice.sender?.logoUrl || '/logo.png'}
                alt=""
                style={{ opacity: 0.06 }}
                className="w-3/5 max-w-[420px] object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>

          {/* ===== Bottom band ===== */}
          <div className="shrink-0 bg-gradient-to-r from-indigo-900 via-purple-800 to-purple-600 text-purple-100 px-7 py-2 text-[10px] flex items-center justify-between gap-4">
            <span>This document was electronically generated and is valid without physical seal.</span>
            <span className="hidden sm:inline text-right">
              {[invoice.sender?.website, invoice.sender?.email].filter(Boolean).join('  |  ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
