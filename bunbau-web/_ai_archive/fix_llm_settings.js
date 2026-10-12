const fs = require('fs');
let code = fs.readFileSync('src/components/LLMSettingsDrawer.tsx', 'utf8');

// Update useAuth
code = code.replace(
  'const { user, profile } = useAuth();',
  'const { user, profile, updateProfileData } = useAuth();'
);

// Fix initializers
code = code.replace("const [vendor1, setVendor1] = useState('Gemini');", "const [vendor1, setVendor1] = useState(profile?.llmConfig?.tier1?.vendor || 'Gemini');");
code = code.replace("const [vendor2, setVendor2] = useState('Gemini');", "const [vendor2, setVendor2] = useState(profile?.llmConfig?.tier2?.vendor || 'Gemini');");
code = code.replace("const [model1, setModel1] = useState('gemini-2.5-pro');", "const [model1, setModel1] = useState(profile?.llmConfig?.tier1?.model || 'gemini-2.5-pro');");
code = code.replace("const [model2, setModel2] = useState('gemini-2.5-flash');", "const [model2, setModel2] = useState(profile?.llmConfig?.tier2?.model || 'gemini-2.5-flash');");

// Fix handleSave
const oldTry = `    try {
      await updateDoc(doc(db, 'users', user.uid), {
        byokKey: apiKey,
        llmConfig: {
          tier1: { vendor: vendor1, model: model1 },
          tier2: { vendor: vendor2, model: model2 }
        }
      });
      alert('LLM Settings Saved Successfully!');
      onClose();`;

const newTry = `    try {
      await updateProfileData({
        byokKey: apiKey,
        llmConfig: {
          tier1: { vendor: vendor1, model: model1 },
          tier2: { vendor: vendor2, model: model2 }
        }
      });
      alert('LLM Settings Saved Successfully!');
      onClose();`;

code = code.replace(oldTry, newTry);

// Clean up imports
code = code.replace("import { doc, updateDoc } from 'firebase/firestore';\nimport { db } from '../lib/firebase';", '');

fs.writeFileSync('src/components/LLMSettingsDrawer.tsx', code);
console.log('LLMSettingsDrawer updated.');
