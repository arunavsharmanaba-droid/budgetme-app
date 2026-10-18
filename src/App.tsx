/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { BudgetProvider, useBudget } from './context/BudgetContext';
import { Navigation, NavTab } from './components/Navigation';
import { HomeScreen } from './components/HomeScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { StatsScreen } from './components/StatsScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { HouseholdOnboardingScreen } from './components/HouseholdOnboardingScreen';
import { UndoToast } from './components/UndoToast';

export function MainLayout() {
  const { user, loading: authLoading } = useAuth();
  const { household, loading: budgetLoading } = useBudget();
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [guestMode, setGuestMode] = useState(() => {
    return localStorage.getItem('budget_guest_mode') === 'true';
  });

  // Handle invitation link parameter in URL: ?invite=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteParam = params.get('invite');
    if (inviteParam) {
      sessionStorage.setItem('pending_invite_code', inviteParam);
    }
  }, []);

  // Loading state
  if (authLoading || (user && budgetLoading)) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xl animate-pulse">
          Б
        </div>
        <p className="text-xs text-stone-400 mt-3 font-medium">
          Загрузка семейного бюджета...
        </p>
      </div>
    );
  }

  if (!user && !authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xl animate-pulse">
          Б
        </div>
        <p className="text-xs text-stone-400 mt-3 font-medium">
          Подключаем безопасную сессию семьи...
        </p>
      </div>
    );
  }

  if (user && !household) {
    return <HouseholdOnboardingScreen />;
  }
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors duration-200">
      <main className="flex-1 w-full max-w-lg mx-auto">
        {currentTab === 'home' && (
          <HomeScreen
            onOpenHistory={() => setCurrentTab('history')}
            onOpenSettings={() => setCurrentTab('settings')}
          />
        )}
        {currentTab === 'history' && <HistoryScreen />}
        {currentTab === 'stats' && <StatsScreen />}
        {currentTab === 'settings' && <SettingsScreen />}
      </main>

      {/* Undo action toast banner */}
      <UndoToast />

      {/* Mobile-first bottom navigation bar */}
      <Navigation currentTab={currentTab} onSelectTab={setCurrentTab} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BudgetProvider>
          <MainLayout />
        </BudgetProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
