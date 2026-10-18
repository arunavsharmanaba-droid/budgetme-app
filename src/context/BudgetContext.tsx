import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType as FsOpType, testConnection } from '../lib/firebase';
import {
  Category,
  CategorizationRule,
  Household,
  HouseholdMember,
  Invitation,
  Operation,
  UserSettings,
} from '../types/budget';
import { generateInitialCategories } from '../lib/defaultCategories';
import { getCurrentMonthKey } from '../lib/formatters';
import { useAuth } from './AuthContext';

interface BudgetContextType {
  // Household State
  household: Household | null;
  members: HouseholdMember[];
  isHouseholdOwner: boolean;
  createHousehold: (name: string, familyRole: string) => Promise<string>;
  joinHouseholdByCode: (code: string, familyRole: string) => Promise<{ success: boolean; error?: string }>;
  createInvitation: () => Promise<Invitation>;
  revokeMember: (userId: string) => Promise<void>;
  leaveHousehold: () => Promise<void>;
  renameHousehold: (newName: string) => Promise<void>;

  // Operations
  operations: Operation[];
  categories: Category[];
  rules: CategorizationRule[];
  userSettings: UserSettings;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  loading: boolean;
  
  // Operations CRUD
  addOperation: (op: Omit<Operation, 'id' | 'userId' | 'createdAt'>) => Promise<Operation>;
  updateOperation: (id: string, updates: Partial<Operation>) => Promise<void>;
  deleteOperation: (id: string) => Promise<void>;
  undoLastOperation: () => Promise<void>;
  lastAddedOp: Operation | null;
  clearLastAddedOp: () => void;

  // Categories CRUD
  addCategory: (cat: Omit<Category, 'id' | 'userId' | 'createdAt'>) => Promise<string>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string, replacementCatId?: string) => Promise<void>;
  reorderCategories: (orderedIds: string[]) => Promise<void>;
  resetToDefaultCategories: () => Promise<void>;

  // Rules CRUD
  addRule: (rule: Omit<CategorizationRule, 'id' | 'userId' | 'createdAt'>) => Promise<string>;
  deleteRule: (id: string) => Promise<void>;

  // Settings
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;

  // Backup & Restore
  exportBackup: () => string;
  importBackup: (jsonContent: string) => Promise<boolean>;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

const logHouseholdWrite = (stage: string, path: string, error?: unknown) => {
  if (error instanceof Error) {
    console.error('[HouseholdWrite] stage:', stage, 'path:', path, 'errorCode:', (error as any).code || 'unknown', 'message:', error.message);
  } else if (error) {
    console.error('[HouseholdWrite] stage:', stage, 'path:', path, 'errorCode:', (error as any)?.code || 'unknown', 'details:', error);
  } else {
    console.info('[HouseholdWrite] stage:', stage, 'path:', path);
  }
};

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, updateUserProfile } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey());
  
  const [household, setHousehold] = useState<Household | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<CategorizationRule[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    userId: user ? user.uid : 'local_user',
    currency: 'RUB',
    theme: 'system',
  });
  const [loading, setLoading] = useState(true);
  const [lastAddedOp, setLastAddedOp] = useState<Operation | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeHouseholdId = userProfile?.currentHouseholdId;
  const isHouseholdOwner = members.some((m) => m.userId === user?.uid && m.role === 'owner');

  useEffect(() => {
    testConnection();
  }, []);

  // Sync with Firestore Household if activeHouseholdId is present
  useEffect(() => {
    if (!user) {
      // Guest local fallback
      setHousehold(null);
      setMembers([]);
      try {
        const storedOps = localStorage.getItem('budget_local_operations');
        const storedCats = localStorage.getItem('budget_local_categories');
        if (storedOps) setOperations(JSON.parse(storedOps));
        if (storedCats) {
          setCategories(JSON.parse(storedCats));
        } else {
          const defaults = generateInitialCategories('local_user');
          setCategories(defaults);
        }
      } catch (e) {
        console.error('Error reading localStorage:', e);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!activeHouseholdId) {
      // User is logged in, but has not created or joined a household yet
      setHousehold(null);
      setMembers([]);
      setOperations([]);
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Listen to Household doc
    const householdRef = doc(db, 'households', activeHouseholdId);
    const unsubHousehold = onSnapshot(
      householdRef,
      (snap) => {
        if (snap.exists()) {
          const hData = snap.data() as Household;
          setHousehold(hData);
          if (hData.currency) {
            setUserSettings((prev) => ({ ...prev, currency: hData.currency }));
          }
        } else {
          // Household might have been deleted
          setHousehold(null);
          updateUserProfile({ currentHouseholdId: undefined });
        }
      },
      (err) => {
        console.warn('Household read error:', err);
        setHousehold(null);
      }
    );

    // 2. Listen to Household Members
    const membersRef = collection(db, 'households', activeHouseholdId, 'members');
    const unsubMembers = onSnapshot(
      membersRef,
      (snap) => {
        const list: HouseholdMember[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as HouseholdMember);
        });
        setMembers(list);
      },
      (err) => {
        console.warn('Members read error:', err);
      }
    );

    // 3. Listen to Shared Transactions (realtime for husband & wife)
    const txRef = collection(db, 'households', activeHouseholdId, 'transactions');
    const unsubTx = onSnapshot(
      txRef,
      (snap) => {
        const list: Operation[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as Operation);
        });
        // Sort reverse chronological
        list.sort((a, b) => {
          if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
          }
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });
        setOperations(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Transactions read error:', err);
        setLoading(false);
      }
    );

    // 4. Listen to Shared Categories
    const catRef = collection(db, 'households', activeHouseholdId, 'categories');
    const unsubCats = onSnapshot(
      catRef,
      async (snap) => {
        const list: Category[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as Category);
        });
        list.sort((a, b) => a.sortOrder - b.sortOrder);

        if (list.length === 0) {
          // Seed defaults into this household
          const defaults = generateInitialCategories(user.uid).map((c) => ({
            ...c,
            householdId: activeHouseholdId,
          }));
          try {
            const batch = writeBatch(db);
            for (const c of defaults) {
              batch.set(doc(db, 'households', activeHouseholdId, 'categories', c.id), c);
            }
            await batch.commit();
            setCategories(defaults);
          } catch (e) {
            console.error('Error auto-seeding household categories:', e);
          }
        } else {
          setCategories(list);
        }
      },
      (err) => {
        console.warn('Categories read error:', err);
      }
    );

    // 5. Listen to Shared Rules
    const rulesRef = collection(db, 'households', activeHouseholdId, 'rules');
    const unsubRules = onSnapshot(
      rulesRef,
      (snap) => {
        const list: CategorizationRule[] = [];
        snap.forEach((docSnap) => {
          list.push(docSnap.data() as CategorizationRule);
        });
        setRules(list);
      },
      (err) => {
        console.warn('Rules read error:', err);
      }
    );

    return () => {
      unsubHousehold();
      unsubMembers();
      unsubTx();
      unsubCats();
      unsubRules();
    };
  }, [user, activeHouseholdId]);

  // Create new Household
  const createHousehold = async (name: string, familyRole: string): Promise<string> => {
    if (!user) throw new Error('Требуется авторизация');

    console.info('[createHousehold] start', {
      authCurrentUser: !!auth.currentUser,
      authUid: auth.currentUser?.uid ?? null,
      userUid: user.uid,
      firestoreDatabase: db.databaseId || 'default',
    });

    const householdId = `hh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowISO = new Date().toISOString();

    const householdDoc: Household = {
      id: householdId,
      name: name.trim() || 'Наш семейный бюджет',
      currency: userSettings.currency || 'RUB',
      createdBy: user.uid,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    const ownerMember: HouseholdMember = {
      userId: user.uid,
      displayName: user.displayName || 'Муж',
      email: user.email || '',
      photoURL: user.photoURL || '',
      role: 'owner',
      familyRole: familyRole.trim() || 'Муж',
      joinedAt: nowISO,
    };

    try {
      // Must create the household and the owner member first. Categories are written only after
      // the member document exists, otherwise Firestore rules reject the batch because
      // isHouseholdMember() checks the member record before it is committed.
      const initialBatch = writeBatch(db);
      initialBatch.set(doc(db, 'households', householdId), householdDoc);
      initialBatch.set(doc(db, 'households', householdId, 'members', user.uid), ownerMember);
      logHouseholdWrite('household-create', `households/${householdId}`);
      await initialBatch.commit();
      logHouseholdWrite('household-create-success', `households/${householdId}`);

      const initialCats = generateInitialCategories(user.uid).map((c) => ({
        ...c,
        householdId,
      }));

      const categoryBatch = writeBatch(db);
      for (const c of initialCats) {
        const catPath = `households/${householdId}/categories/${c.id}`;
        logHouseholdWrite('category-prepare', catPath);
        categoryBatch.set(doc(db, 'households', householdId, 'categories', c.id), c);
      }
      await categoryBatch.commit();
      logHouseholdWrite('category-create-success', `households/${householdId}/categories`);

      await updateUserProfile({
        currentHouseholdId: householdId,
        familyRole: ownerMember.familyRole,
      });
      logHouseholdWrite('user-profile-update-success', `users/${user.uid}`);

      return householdId;
    } catch (error: any) {
      const path = `households/${householdId}/categories`;
      console.error('[createHousehold] Firestore rejected', {
        stage: 'create-household',
        path,
        errorCode: error?.code || 'unknown',
        message: error?.message || 'unknown error',
      });
      throw error;
    }
  };

  // Join Household by Invite Code
  const joinHouseholdByCode = async (
    rawCode: string,
    familyRole: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Войдите в аккаунт' };

    const cleanCode = rawCode.trim().toUpperCase();
    if (!cleanCode) return { success: false, error: 'Введите код приглашения' };

    try {
      const inviteRef = doc(db, 'invitations', cleanCode);
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        return { success: false, error: 'Код приглашения не найден или устарел' };
      }

      const invite = inviteSnap.data() as Invitation;
      if (invite.isUsed) {
        return { success: false, error: 'Этот код приглашения уже был использован' };
      }

      const expires = new Date(invite.expiresAt);
      if (expires.getTime() < Date.now()) {
        return { success: false, error: 'Срок действия кода приглашения истек' };
      }

      const nowISO = new Date().toISOString();
      const targetHouseholdId = invite.householdId;

      // Add user as member to household
      const newMember: HouseholdMember = {
        userId: user.uid,
        displayName: user.displayName || 'Жена',
        email: user.email || '',
        photoURL: user.photoURL || '',
        role: 'member',
        familyRole: familyRole.trim() || 'Жена',
        joinedAt: nowISO,
      };

      const batch = writeBatch(db);
      batch.set(
        doc(db, 'households', targetHouseholdId, 'members', user.uid),
        newMember
      );
      batch.update(inviteRef, {
        isUsed: true,
        usedBy: user.uid,
        usedAt: nowISO,
      });

      await batch.commit();

      // Update current user's profile
      await updateUserProfile({
        currentHouseholdId: targetHouseholdId,
        familyRole: newMember.familyRole,
      });

      return { success: true };
    } catch (err: any) {
      console.error('Error joining household:', err);
      return { success: false, error: err?.message || 'Не удалось присоединиться к семейному бюджету' };
    }
  };

  // Create single-use invitation
  const createInvitation = async (): Promise<Invitation> => {
    if (!user || !activeHouseholdId || !household) {
      throw new Error('Семейное пространство не выбрано');
    }

    // Generate readable code: e.g. "SEM-7294"
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const randomLetters = Math.random().toString(36).substring(2, 5).toUpperCase();
    const code = `SEM-${randomDigits}${randomLetters}`;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(); // 48 hours

    const newInvite: Invitation = {
      id: code,
      code,
      householdId: activeHouseholdId,
      householdName: household.name,
      createdBy: user.uid,
      creatorName: user.displayName || userProfile?.familyRole || 'Супруг',
      role: 'member',
      expiresAt,
      isUsed: false,
      createdAt: now.toISOString(),
    };

    await setDoc(doc(db, 'invitations', code), newInvite);
    return newInvite;
  };

  // Revoke member access (by owner)
  const revokeMember = async (targetUserId: string) => {
    if (!user || !activeHouseholdId || !isHouseholdOwner) return;
    if (targetUserId === user.uid) return; // Cannot revoke self

    try {
      await deleteDoc(doc(db, 'households', activeHouseholdId, 'members', targetUserId));
    } catch (err) {
      console.error('Error revoking member:', err);
    }
  };

  // Leave Household
  const leaveHousehold = async () => {
    if (!user || !activeHouseholdId) return;
    try {
      await deleteDoc(doc(db, 'households', activeHouseholdId, 'members', user.uid));
      await updateUserProfile({ currentHouseholdId: undefined });
      setHousehold(null);
      setMembers([]);
      setOperations([]);
      setCategories([]);
    } catch (err) {
      console.error('Error leaving household:', err);
    }
  };

  const renameHousehold = async (newName: string) => {
    if (!activeHouseholdId || !newName.trim()) return;
    try {
      await updateDoc(doc(db, 'households', activeHouseholdId), {
        name: newName.trim(),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error renaming household:', err);
    }
  };

  // Add Operation (Shared Transaction)
  const addOperation = async (
    opData: Omit<Operation, 'id' | 'userId' | 'createdAt'>
  ): Promise<Operation> => {
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowISO = new Date().toISOString();

    const currentMember = members.find((m) => m.userId === user?.uid);
    const authorRole = userProfile?.familyRole || currentMember?.familyRole || '';
    const fallbackAuthorName = user?.displayName
      ? `${user.displayName.split(' ')[0]}${authorRole ? ` (${authorRole})` : ''}`
      : authorRole || 'Кирилл';
    const authorName = (opData.authorName && opData.authorName.trim()) || fallbackAuthorName;

    const newOp: Operation = {
      ...opData,
      id,
      userId: user ? user.uid : 'local_user',
      householdId: activeHouseholdId || undefined,
      createdBy: user ? user.uid : 'local_user',
      authorName,
      authorFamilyRole: authorRole,
      createdAt: nowISO,
    };

    if (user && activeHouseholdId) {
      try {
        await setDoc(
          doc(db, 'households', activeHouseholdId, 'transactions', id),
          newOp
        );
      } catch (err) {
        handleFirestoreError(err, FsOpType.CREATE, `households/${activeHouseholdId}/transactions/${id}`);
      }
    } else {
      const updated = [newOp, ...operations];
      setOperations(updated);
      localStorage.setItem('budget_local_operations', JSON.stringify(updated));
    }

    setLastAddedOp(newOp);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => {
      setLastAddedOp(null);
    }, 8000);

    return newOp;
  };

  // Update Operation
  const updateOperation = async (id: string, updates: Partial<Operation>) => {
    const updatedPayload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (user && activeHouseholdId) {
      try {
        await updateDoc(
          doc(db, 'households', activeHouseholdId, 'transactions', id),
          updatedPayload
        );
      } catch (err) {
        handleFirestoreError(err, FsOpType.UPDATE, `households/${activeHouseholdId}/transactions/${id}`);
      }
    } else {
      const updated = operations.map((op) => (op.id === id ? { ...op, ...updatedPayload } : op));
      setOperations(updated);
      localStorage.setItem('budget_local_operations', JSON.stringify(updated));
    }
  };

  // Delete Operation
  const deleteOperation = async (id: string) => {
    if (user && activeHouseholdId) {
      try {
        await deleteDoc(doc(db, 'households', activeHouseholdId, 'transactions', id));
      } catch (err) {
        handleFirestoreError(err, FsOpType.DELETE, `households/${activeHouseholdId}/transactions/${id}`);
      }
    } else {
      const updated = operations.filter((op) => op.id !== id);
      setOperations(updated);
      localStorage.setItem('budget_local_operations', JSON.stringify(updated));
    }

    if (lastAddedOp?.id === id) {
      setLastAddedOp(null);
    }
  };

  const undoLastOperation = async () => {
    if (lastAddedOp) {
      await deleteOperation(lastAddedOp.id);
      setLastAddedOp(null);
    }
  };

  const clearLastAddedOp = () => setLastAddedOp(null);

  // Category CRUD
  const addCategory = async (catData: Omit<Category, 'id' | 'userId' | 'createdAt'>): Promise<string> => {
    const id = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newCat: Category = {
      ...catData,
      id,
      userId: user ? user.uid : 'local_user',
      householdId: activeHouseholdId || undefined,
      createdAt: new Date().toISOString(),
    };

    if (user && activeHouseholdId) {
      try {
        await setDoc(doc(db, 'households', activeHouseholdId, 'categories', id), newCat);
      } catch (err) {
        handleFirestoreError(err, FsOpType.CREATE, `households/${activeHouseholdId}/categories/${id}`);
      }
    } else {
      const updated = [...categories, newCat];
      setCategories(updated);
      localStorage.setItem('budget_local_categories', JSON.stringify(updated));
    }

    return id;
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const updatedPayload = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (user && activeHouseholdId) {
      try {
        await updateDoc(doc(db, 'households', activeHouseholdId, 'categories', id), updatedPayload);
      } catch (err) {
        handleFirestoreError(err, FsOpType.UPDATE, `households/${activeHouseholdId}/categories/${id}`);
      }
    } else {
      const updated = categories.map((c) => (c.id === id ? { ...c, ...updatedPayload } : c));
      setCategories(updated);
      localStorage.setItem('budget_local_categories', JSON.stringify(updated));
    }
  };

  const deleteCategory = async (id: string, replacementCatId?: string) => {
    const targetCatId = replacementCatId || 'uncategorized';
    const opsToUpdate = operations.filter((op) => op.categoryId === id || op.subcategoryId === id);

    if (user && activeHouseholdId) {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'households', activeHouseholdId, 'categories', id));
        for (const op of opsToUpdate) {
          const updateData: Partial<Operation> = { updatedAt: new Date().toISOString() };
          if (op.categoryId === id) {
            updateData.categoryId = targetCatId;
            updateData.subcategoryId = '';
          } else if (op.subcategoryId === id) {
            updateData.subcategoryId = '';
          }
          batch.update(doc(db, 'households', activeHouseholdId, 'transactions', op.id), updateData);
        }
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, FsOpType.DELETE, `households/${activeHouseholdId}/categories/${id}`);
      }
    } else {
      const updatedCats = categories.filter((c) => c.id !== id && c.parentId !== id);
      const updatedOps = operations.map((op) => {
        if (op.categoryId === id) return { ...op, categoryId: targetCatId, subcategoryId: '' };
        if (op.subcategoryId === id) return { ...op, subcategoryId: '' };
        return op;
      });
      setCategories(updatedCats);
      setOperations(updatedOps);
      localStorage.setItem('budget_local_categories', JSON.stringify(updatedCats));
      localStorage.setItem('budget_local_operations', JSON.stringify(updatedOps));
    }
  };

  const reorderCategories = async (orderedIds: string[]) => {
    const updated = categories.map((c) => {
      const idx = orderedIds.indexOf(c.id);
      return idx !== -1 ? { ...c, sortOrder: idx } : c;
    });

    if (user && activeHouseholdId) {
      try {
        const batch = writeBatch(db);
        orderedIds.forEach((id, idx) => {
          batch.update(doc(db, 'households', activeHouseholdId, 'categories', id), { sortOrder: idx });
        });
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, FsOpType.UPDATE, `households/${activeHouseholdId}/categories`);
      }
    } else {
      setCategories(updated);
      localStorage.setItem('budget_local_categories', JSON.stringify(updated));
    }
  };

  const resetToDefaultCategories = async () => {
    const defaults = generateInitialCategories(user ? user.uid : 'local_user').map((c) => ({
      ...c,
      householdId: activeHouseholdId || undefined,
    }));

    if (user && activeHouseholdId) {
      try {
        const batch = writeBatch(db);
        categories.forEach((c) =>
          batch.delete(doc(db, 'households', activeHouseholdId, 'categories', c.id))
        );
        defaults.forEach((c) =>
          batch.set(doc(db, 'households', activeHouseholdId, 'categories', c.id), c)
        );
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, FsOpType.WRITE, `households/${activeHouseholdId}/categories`);
      }
    } else {
      setCategories(defaults);
      localStorage.setItem('budget_local_categories', JSON.stringify(defaults));
    }
  };

  // Rules CRUD
  const addRule = async (ruleData: Omit<CategorizationRule, 'id' | 'userId' | 'createdAt'>): Promise<string> => {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newRule: CategorizationRule = {
      ...ruleData,
      id,
      userId: user ? user.uid : 'local_user',
      householdId: activeHouseholdId || undefined,
      createdAt: new Date().toISOString(),
    };

    if (user && activeHouseholdId) {
      try {
        await setDoc(doc(db, 'households', activeHouseholdId, 'rules', id), newRule);
      } catch (err) {
        handleFirestoreError(err, FsOpType.CREATE, `households/${activeHouseholdId}/rules/${id}`);
      }
    } else {
      const updated = [...rules, newRule];
      setRules(updated);
      localStorage.setItem('budget_local_rules', JSON.stringify(updated));
    }

    return id;
  };

  const deleteRule = async (id: string) => {
    if (user && activeHouseholdId) {
      try {
        await deleteDoc(doc(db, 'households', activeHouseholdId, 'rules', id));
      } catch (err) {
        handleFirestoreError(err, FsOpType.DELETE, `households/${activeHouseholdId}/rules/${id}`);
      }
    } else {
      const updated = rules.filter((r) => r.id !== id);
      setRules(updated);
      localStorage.setItem('budget_local_rules', JSON.stringify(updated));
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    const newSettings = {
      ...userSettings,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    setUserSettings(newSettings);

    if (user && activeHouseholdId && updates.currency) {
      try {
        await updateDoc(doc(db, 'households', activeHouseholdId), {
          currency: updates.currency,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Error updating household currency:', err);
      }
    }
  };

  // Export full JSON backup
  const exportBackup = (): string => {
    const backupData = {
      app: 'Бюджет',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      household,
      members,
      operations,
      categories,
      rules,
      userSettings,
    };
    return JSON.stringify(backupData, null, 2);
  };

  // Import JSON backup
  const importBackup = async (jsonContent: string): Promise<boolean> => {
    try {
      const data = JSON.parse(jsonContent);
      if (!Array.isArray(data.operations) || !Array.isArray(data.categories)) {
        throw new Error('Некорректная структура резервной копии');
      }

      if (user && activeHouseholdId) {
        const batch = writeBatch(db);
        for (const c of data.categories) {
          batch.set(doc(db, 'households', activeHouseholdId, 'categories', c.id), {
            ...c,
            householdId: activeHouseholdId,
          });
        }
        for (const op of data.operations) {
          batch.set(doc(db, 'households', activeHouseholdId, 'transactions', op.id), {
            ...op,
            householdId: activeHouseholdId,
          });
        }
        await batch.commit();
      } else {
        setOperations(data.operations);
        setCategories(data.categories);
        localStorage.setItem('budget_local_operations', JSON.stringify(data.operations));
        localStorage.setItem('budget_local_categories', JSON.stringify(data.categories));
      }
      return true;
    } catch (e) {
      console.error('Ошибка импорта резервной копии:', e);
      return false;
    }
  };

  return (
    <BudgetContext.Provider
      value={{
        household,
        members,
        isHouseholdOwner,
        createHousehold,
        joinHouseholdByCode,
        createInvitation,
        revokeMember,
        leaveHousehold,
        renameHousehold,
        operations,
        categories,
        rules,
        userSettings,
        selectedMonth,
        setSelectedMonth,
        loading,
        addOperation,
        updateOperation,
        deleteOperation,
        undoLastOperation,
        lastAddedOp,
        clearLastAddedOp,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
        resetToDefaultCategories,
        addRule,
        deleteRule,
        updateSettings,
        exportBackup,
        importBackup,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudget = () => {
  const context = useContext(BudgetContext);
  if (!context) throw new Error('useBudget must be used within BudgetProvider');
  return context;
};
