const fs = require('fs');
let code = fs.readFileSync('src/components/DeleteDangerZone.tsx', 'utf8');

// Add onConfirm to props
code = code.replace(
  "type: 'portfolio' | 'history';",
  "type: 'portfolio' | 'history';\n  onConfirm: () => void;"
);
code = code.replace(
  "export function DeleteDangerZone({ isOpen, onClose, type }: DeleteDangerZoneProps) {",
  "export function DeleteDangerZone({ isOpen, onClose, type, onConfirm }: DeleteDangerZoneProps) {"
);

// Add onClick to Delete Data button
const oldBtn = `<button 
              disabled={!isMatch} 
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Trash2 size={18}/> Delete Data
            </button>`;

const newBtn = `<button 
              disabled={!isMatch} 
              onClick={onConfirm}
              className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Trash2 size={18}/> Delete Data
            </button>`;

code = code.replace(oldBtn, newBtn);
fs.writeFileSync('src/components/DeleteDangerZone.tsx', code);
console.log('DeleteDangerZone wired up.');
