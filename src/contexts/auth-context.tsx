
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, type User as FirebaseAuthUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User as AppUserType, Role } from '@/types';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthContextType {
  user: FirebaseAuthUser | null;
  appUser: AppUserType | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [appUser, setAppUser] = useState<AppUserType | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let firestoreUnsubscribe: (() => void) | undefined;

    const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
        firestoreUnsubscribe = undefined;
      }
      setAppUser(null); // Reset appUser before fetching new data or if no firebaseUser
      setLoading(true);

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        firestoreUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            let role: Role = 'User'; // Default role

            if (data.isAdmin === true) { // Backward compatibility for old isAdmin flag
              role = 'Administrator';
            } else if (data.role) {
              role = data.role as Role;
            }

            const userDataWithDatesAndRole: AppUserType = {
              id: docSnap.id,
              name: data.name || '',
              avatar: data.avatar,
              teamId: data.teamId,
              createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : data.createdAt,
              role: role,
            };
            setAppUser(userDataWithDatesAndRole);
          } else {
            setAppUser(null); // User document doesn't exist
            // For a new Firebase Auth user, their Firestore profile might not be created yet.
            // The admin would typically create this profile via the "Manage Users" tool.
            console.warn('AuthContext: User document not found in Firestore for UID:', firebaseUser.uid, ". User needs profile creation.");
          }
          setLoading(false);
        }, (error) => {
          console.error("AuthContext: Error fetching user data from Firestore for UID:", firebaseUser.uid, error);
          setAppUser(null);
          setLoading(false);
        });
      } else {
        // No Firebase user
        setAppUser(null);
        setLoading(false);
      }
    });
    
    return () => {
      authUnsubscribe();
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
    };
  }, []);

  const value = useMemo(() => ({ user, appUser, loading }), [user, appUser, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
