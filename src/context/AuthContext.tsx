import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types/budget';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
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
      setUser(currentUser);

      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          
          // Initial check or create profile
          const snap = await getDoc(userDocRef);
          if (!snap.exists()) {
            const initialProfile: UserProfile = {
              userId: currentUser.uid,
              displayName: currentUser.displayName || 'Пользователь',
              email: currentUser.email || '',
              photoURL: currentUser.photoURL || '',
              familyRole: 'Супруг',
              createdAt: new Date().toISOString(),
            };
            await setDoc(userDocRef, initialProfile);
            setUserProfile(initialProfile);
          } else {
            setUserProfile(snap.data() as UserProfile);
          }

          // Realtime listener for user profile changes
          unsubProfile = onSnapshot(
            userDocRef,
            (docSnap) => {
              if (docSnap.exists()) {
                setUserProfile(docSnap.data() as UserProfile);
              }
            },
            (error) => {
              handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
            }
          );
        } catch (err) {
          console.error('Error fetching user profile:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setUserProfile(null);
        if (unsubProfile) {
          unsubProfile();
          unsubProfile = null;
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      if (error?.code === 'auth/popup-closed-by-user') {
        setAuthError('Окно входа было закрыто. Попробуйте снова.');
      } else if (error?.code === 'auth/cancelled-popup-request') {
        setAuthError('Запрос на вход отменен.');
      } else if (error?.code === 'auth/popup-blocked') {
        setAuthError('Всплывающее окно заблокировано браузером. Разрешите всплывающие окна для входа.');
      } else {
        setAuthError('Не удалось войти через Google. Проверьте подключение к интернету.');
      }
      throw error;
    }
  };

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
        signInWithGoogle,
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
