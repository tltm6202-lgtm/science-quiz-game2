import { useState, useMemo } from "react";
import { getPlayers, getStats, deletePlayer, clearAllPlayers, type PlayerRecord } from "../store/gameStore";

interface AdminDashboardProps {
  onLogout: () => void;
}

type Tab = "overview" | "players" | "games" | "leaderboard";

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRecord | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const players = useMemo(() => getPlayers(), [refreshKey]);
  const stats = useMemo(() => getStats(), [refreshKey]);

  const refresh = () => setRefreshKey(k => k + 1);

  const filteredPlayers = useMemo(() => {
    let result = players;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.phone.includes(term)
      );
    }
    if (selectedGradeFilter !== "all") {
      result = result.filter(p => p.grade === selectedGradeFilter);
    }
    return result;
  }, [players, searchTerm, selectedGradeFilter]);

  const handleDeletePlayer = (id: string) => {
    deletePlayer(id);
    setShowDeleteConfirm(null);
    setSelectedPlayer(null);
    refresh();
  };

  const handleClearAll = () => {
    clearAllPlayers();
    setShowClearConfirm(false);
    refresh();
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getGradeLabel = (grade: string) => {
    const labels: Record<string, string> = {
      first: "أولى إعدادي",
      second: "تانية إعدادي",
      third: "تالتة إعدادي",
    };
    return labels[grade] || grade;
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "overview", label: "نظرة عامة", icon: "📊" },
    { key: "players", label: "اللاعبين", icon: "👥" },
    { key: "games", label: "الألعاب", icon: "🎮" },
    { key: "leaderboard", label: "المتصدرين", icon: "🏆" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" dir="rtl">
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl">
              🎓
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">لوحة تحكم المعلم</h1>
              <p className="text-slate-400 text-xs">لعبة العلوم - المرحلة الإعدادية</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-lg"
              title="تحديث"
            >
              🔄
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 transition-all text-sm font-medium border border-red-500/20"
            >
              تسجيل خروج ✕
            </button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-300 border border-transparent"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="👥" label="إجمالي اللاعبين" value={stats.totalPlayers} color="from-blue-500 to-cyan-500" />
              <StatCard icon="🎮" label="إجمالي الألعاب" value={stats.totalGames} color="from-purple-500 to-pink-500" />
              <StatCard icon="🏆" label="مرات الفوز" value={stats.totalWins} color="from-yellow-500 to-orange-500" />
              <StatCard icon="📊" label="متوسط النسبة" value={`${stats.avgScore}%`} color="from-green-500 to-emerald-500" />
            </div>

            {/* Grade Stats */}
            <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6">
              <h3 className="text-white font-bold text-lg mb-4">📚 إحصائيات حسب الصف</h3>
              {Object.keys(stats.gradeStats).length === 0 ? (
                <p className="text-slate-400 text-center py-8">لا توجد بيانات بعد</p>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  {Object.entries(stats.gradeStats).map(([grade, gs]) => (
                    <div key={grade} className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <h4 className="text-white font-medium mb-3">{grade}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">اللاعبين</span>
                          <span className="text-blue-300 font-bold">{gs.players}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">الألعاب</span>
                          <span className="text-purple-300 font-bold">{gs.games}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">مرات الفوز</span>
                          <span className="text-yellow-300 font-bold">{gs.wins}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">متوسط النسبة</span>
                          <span className="text-green-300 font-bold">{gs.avgScore}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Players */}
            <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6">
              <h3 className="text-white font-bold text-lg mb-4">🕐 آخر المسجلين</h3>
              {players.length === 0 ? (
                <p className="text-slate-400 text-center py-8">لا يوجد لاعبين مسجلين بعد</p>
              ) : (
                <div className="space-y-3">
                  {[...players]
                    .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime())
                    .slice(0, 5)
                    .map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{p.name}</p>
                            <p className="text-slate-400 text-xs">{getGradeLabel(p.grade)} • {p.phone}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-slate-300 text-xs">{formatDate(p.registeredAt)}</p>
                          <p className="text-blue-300 text-xs">{p.gamesPlayed.length} لعبة</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Players Tab */}
        {activeTab === "players" && (
          <div className="space-y-4">
            {/* Search & Filter */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 بحث بالاسم أو رقم التليفون..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all text-sm"
                />
              </div>
              <select
                value={selectedGradeFilter}
                onChange={(e) => setSelectedGradeFilter(e.target.value)}
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all text-sm appearance-none cursor-pointer"
              >
                <option value="all" className="bg-slate-800">كل الصفوف</option>
                <option value="first" className="bg-slate-800">الأول الإعدادي</option>
                <option value="second" className="bg-slate-800">الثاني الإعدادي</option>
                <option value="third" className="bg-slate-800">الثالث الإعدادي</option>
              </select>
              {players.length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl border border-red-500/20 text-sm font-medium transition-all whitespace-nowrap"
                >
                  🗑️ مسح الكل
                </button>
              )}
            </div>

            <p className="text-slate-400 text-sm">
              عدد النتائج: <span className="text-white font-bold">{filteredPlayers.length}</span> لاعب
            </p>

            {/* Players List */}
            {filteredPlayers.length === 0 ? (
              <div className="bg-white/5 rounded-2xl border border-white/10 p-12 text-center">
                <p className="text-4xl mb-3">👥</p>
                <p className="text-slate-400">لا يوجد لاعبين {searchTerm ? "مطابقين للبحث" : "مسجلين بعد"}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPlayers.map(p => (
                  <div
                    key={p.id}
                    className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-4 hover:bg-white/8 transition-all cursor-pointer"
                    onClick={() => setSelectedPlayer(selectedPlayer?.id === p.id ? null : p)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-bold">{p.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-slate-400 text-xs flex items-center gap-1">📱 {p.phone}</span>
                            <span className="text-slate-400 text-xs">•</span>
                            <span className="text-blue-300 text-xs">{getGradeLabel(p.grade)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-left hidden md:block">
                          <p className="text-slate-300 text-sm">{p.gamesPlayed.length} لعبة</p>
                          <p className="text-slate-400 text-xs">{formatDate(p.registeredAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(p.id); }}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all text-sm"
                            title="حذف"
                          >
                            🗑️
                          </button>
                          <span className="text-slate-500 text-sm">{selectedPlayer?.id === p.id ? "▲" : "▼"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {selectedPlayer?.id === p.id && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-blue-300 text-xl font-bold">{p.gamesPlayed.length}</p>
                            <p className="text-slate-400 text-xs">إجمالي الألعاب</p>
                          </div>
                          <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-green-300 text-xl font-bold">{p.gamesPlayed.filter(g => g.won).length}</p>
                            <p className="text-slate-400 text-xs">مرات الفوز</p>
                          </div>
                          <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-yellow-300 text-xl font-bold">
                              {p.gamesPlayed.length > 0 ? Math.max(...p.gamesPlayed.map(g => g.score)) : 0}
                            </p>
                            <p className="text-slate-400 text-xs">أعلى نقاط</p>
                          </div>
                          <div className="bg-white/5 rounded-xl p-3 text-center">
                            <p className="text-purple-300 text-xl font-bold">
                              {p.gamesPlayed.length > 0 ? Math.max(...p.gamesPlayed.map(g => g.bestStreak)) : 0}🔥
                            </p>
                            <p className="text-slate-400 text-xs">أفضل متتالية</p>
                          </div>
                        </div>

                        {p.gamesPlayed.length > 0 && (
                          <div>
                            <h4 className="text-white font-medium text-sm mb-2">سجل الألعاب:</h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {[...p.gamesPlayed]
                                .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
                                .map(g => (
                                  <div key={g.id} className="flex items-center justify-between bg-white/5 rounded-xl p-3 text-sm">
                                    <div className="flex items-center gap-3">
                                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${g.won ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                        {g.won ? "🏆" : "❌"}
                                      </span>
                                      <div>
                                        <p className="text-white">{g.gradeLabel}</p>
                                        <p className="text-slate-400 text-xs">{formatDate(g.playedAt)}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs">
                                      <span className="text-yellow-300">{g.score}/{g.totalQuestions} نقطة</span>
                                      <span className="text-green-300">{g.percentage}%</span>
                                      <span className="text-orange-300">{g.bestStreak}🔥</span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Games Tab */}
        {activeTab === "games" && (
          <div className="space-y-4">
            <h2 className="text-white font-bold text-xl">🎮 سجل جميع الألعاب</h2>
            {(() => {
              const allGames = players.flatMap(p =>
                p.gamesPlayed.map(g => ({ ...g, playerName: p.name, playerPhone: p.phone }))
              ).sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());

              if (allGames.length === 0) {
                return (
                  <div className="bg-white/5 rounded-2xl border border-white/10 p-12 text-center">
                    <p className="text-4xl mb-3">🎮</p>
                    <p className="text-slate-400">لا توجد ألعاب مسجلة بعد</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {allGames.map((g, idx) => (
                    <div key={idx} className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${g.won ? "bg-green-500/20" : "bg-slate-500/20"}`}>
                            {g.won ? "🏆" : "🎮"}
                          </span>
                          <div>
                            <p className="text-white font-medium">{g.playerName}</p>
                            <p className="text-slate-400 text-xs">{g.gradeLabel} • {formatDate(g.playedAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <p className="text-yellow-300 font-bold">{g.score}/{g.totalQuestions}</p>
                            <p className="text-slate-400 text-xs">النقاط</p>
                          </div>
                          <div className="text-center">
                            <p className="text-green-300 font-bold">{g.percentage}%</p>
                            <p className="text-slate-400 text-xs">النسبة</p>
                          </div>
                          <div className="text-center">
                            <p className="text-orange-300 font-bold">{g.bestStreak}🔥</p>
                            <p className="text-slate-400 text-xs">متتالية</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${g.won ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                            {g.won ? "فائز" : "لم يفز"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === "leaderboard" && (
          <div className="space-y-4">
            <h2 className="text-white font-bold text-xl">🏆 قائمة المتصدرين</h2>
            {stats.topPlayers.length === 0 ? (
              <div className="bg-white/5 rounded-2xl border border-white/10 p-12 text-center">
                <p className="text-4xl mb-3">🏆</p>
                <p className="text-slate-400">لا يوجد لاعبين بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.topPlayers.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`backdrop-blur rounded-2xl border p-4 transition-all ${
                      idx === 0 ? "bg-yellow-500/10 border-yellow-500/30" :
                      idx === 1 ? "bg-slate-300/10 border-slate-300/20" :
                      idx === 2 ? "bg-orange-600/10 border-orange-600/20" :
                      "bg-white/5 border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                          idx === 0 ? "bg-yellow-500 text-yellow-900" :
                          idx === 1 ? "bg-slate-300 text-slate-700" :
                          idx === 2 ? "bg-orange-600 text-orange-100" :
                          "bg-white/10 text-white"
                        }`}>
                          {idx < 3 ? ["🥇", "🥈", "🥉"][idx] : `#${idx + 1}`}
                        </div>
                        <div>
                          <p className="text-white font-bold text-lg">{p.name}</p>
                          <p className="text-slate-400 text-xs">{getGradeLabel(p.grade)} • {p.gamesPlayed.length} لعبة</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-yellow-300 text-2xl font-bold">{p.bestScore}</p>
                          <p className="text-slate-400 text-xs">أعلى نقاط</p>
                        </div>
                        <div className="text-center hidden md:block">
                          <p className="text-green-300 text-lg font-bold">{p.gamesPlayed.filter(g => g.won).length}</p>
                          <p className="text-slate-400 text-xs">مرات فوز</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-slate-800 rounded-2xl border border-white/10 p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <p className="text-4xl mb-3">⚠️</p>
              <h3 className="text-white font-bold text-lg mb-2">تأكيد الحذف</h3>
              <p className="text-slate-300 text-sm mb-6">هل أنت متأكد من حذف هذا اللاعب وجميع بياناته؟</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDeletePlayer(showDeleteConfirm)}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all"
                >
                  نعم، احذف
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirm Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowClearConfirm(false)}>
          <div className="bg-slate-800 rounded-2xl border border-white/10 p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <p className="text-4xl mb-3">🚨</p>
              <h3 className="text-white font-bold text-lg mb-2">تأكيد مسح جميع البيانات</h3>
              <p className="text-slate-300 text-sm mb-6">هل أنت متأكد من مسح جميع اللاعبين وبياناتهم؟ لا يمكن التراجع عن هذا الإجراء!</p>
              <div className="flex gap-3">
                <button
                  onClick={handleClearAll}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all"
                >
                  نعم، امسح الكل
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-5 hover:bg-white/8 transition-all">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-2xl mb-3 shadow-lg`}>
        {icon}
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-slate-400 text-sm">{label}</p>
    </div>
  );
}
