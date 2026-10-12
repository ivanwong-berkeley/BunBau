import fs from 'fs';
const truth = {
  CASH: 100098.97, 'AAPL 310 Put': -103, FBTC: 5864.78, FCNTX: 7397.24, GLDM: 1711.31, 'MSFT 475 Put': -125,
  NVDA: 4382.81, 'NVDA 200 Put': -89, ORCL: 426919.63, SGOV: 77788.16, SLV: 10948, 'SLV 68 Call': -8, T: 2430, 'T 28 Call': -8, UNH: 37190,
};
const data = fs.readFileSync('_ai_archive/samples/media_1791161558615.png').toString('base64');
for (let run = 1; run <= 3; run++) {
  const r = await fetch('http://localhost:3000/api/extract', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ images: [{ mimeType: 'image/png', data }], llmConfig: { model: 'gemini-2.5-flash' } }),
  });
  const j = await r.json();
  if (!j.success) { console.log(run, 'ERR', j.error); continue; }
  const ex = j.extraction;
  const issues = [];
  const got = Object.fromEntries(ex.positions.map(p => [p.symbol, p]));
  for (const [sym, v] of Object.entries(truth)) {
    if (!got[sym]) issues.push(`missing ${sym}`);
    else if (Math.abs(got[sym].value - v) > 0.01) issues.push(`${sym} value ${got[sym].value} != ${v}`);
  }
  for (const s of Object.keys(got)) if (!(s in truth)) issues.push(`extra ${s}`);
  for (const p of ex.positions.filter(p => /Put|Call/.test(p.symbol))) {
    if (!p.metadata?.strikePrice) issues.push(`no strike ${p.symbol}`);
    if (p.quantity === undefined) issues.push(`no qty ${p.symbol}`);
  }
  console.log(`run ${run}: ${ex.institution} ${ex.account} rows=${ex.positions.length} sgov=${got.SGOV?.category} recon=${JSON.stringify(ex.reconciliation)} issues=${issues.length ? issues.join('; ') : 'NONE'}`);
}
