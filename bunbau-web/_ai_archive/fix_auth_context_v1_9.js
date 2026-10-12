const fs = require('fs');
let code = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');

// Add isAuthenticating to interface
code = code.replace(
  'loading: boolean;',
  'loading: boolean;\n  isAuthenticating: boolean;'
);

// Add state to AuthProvider
code = code.replace(
  'const [loading, setLoading] = useState(true);',
  'const [loading, setLoading] = useState(true);\n  const [isAuthenticating, setIsAuthenticating] = useState(false);'
);

// Update signInWithGoogle
const oldSignIn = `const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Error signing in with Google', error);
    }
  };`;

const newSignIn = `const signInWithGoogle = async () => {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request') {
        console.warn('Sign-in cancelled by user or new request.');
      } else if (error.code === 'auth/popup-blocked') {
        alert('Your browser blocked the sign-in popup. Please allow popups for this site.');
      } else {
        console.error('Error signing in with Google', error);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };`;

code = code.replace(oldSignIn, newSignIn);

// Add to context provider value
code = code.replace(
  'value={{ user, profile, loading, signInWithGoogle, logout, updateRiskTolerance, updateProfileData }}',
  'value={{ user, profile, loading, isAuthenticating, signInWithGoogle, logout, updateRiskTolerance, updateProfileData }}'
);

fs.writeFileSync('src/contexts/AuthContext.tsx', code);
console.log('AuthContext updated with debounce lock and error handling.');
