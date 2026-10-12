const fs = require('fs');
let code = fs.readFileSync('src/components/UploadValidationModal.tsx', 'utf8');

if (!code.includes('onDeleteData')) {
  code = code.replace(
    'onApprove: (data: any) => void;',
    'onApprove: (data: any) => void;\n  onDeleteData?: () => void;'
  );
  code = code.replace(
    'export function UploadValidationModal({ isOpen, onClose, onApprove }: UploadValidationModalProps) {',
    'export function UploadValidationModal({ isOpen, onClose, onApprove, onDeleteData }: UploadValidationModalProps) {'
  );
}

const oldZone = `<DeleteDangerZone 
          isOpen={showDelete} 
          onClose={() => setShowDelete(false)} 
          type="portfolio" 
        />`;
const newZone = `<DeleteDangerZone 
          isOpen={showDelete} 
          onClose={() => setShowDelete(false)} 
          type="portfolio" 
          onConfirm={() => {
            setShowDelete(false);
            if (onDeleteData) onDeleteData();
          }}
        />`;

code = code.replace(oldZone, newZone);
fs.writeFileSync('src/components/UploadValidationModal.tsx', code);
console.log('UploadValidationModal DeleteDangerZone fixed.');
