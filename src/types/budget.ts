export type OperationType = 'expense' | 'income' | 'transfer';

export interface Operation {
  id: string;
  userId: string; // compatibility / createdBy
  householdId?: string;
  createdBy?: string;
  authorName?: string;
  authorFamilyRole?: string;
  type: OperationType;
  description: string;
  amount: number;
  currency: string;
  categoryId: string;
  subcategoryId?: string;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO string
  updatedAt?: string;
  source: 'manual' | 'quick_entry';
  transferAccount?: string;
  note?: string;
  tags?: string[];
}

export interface Category {
  id: string;
  userId: string;
  householdId?: string;
  name: string;
  type: OperationType;
  parentId?: string; // empty or undefined for root category
  icon: string;
  color: string;
  sortOrder: number;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategorizationRule {
  id: string;
  userId: string;
  householdId?: string;
  keyword: string; // lowercase match string
  categoryId: string;
  subcategoryId?: string;
  type: OperationType;
  createdAt?: string;
}

export interface Household {
  id: string;
  name: string;
  currency: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface HouseholdMember {
  userId: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  role: 'owner' | 'member';
  familyRole?: string; // e.g., 'Муж' | 'Жена'
  joinedAt: string;
}

export interface Invitation {
  id: string;
  code: string;
  householdId: string;
  householdName: string;
  createdBy: string;
  creatorName: string;
  role: 'member';
  expiresAt: string;
  isUsed: boolean;
  usedBy?: string;
  usedAt?: string;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  currentHouseholdId?: string;
  familyRole?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSettings {
  userId: string;
  currency: string;
  theme?: 'light' | 'dark' | 'system';
  categoriesInitialized?: boolean;
  updatedAt?: string;
}

export interface ParsedInput {
  raw: string;
  description: string;
  amount: number | null;
  type: OperationType;
  categoryId: string;
  subcategoryId?: string;
  date: string; // YYYY-MM-DD
  confidence: number;
  matchedKeyword?: string;
}
