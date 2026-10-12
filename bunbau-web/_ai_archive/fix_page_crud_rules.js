const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf8');

const oldModal = `<UploadValidationModal 
        isOpen={isUploaderOpen} 
        onClose={() => setIsUploaderOpen(false)} 
        onApprove={async (data) => { 
          if (user) {
            await setDoc(doc(db, 'portfolios', user.uid), { positions: data });
          }
          setRealPortfolio(data);
          alert('Portfolio Updated Successfully!');
          setIsUploaderOpen(false);
        }}
        onDeleteData={async () => {
          if (user) {
            await deleteDoc(doc(db, 'portfolios', user.uid));
          }
          setRealPortfolio([]);
          alert('Portfolio successfully wiped.');
          setIsUploaderOpen(false);
        }}
      />`;

const newModal = `<UploadValidationModal 
        isOpen={isUploaderOpen} 
        onClose={() => setIsUploaderOpen(false)} 
        onApprove={async (data) => { 
          if (user) {
            try {
              await setDoc(doc(db, 'portfolios', user.uid), { positions: data });
              setRealPortfolio(data);
              alert('Portfolio Updated Successfully!');
              setIsUploaderOpen(false);
            } catch (error: any) {
              console.error(error);
              if (error.code === 'permission-denied') {
                alert('Firebase Permissions Error: Please update your Firestore Security Rules in the Firebase Console.');
              }
            }
          }
        }}
        onDeleteData={async () => {
          if (user) {
            try {
              await deleteDoc(doc(db, 'portfolios', user.uid));
              setRealPortfolio([]);
              alert('Portfolio successfully wiped.');
              setIsUploaderOpen(false);
            } catch (error: any) {
              console.error(error);
              if (error.code === 'permission-denied') {
                alert('Firebase Permissions Error: Please update your Firestore Security Rules in the Firebase Console.');
              }
            }
          }
        }}
      />`;

code = code.replace(oldModal, newModal);
fs.writeFileSync('src/app/page.tsx', code);
console.log('page.tsx CRUD updated with try/catch.');
