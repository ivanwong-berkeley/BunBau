const fs = require('fs');
let code = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');

// Add updateProfileData to interface
code = code.replace(
  'updateRiskTolerance: (risk: RiskTolerance) => Promise<void>;',
  'updateRiskTolerance: (risk: RiskTolerance) => Promise<void>;\n  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;'
);

// Add implementation
const impl = `  const updateRiskTolerance = async (risk: RiskTolerance) => {
    if (!user || !profile) return;
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { riskTolerance: risk }, { merge: true });
    setProfile({ ...profile, riskTolerance: risk });
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, data, { merge: true });
    setProfile({ ...profile, ...data });
  };`;

code = code.replace(/const updateRiskTolerance = async [\s\S]*?setProfile\(\{ \.\.\.profile, riskTolerance: risk \}\);\n  \};/m, impl);

// Add to context provider value
code = code.replace(
  'value={{ user, profile, loading, signInWithGoogle, logout, updateRiskTolerance }}',
  'value={{ user, profile, loading, signInWithGoogle, logout, updateRiskTolerance, updateProfileData }}'
);

fs.writeFileSync('src/contexts/AuthContext.tsx', code);
console.log('AuthContext updated.');
