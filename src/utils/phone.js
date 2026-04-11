/** Strip non-digits, cap at 10 (for controlled inputs). */
export function digitsOnlyMax10(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 10);
}

/** API payload: empty → null, else positive integer ≤ 10 digits. */
export function phoneToApi(value) {
  const d = digitsOnlyMax10(value);
  if (d === '') return null;
  return Number(d);
}

/** Show existing phone (number or string from API) in an input. */
export function phoneFieldValue(v) {
  if (v == null || v === '') return '';
  return digitsOnlyMax10(v);
}
