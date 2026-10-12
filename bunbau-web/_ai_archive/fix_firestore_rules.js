const fs = require('fs');

const rules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /accounts/{accountId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      match /snapshots/{snapshotId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    match /portfolios/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
`;

fs.writeFileSync('firestore.rules', rules);
console.log('firestore.rules updated locally.');
