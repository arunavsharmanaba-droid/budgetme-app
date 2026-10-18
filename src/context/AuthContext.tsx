import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types/budget';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      let activeUser = currentUser;

      if (!activeUser) {
        try {
          const anonymousUser = await signInAnonymously(auth);
          activeUser = anonymousUser.user;
          console.info('[Auth] Anonymous auth successful', {
            userId: activeUser.uid,
            isAnonymous: activeUser.isAnonymous,
          });
        } catch (error: any) {
          console.error('Anonymous auth failed:', error);
          const message = error?.code === 'auth/operation-not-allowed'
            ? 'Firebase Anonymous Sign-In отключён в Firebase Console. Включите Anonymous Authentication, чтобы приложение работало без Google-профиля.'
            : 'Не удалось подключить безопасную сессию. Проверьте подключение к интернету и повторите запуск.';
          setAuthError(message);
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }
      }

      setUser(activeUser);

      try {
        const userDocRef = doc(db, 'users', activeUser.uid);

        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
          const initialProfile: UserProfile = {
            userId: activeUser.uid,
            displayName: activeUser.displayName || 'Пользователь',
            email: activeUser.email || '',
            photoURL: activeUser.photoURL || '',
            familyRole: 'Кирилл',
            createdAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, initialProfile);
          setUserProfile(initialProfile);
        } else {
          setUserProfile(snap.data() as UserProfile);
        }

        unsubProfile = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile(docSnap.data() as UserProfile);
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${activeUser.uid}`);
          }
        );
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setAuthError('Не удалось загрузить профиль пользователя.');
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Sign Out Error:', error);
      throw error;
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const newProfile = {
        ...(userProfile || {}),
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(userDocRef, newProfile, { merge: true });
      setUserProfile(newProfile as UserProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        authError,
        clearAuthError,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
