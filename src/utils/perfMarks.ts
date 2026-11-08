/**
 * Launch-time marks, printed once to the console (logcat on Android) so slow starts can be measured on a real phone.
 * Times are milliseconds since the WebView started loading the page.
 */
const seen = new Set<string>();

export function perfMark(name: string): void {
  if (seen.has(name) || typeof performance === 'undefined') return;
  seen.add(name);
  // eslint-disable-next-line no-console
  console.info(`[perf] ${name} ${Math.round(performance.now())}ms`);
}
