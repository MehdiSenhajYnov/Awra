// Shortcuts are bound to physical keys (KeyboardEvent.code) so they sit in the same place on
// AZERTY and QWERTY; labels show what the player's layout prints on that key when the browser knows.
const labels = new Map<string, string>();

export async function loadKeyLabels(): Promise<void> {
  const kb = (navigator as Navigator & { keyboard?: { getLayoutMap(): Promise<Map<string, string>> } }).keyboard;
  if (!kb?.getLayoutMap) return;
  try {
    const map = await kb.getLayoutMap();
    for (const [code, key] of map) labels.set(code, key.toUpperCase());
  } catch {
    /* layout map not available */
  }
}

export function keyLabel(code: string): string {
  if (labels.has(code)) return labels.get(code)!;
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}
