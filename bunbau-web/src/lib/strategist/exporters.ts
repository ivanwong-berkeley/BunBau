/** Downloads and print-to-PDF for the strategy report. Browser only. */

export function downloadText(filename: string, text: string, mime = 'text/markdown;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function reportFilename(version: number, ext: 'md' | 'pdf', date = new Date()): string {
  return `bunbau_yield_strategy_v${version}_${date.toISOString().slice(0, 10)}.${ext}`;
}

const PRINT_CSS = `
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;margin:24px;line-height:1.5;font-size:12px}
  h1,h2,h3,h4{color:#0f172a;margin:14px 0 6px} h1{font-size:20px} h2{font-size:16px;border-bottom:1px solid #e2e8f0;padding-bottom:3px} h3{font-size:14px}
  table{border-collapse:collapse;width:100%;margin:8px 0;font-size:11px} th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:left} th{background:#f1f5f9}
  img{max-width:100%;height:auto;margin:6px 0} ul,ol{padding-left:20px}
  button,[data-noprint]{display:none!important} .no-break{page-break-inside:avoid}
  .disclaimer{margin-top:20px;border-top:1px solid #cbd5e1;padding-top:8px;font-style:italic;color:#475569;font-size:10px}
`;

/** Clones the report DOM (canvases become images), opens a clean window and prints (Save as PDF). */
export function printReport(root: HTMLElement, title: string): boolean {
  const clone = root.cloneNode(true) as HTMLElement;
  const srcCanvases = root.querySelectorAll('canvas');
  clone.querySelectorAll('canvas').forEach((c, i) => {
    try {
      const img = document.createElement('img');
      img.src = (srcCanvases[i] as HTMLCanvasElement).toDataURL('image/png');
      c.replaceWith(img);
    } catch {
      c.remove();
    }
  });
  clone.querySelectorAll('[data-noprint]').forEach((n) => n.remove());
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return false;
  const esc = title.replace(/[<>&]/g, '');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc}</title><style>${PRINT_CSS}</style></head><body>${clone.innerHTML}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
  }, 400);
  return true;
}
