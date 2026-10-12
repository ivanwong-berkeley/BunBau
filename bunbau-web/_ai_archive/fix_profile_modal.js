const fs = require('fs');
let code = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');

// Update useAuth extraction
code = code.replace(
  'const { user, profile } = useAuth();',
  'const { user, profile, updateProfileData } = useAuth();'
);

// Replace Firestore call
const oldTry = `    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        phoneNumber: phone,
      });
      alert('Profile details saved!');
      onClose();`;

const newTry = `    try {
      await updateProfileData({
        displayName,
        phoneNumber: phone,
      });
      alert('Profile details saved!');
      onClose();`;

code = code.replace(oldTry, newTry);

// Remove unused Firestore imports
code = code.replace("import { doc, updateDoc } from 'firebase/firestore';\nimport { db } from '../lib/firebase';", '');

fs.writeFileSync('src/components/ProfileModal.tsx', code);
console.log('ProfileModal updated.');
