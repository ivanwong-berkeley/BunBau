const call = async (apiKey) => {
  const r = await fetch('http://localhost:3000/api/llm/validate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vendor: 'Gemini', apiKey }),
  });
  const j = await r.json();
  console.log(r.status, JSON.stringify(j).slice(0, 300));
};
await call(process.env.GEMINI_API_KEY || '');
await call('bogus-key-123456789012345');
const r = await fetch('http://localhost:3000/api/extract', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ images: [] , llmConfig: {} }),
});
console.log('extract empty', r.status, JSON.stringify(await r.json()));
