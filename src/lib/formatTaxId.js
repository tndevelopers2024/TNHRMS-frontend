/**
 * "GST/UIN: <number>" without the generic "Tax ID" wording.
 * A value that already carries its own GST/UIN text is shown as-is;
 * a custom label (e.g. "VAT") is kept.
 */
export function formatTaxId(label, value) {
  const v = String(value || '').trim();
  if (/gst|uin/i.test(v)) return v;
  const l = String(label || '').trim();
  return `${l && l.toLowerCase() !== 'tax id' ? l : 'GST/UIN'}: ${v}`;
}
