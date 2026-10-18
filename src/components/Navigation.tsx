import React from 'react';
import { Home, History, PieChart, Settings } from 'lucide-react';

export type NavTab = 'home' | 'history' | 'stats' | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'home' as NavTab, label: 'Главная', icon: Home },
    { id: 'history' as NavTab, label: 'История', icon: History },
    { id: 'stats' as NavTab, label: 'Статистика', icon: PieChart },
    { id: 'settings' as NavTab, label: 'Настройки', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200/80 dark:border-stone-800 safe-bottom">
      <div className="max-w-md mx-auto px-4 flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all active:scale-90 ${
                isActive
                  ? 'text-stone-900 dark:text-stone-100 font-semibold'
                  : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                  }`}
                />
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </div>
              <span className="text-[11px] tracking-tight mt-1 truncate">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
