const fs = require('fs');
let code = fs.readFileSync('src/components/UploadValidationModal.tsx', 'utf8');

const oldBtn = `<button 
                  onClick={onApprove} 
                  disabled={aiStatus === 'red' || images.length === 0}
                  className="px-8 py-3 bg-primary-mint text-white rounded-xl font-bold hover:bg-emerald-600 transition disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle size={18}/> Approve & Import
                </button>`;

const newBtn = `<button 
                  onClick={() => {
                    if (window.confirm("Are you sure you want to import this validated data into your portfolio?")) {
                      setIsImported(true);
                      onApprove(mockExtractedData.positions);
                    }
                  }} 
                  disabled={aiStatus === 'red' || images.length === 0 || isImported}
                  className={\`px-8 py-3 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center gap-2 \${isImported ? 'bg-slate-400 dark:bg-slate-700' : 'bg-primary-mint hover:bg-emerald-600'}\`}
                >
                  <CheckCircle size={18}/> {isImported ? '✅ Successfully Imported' : 'Approve & Import'}
                </button>`;

code = code.replace(oldBtn, newBtn);

fs.writeFileSync('src/components/UploadValidationModal.tsx', code);
console.log('UploadValidationModal Approve logic updated.');
