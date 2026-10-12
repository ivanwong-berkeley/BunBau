'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, RiskTolerance } from '../lib/models';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticating: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateRiskTolerance: (risk: RiskTolerance) => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Check local storage fallback cache first to prevent flash of empty data
        const localCacheKey = `bunbau_profile_cache_${firebaseUser.uid}`;
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(localCacheKey);
          if (cached) {
            try {
              setProfile(JSON.parse(cached));
            } catch (_) {}
          }
        }

        // Fetch or create user profile in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
          const remoteProfile = docSnap.data() as UserProfile;
          setProfile(remoteProfile);
          if (typeof window !== 'undefined') {
            localStorage.setItem(localCacheKey, JSON.stringify(remoteProfile));
            if (remoteProfile.theme) {
              localStorage.setItem('bunbau_theme', remoteProfile.theme);
            }
          }
        } else {
          const localTheme = typeof window !== 'undefined' ? (localStorage.getItem('bunbau_theme') as UserProfile['theme']) : undefined;
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Unknown',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            riskTolerance: 'Moderate',
            theme: localTheme || 'dark',
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile);
          if (typeof window !== 'undefined') {
            localStorage.setItem(localCacheKey, JSON.stringify(newProfile));
            if (newProfile.theme) {
              localStorage.setItem('bunbau_theme', newProfile.theme);
            }
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
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
  };

  const logout = async () => {
    await signOut(auth);
  };

    const updateRiskTolerance = async (risk: RiskTolerance) => {
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
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const userRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userRef, data, { merge: true });
      const updatedProfile = { ...profile, ...data };
      setProfile(updatedProfile);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`bunbau_profile_cache_${user.uid}`, JSON.stringify(updatedProfile));
        if (data.theme) {
          localStorage.setItem('bunbau_theme', data.theme);
        }
      }
    } catch (error: any) {
      console.error(error);
      if (error.code === 'permission-denied') {
        alert('Firebase Permissions Error: Please update your Firestore Security Rules in the Firebase Console.');
      } else {
        alert('Failed to save profile data.');
      }
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAuthenticating, signInWithGoogle, logout, updateRiskTolerance, updateProfileData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
