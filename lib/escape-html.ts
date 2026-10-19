// Escapes a value for interpolation into an HTML email body. Use it on
// anything a customer typed (names, firm names, emails); the operator-alert
// lines are themselves HTML, so escaping has to happen at the call site.
export function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
