'use client';

import React, { useState, useEffect } from 'react';
import { BHOSDataStore } from '../../lib/data/store';
import {
  PlayerProfile,
  MatchRecord,
  Tournament,
  canAccessAdminPanel,
} from '../../lib/data/types';
import { useTranslation } from '../../lib/i18n';
import MatchLoggerModal from '../../components/MatchLoggerModal';
import SmoothReveal from '../../components/SmoothReveal';
import PlayersTab from '../../components/admin/PlayersTab';
import MatchesTab from '../../components/admin/MatchesTab';
import TournamentsTab from '../../components/admin/TournamentsTab';
import ArcadeModerationTab from '../../components/admin/ArcadeModerationTab';
import AuditLogsTab from '../../components/admin/AuditLogsTab';
import {
  ShieldAlert,
  Trophy,
  RotateCcw,
  CheckCircle2,
  Zap,
  Lock,
  UserPlus,
  Users,
  History,
  Gamepad2,
  ShieldCheck,
} from 'lucide-react';

type AdminTab = 'players' | 'matches' | 'tournaments' | 'arcade' | 'audit';

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const store = BHOSDataStore.getInstance();

  const [activeTab, setActiveTab] = useState<AdminTab>('players');
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [matchesList, setMatchesList] = useState<MatchRecord[]>([]);
  const [tournamentsList, setTournamentsList] = useState<Tournament[]>([]);
  const [currentUser, setCurrentUser] = useState<PlayerProfile | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    void store.fetchMatchesFromCloud();
    const update = () => {
      setProfiles(store.getProfiles());
      setMatchesList(store.getMatches());
      setCurrentUser(store.getCurrentUser());
      setTournamentsList(store.getTournaments());
    };
    update();
    return store.subscribe(update);
  }, [store]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleResetDemo = () => {
    store.resetToDefault();
    showToast('Portal məlumatları ilkin BANM vəziyyətinə qaytarıldı.');
  };

  const isAuthorized = canAccessAdminPanel(currentUser);

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'players', label: `${t('admin.tab_players', 'Üzvlər')} (${profiles.length})`, icon: Users },
    { id: 'matches', label: `${t('admin.tab_matches', 'Oyunlar')} (${matchesList.length})`, icon: History },
    { id: 'tournaments', label: `${t('admin.tab_tournaments', 'Turnirlər')} (${tournamentsList.length})`, icon: Trophy },
    { id: 'arcade', label: t('admin.tab_arcade', 'Arcade'), icon: Gamepad2 },
    { id: 'audit', label: t('admin.tab_audit', 'Audit Jurnalı'), icon: ShieldCheck },
  ];

  return (
    <SmoothReveal>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{t('admin.badge_mgmt', 'Prezident və Məşqçi İdarəetmə Mərkəzi')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
              {t('admin.title')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {t('admin.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAuthorized && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('players');
                  setShowAddMember((prev) => !prev);
                }}
                className="px-4 py-2.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 font-display font-bold text-xs transition flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t('admin.add_new_member', 'Yeni Üzv Əlavə Et')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowMatchModal(true)}
              className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold text-xs shadow-lg shadow-cyan-500/20 transition flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              <span>{t('nav.log_match')}</span>
            </button>
            <button
              type="button"
              onClick={handleResetDemo}
              className="px-4 py-2.5 rounded-xl border border-white/15 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>{t('admin.reset_demo')}</span>
            </button>
          </div>
        </div>

        {toastMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300 shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {!isAuthorized ? (
          <div className="p-8 rounded-3xl border border-rose-500/30 bg-rose-950/20 text-center space-y-3">
            <Lock className="w-10 h-10 text-rose-400 mx-auto" />
            <h2 className="text-lg font-display font-bold text-white">
              {t('admin.restricted_title', 'Məhdudlaşdırılmış İdarəetmə Paneli')}
            </h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              {t('admin.restricted_desc', 'Hazırda qonaq olaraq baxırsınız. Bu bölmə yalnız Klub Rəhbərliyi (Prezident və Məşqçi) üçün nəzərdə tutulub.')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Modular Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-white/10">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-display font-bold transition ${
                      active
                        ? 'bg-blue-700 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {activeTab === 'players' && (
              <PlayersTab
                profiles={profiles}
                matchesList={matchesList}
                currentUser={currentUser}
                showAddMember={showAddMember}
                onCloseAddMember={() => setShowAddMember(false)}
                showToast={showToast}
              />
            )}

            {activeTab === 'matches' && (
              <MatchesTab
                matchesList={matchesList}
                onMatchesChange={setMatchesList}
                showToast={showToast}
              />
            )}

            {activeTab === 'tournaments' && (
              <TournamentsTab
                profiles={profiles}
                tournamentsList={tournamentsList}
                currentUser={currentUser}
                onTournamentsUpdated={setTournamentsList}
                showToast={showToast}
              />
            )}

            {activeTab === 'arcade' && <ArcadeModerationTab showToast={showToast} />}

            {activeTab === 'audit' && <AuditLogsTab />}
          </div>
        )}

        {showMatchModal && (
          <MatchLoggerModal onClose={() => setShowMatchModal(false)} />
        )}
      </div>
    </SmoothReveal>
  );
}
