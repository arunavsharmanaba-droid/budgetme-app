import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  UserPlus,
  Shield,
  Trash2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useBudget } from '../context/BudgetContext';
import { useAuth } from '../context/AuthContext';
import { Invitation } from '../types/budget';

interface InvitePartnerModalProps {
  onClose: () => void;
}

export const InvitePartnerModal: React.FC<InvitePartnerModalProps> = ({ onClose }) => {
  const { household, members, isHouseholdOwner, createInvitation, revokeMember } = useBudget();
  const { user } = useAuth();

  const [activeInvite, setActiveInvite] = useState<Invitation | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const invite = await createInvitation();
      setActiveInvite(invite);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const inviteLink = activeInvite
    ? `${window.location.origin}/?invite=${activeInvite.code}`
    : '';

  const handleCopy = () => {
    if (!activeInvite) return;
    const textToCopy = `Привет! Присоединяйся к нашему семейному бюджету «${household?.name}». Код приглашения: ${activeInvite.code}\nИли перейди по ссылке: ${inviteLink}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Семейный доступ
            </h3>
            <p className="text-xs text-stone-400">
              {household?.name || 'Наш бюджет'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Current Members List */}
          <div>
            <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider mb-2.5">
              Участники семейного бюджета ({members.length})
            </h4>

            <div className="space-y-2">
              {members.map((m) => {
                const isCurrent = m.userId === user?.uid;

                return (
                  <div
                    key={m.userId}
                    className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/70 dark:border-stone-800"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {m.photoURL ? (
                        <img
                          src={m.photoURL}
                          alt="Avatar"
                          className="w-9 h-9 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                          {m.displayName ? m.displayName[0].toUpperCase() : 'U'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                            {m.displayName}
                          </p>
                          {m.familyRole && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                              {m.familyRole}
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[10px] text-stone-400">(Вы)</span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-400 truncate">
                          {m.role === 'owner' ? 'Создатель пространства' : 'Участник'}
                        </p>
                      </div>
                    </div>

                    {/* Revoke button (if owner and not self) */}
                    {isHouseholdOwner && !isCurrent && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Отозвать доступ для ${m.displayName}?`)) {
                            revokeMember(m.userId);
                          }
                        }}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                        title="Отозвать доступ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Invitation generator section */}
          <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/60 rounded-3xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <UserPlus className="w-4 h-4 flex-shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Пригласить второго супруга
              </h4>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Отправьте код или ссылку супругу. После входа через Google он мгновенно подключится к вашему общему бюджету.
            </p>

            {activeInvite ? (
              <div className="space-y-3 pt-1">
                {/* Invite Code Box */}
                <div className="bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-700 rounded-2xl p-3.5 text-center">
                  <span className="text-[10px] text-stone-400 uppercase font-semibold">
                    Одноразовый код (действует 48ч)
                  </span>
                  <div className="text-2xl font-mono font-bold tracking-widest text-emerald-600 dark:text-emerald-400 my-1">
                    {activeInvite.code}
                  </div>
                  <div className="flex items-center justify-center gap-1 text-[10px] text-stone-400">
                    <Clock className="w-3 h-3" />
                    <span>Одноразовый защищенный код</span>
                  </div>
                </div>

                {/* Copy button */}
                <button
                  onClick={handleCopy}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Скопировано в буфер!' : 'Скопировать код и ссылку'}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loading ? 'Создание...' : 'Сгенерировать код приглашения'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
