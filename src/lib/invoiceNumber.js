// How an invoice's number and title read on screen.
// A Tax Invoice is presented as "INVOICE" numbered "#0003" (no "TAX-2026-" prefix).
export function displayInvoiceNumber(invoice) {
  const custom = String(invoice?.customInvoiceNumber || '').trim();
  if (custom) return custom;
  const stored = String(invoice?.invoiceNumber || '');
  if (invoice?.invoiceType === 'Tax Invoice') {
    const m = stored.match(/(\d+)$/);
    return m ? m[1].padStart(4, '0') : stored;
  }
  return stored;
}

export function displayInvoiceTitle(invoice) {
  const isTax = invoice?.invoiceType === 'Tax Invoice';
  const title = String(invoice?.invoiceTitle || '').trim();
  // The forms save the type name as the default title, so "TAX INVOICE" is not a custom title
  if (isTax && (!title || title.toUpperCase() === 'TAX INVOICE')) return 'Invoice';
  return title || invoice?.invoiceType || 'Invoice';
}

// "TechieNutpam OPC Private Limited" / "(OPC)" -> "TechieNutpam Private Limited".
// Older invoices and settings still carry the OPC wording, so it is removed when printing.
export function cleanCompanyName(name) {
  return String(name || '')
    .replace(/\s*\(?\bOPC\b\)?\s*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Address with its PIN code. The PIN is added only when the address doesn't already carry one,
// so "Chennai - 600041" never becomes "Chennai - 600041 - 600042".
export function fullAddress(party) {
  const address = String(party?.address || '').trim();
  if (!address) return '';
  const pin = String(party?.postalCode || '').trim();
  return pin && !/\b\d{6}\b/.test(address) ? `${address} - ${pin}` : address;
}

// Optional company lines printed under the GSTIN: PAN, then state name and code
export function senderRegistrationLines(sender) {
  const lines = [];
  if (sender?.pan) lines.push(`PAN/IT No : ${sender.pan}`);
  if (sender?.stateName || sender?.stateCode) {
    lines.push(`State Name : ${sender.stateName || ''}${sender.stateCode ? `, Code : ${sender.stateCode}` : ''}`);
  }
  return lines;
}
