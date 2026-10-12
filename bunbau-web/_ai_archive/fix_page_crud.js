const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

// We need to import Firebase
if (!code.includes("import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';")) {
  code = code.replace(
    "import { useAuth } from '../contexts/AuthContext';",
    "import { useAuth } from '../contexts/AuthContext';\nimport { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';\nimport { db } from '../lib/firebase';"
  );
}

// Add useEffect to fetch portfolio on load
const useEffectStr = `
  useEffect(() => {
    if (user) {
      getDoc(doc(db, 'portfolios', user.uid)).then(docSnap => {
        if (docSnap.exists() && docSnap.data().positions) {
          setRealPortfolio(docSnap.data().positions);
        }
      });
    } else {
      setRealPortfolio([]);
    }
  }, [user]);
`;

code = code.replace(
  'const [realPortfolio, setRealPortfolio] = useState<any[]>([]);',
  `const [realPortfolio, setRealPortfolio] = useState<any[]>([]);\n${useEffectStr}`
);

// Update onApprove callback
const oldOnApprove = `onApprove={(data) => { setRealPortfolio(data);
          alert('Portfolio Updated Successfully!');
          setIsUploaderOpen(false);
        }}`;

const newOnApprove = `onApprove={async (data) => { 
          if (user) {
            await setDoc(doc(db, 'portfolios', user.uid), { positions: data });
          }
          setRealPortfolio(data);
          alert('Portfolio Updated Successfully!');
          setIsUploaderOpen(false);
        }}`;

code = code.replace(oldOnApprove, newOnApprove);

// Update DeleteDangerZone call
const oldDanger = `<DeleteDangerZone 
          isOpen={showDelete} 
          onClose={() => setShowDelete(false)} 
          type="portfolio" 
        />`;

const newDanger = `<DeleteDangerZone 
          isOpen={showDelete} 
          onClose={() => setShowDelete(false)} 
          type="portfolio" 
          onConfirm={async () => {
            if (user) {
              await deleteDoc(doc(db, 'portfolios', user.uid));
            }
            setRealPortfolio([]);
            setShowDelete(false);
            alert('Portfolio successfully wiped.');
          }}
        />`;

code = code.replace(oldDanger, newDanger);

fs.writeFileSync('src/app/page.tsx', code);
console.log('page.tsx CRUD integrated.');
