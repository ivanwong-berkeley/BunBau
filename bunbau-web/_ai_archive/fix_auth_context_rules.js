const fs = require('fs');
let code = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');

const oldProfileUpdate = `const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, data, { merge: true });
    setProfile({ ...profile, ...data });
  };`;

const newProfileUpdate = `const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userRef, data, { merge: true });
      setProfile({ ...profile, ...data });
    } catch (error: any) {
      console.error(error);
      if (error.code === 'permission-denied') {
        alert('Firebase Permissions Error: Please update your Firestore Security Rules in the Firebase Console.');
      } else {
        alert('Failed to save profile data.');
      }
      throw error;
    }
  };`;

code = code.replace(oldProfileUpdate, newProfileUpdate);

const oldRiskUpdate = `const updateRiskTolerance = async (risk: RiskTolerance) => {
    if (!user || !profile) return;
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { riskTolerance: risk }, { merge: true });
    setProfile({ ...profile, riskTolerance: risk });
  };`;

const newRiskUpdate = `const updateRiskTolerance = async (risk: RiskTolerance) => {
    if (!user || !profile) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userRef, { riskTolerance: risk }, { merge: true });
      setProfile({ ...profile, riskTolerance: risk });
    } catch (error: any) {
      console.error(error);
      if (error.code === 'permission-denied') {
        alert('Firebase Permissions Error: Please update your Firestore Security Rules in the Firebase Console.');
      }
      throw error;
    }
  };`;

code = code.replace(oldRiskUpdate, newRiskUpdate);

fs.writeFileSync('src/contexts/AuthContext.tsx', code);
console.log('AuthContext updated with try/catch for permissions.');
