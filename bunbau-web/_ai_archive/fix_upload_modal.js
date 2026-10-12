const fs = require('fs');
let code = fs.readFileSync('src/components/UploadValidationModal.tsx', 'utf8');

// Update Interface
code = code.replace('onApprove: () => void;', 'onApprove: (data: any) => void;');

// Add State for idempotency
code = code.replace(
  'const [imageScale, setImageScale] = useState(1);',
  'const [imageScale, setImageScale] = useState(1);\n  const [isImported, setIsImported] = useState(false);'
);

// We should reset `isImported` to false when modal opens
code = code.replace(
  'useEffect(() => {',
  `useEffect(() => {
    if (isOpen) {
      setIsImported(false);
    }
  }, [isOpen]);\n\n  useEffect(() => {`
);

// Update Approve Button
const oldApproveBtn = `<button 
                  onClick={onApprove} 
                  disabled={aiStatus === 'red'}
                  className={\`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition \${
                    aiStatus === 'red' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-primary-mint text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'
                  }\`}
                >
                  <CheckCircle size={18}/> Approve & Import
                </button>`;

const newApproveBtn = `<button 
                  onClick={() => {
                    if (window.confirm("Are you sure you want to import this validated data into your portfolio?")) {
                      setIsImported(true);
                      onApprove(mockExtractedData.positions);
                    }
                  }} 
                  disabled={aiStatus === 'red' || isImported}
                  className={\`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition \${
                    (aiStatus === 'red' || isImported) ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-800 dark:text-gray-500' : 'bg-primary-mint text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'
                  }\`}
                >
                  <CheckCircle size={18}/> {isImported ? '✅ Successfully Imported' : 'Approve & Import'}
                </button>`;

code = code.replace(oldApproveBtn, newApproveBtn);

fs.writeFileSync('src/components/UploadValidationModal.tsx', code);
