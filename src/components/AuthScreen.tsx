import React, { useState } from 'react';
import { LogIn, Sparkles, Users, Smartphone, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthScreenProps {
  onContinueAsGuest?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onContinueAsGuest }) => {
  const { signInWithGoogle, authError, clearAuthError } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      // Handled in context
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-between p-6 max-w-md mx-auto">
      {/* Top Branding */}
      <div className="pt-12 text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-3xl shadow-sm">
          Б
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight">
          Бюджет
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 max-w-xs mx-auto leading-relaxed">
          Простой семейный блокнот для двух смартфонов. Быстрая запись расходов за 2 секунды.
        </p>
      </div>

      {/* Feature Highlights */}
      <div className="space-y-3 py-6">
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="text-left text-xs">
            <p className="font-semibold text-stone-900 dark:text-stone-100">
              Общий кошелек для мужа и жены
            </p>
            <p className="text-stone-400 mt-0.5">
              Мгновенная синхронизация: вы видите каждую запись друг друга без обновления
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="text-left text-xs">
            <p className="font-semibold text-stone-900 dark:text-stone-100">
              Умный ввод одной строкой
            </p>
            <p className="text-stone-400 mt-0.5">
              «Продукты 850» или «Бензин 2500» — сумма и категория подбираются сами
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-left text-xs">
            <p className="font-semibold text-stone-900 dark:text-stone-100">
              Безопасность и приватность
            </p>
            <p className="text-stone-400 mt-0.5">
              Вход через Google, данные изолированы правилами безопасности в облаке
            </p>
          </div>
        </div>
      </div>

      {/* Auth Error Banner */}
      {authError && (
        <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
          {authError}
        </div>
      )}

      {/* Bottom Actions */}
      <div className="space-y-3 pb-6">
        <button
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="w-full py-3.5 px-4 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:hover:bg-stone-200 dark:text-stone-900 text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-3 shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {/* Google G SVG */}
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isSigningIn ? 'Вход...' : 'Войти через Google'}</span>
        </button>

        {onContinueAsGuest && (
          <button
            onClick={onContinueAsGuest}
            className="w-full py-2.5 text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-300 font-medium transition-colors"
          >
            Попробовать локально без аккаунта
          </button>
        )}
      </div>
    </div>
  );
};
