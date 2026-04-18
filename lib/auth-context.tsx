'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import type { User, UserRole, AuthContextType } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Extended auth context type to include guest login
interface ExtendedAuthContextType extends AuthContextType {
  loginAsGuest: (role: UserRole) => void;
}

const AuthContext = createContext<ExtendedAuthContextType | undefined>(undefined);

// Guest users for demo purposes
const guestUsers: Record<UserRole, User> = {
  admin: {
    uid: 'guest-admin',
    name: 'Guest Admin',
    email: 'admin@demo.samarpan.app',
    role: 'admin',
    mandal_id: 'demo-mandal',
    created_at: new Date(),
    status: 'active',
  },
  volunteer: {
    uid: 'guest-volunteer',
    name: 'Guest Volunteer',
    email: 'volunteer@demo.samarpan.app',
    role: 'volunteer',
    mandal_id: 'demo-mandal',
    created_at: new Date(),
    status: 'active',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // true until Firebase resolves auth state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, fetch additional data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
             // ensure we map correctly, dates may need conversion from firestore Timestamp.
            const userData = userDoc.data() as User;
             // handle firestore timestamp to date conversion if needed
             if(userData.created_at && (userData.created_at as any).toDate) {
               userData.created_at = (userData.created_at as any).toDate();
             }
            setUser(userData);
          } else {
             // If user doesn't exist in firestore but in auth, we could create a basic one or handle error
             // For now, setting a basic user based on auth info
             setUser({
                 uid: firebaseUser.uid,
                 name: firebaseUser.displayName || 'User',
                 email: firebaseUser.email || '',
                 role: 'volunteer', // default role
                 mandal_id: 'demo-mandal',
                 created_at: new Date(),
                 status: 'active'
             });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // State is updated by onAuthStateChanged listener
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);

  const loginAsGuest = useCallback((role: UserRole) => {
    setUser(guestUsers[role]);
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, loginAsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
