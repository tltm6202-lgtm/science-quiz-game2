export interface PlayerRecord {
  id: string;
  name: string;
  phone: string;
  grade: string;
  gradeLabel: string;
  registeredAt: string;
  gamesPlayed: GameRecord[];
}

export interface GameRecord {
  id: string;
  grade: string;
  gradeLabel: string;
  score: number;
  totalQuestions: number;
  bestStreak: number;
  won: boolean;
  playedAt: string;
  percentage: number;
}

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "teacher2024";
const STORAGE_KEY = "science_quiz_players";

export function getPlayers(): PlayerRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {
    // ignore
  }
  return [];
}

export function savePlayers(players: PlayerRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

export function registerPlayer(name: string, phone: string, grade: string, gradeLabel: string): PlayerRecord {
  const players = getPlayers();
  // Check if player already exists by phone
  const existing = players.find(p => p.phone === phone);
  if (existing) {
    existing.name = name;
    existing.grade = grade;
    existing.gradeLabel = gradeLabel;
    savePlayers(players);
    return existing;
  }
  
  const newPlayer: PlayerRecord = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    name,
    phone,
    grade,
    gradeLabel,
    registeredAt: new Date().toISOString(),
    gamesPlayed: [],
  };
  players.push(newPlayer);
  savePlayers(players);
  return newPlayer;
}

export function addGameRecord(playerId: string, record: Omit<GameRecord, "id">): void {
  const players = getPlayers();
  const player = players.find(p => p.id === playerId);
  if (player) {
    player.gamesPlayed.push({
      ...record,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    });
    savePlayers(players);
  }
}

export function deletePlayer(playerId: string): void {
  const players = getPlayers().filter(p => p.id !== playerId);
  savePlayers(players);
}

export function clearAllPlayers(): void {
  savePlayers([]);
}

export function validateAdmin(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

export function getStats() {
  const players = getPlayers();
  const totalPlayers = players.length;
  const totalGames = players.reduce((acc, p) => acc + p.gamesPlayed.length, 0);
  const totalWins = players.reduce((acc, p) => acc + p.gamesPlayed.filter(g => g.won).length, 0);
  const avgScore = totalGames > 0
    ? Math.round(players.reduce((acc, p) => acc + p.gamesPlayed.reduce((a, g) => a + g.percentage, 0), 0) / totalGames)
    : 0;
  
  const gradeStats: Record<string, { players: number; games: number; wins: number; avgScore: number }> = {};
  
  players.forEach(p => {
    p.gamesPlayed.forEach(g => {
      if (!gradeStats[g.gradeLabel]) {
        gradeStats[g.gradeLabel] = { players: 0, games: 0, wins: 0, avgScore: 0 };
      }
      gradeStats[g.gradeLabel].games++;
      if (g.won) gradeStats[g.gradeLabel].wins++;
      gradeStats[g.gradeLabel].avgScore += g.percentage;
    });
  });

  // Count unique players per grade
  players.forEach(p => {
    if (!gradeStats[p.gradeLabel]) {
      gradeStats[p.gradeLabel] = { players: 0, games: 0, wins: 0, avgScore: 0 };
    }
    gradeStats[p.gradeLabel].players++;
  });

  Object.values(gradeStats).forEach(gs => {
    gs.avgScore = gs.games > 0 ? Math.round(gs.avgScore / gs.games) : 0;
  });

  // Top players
  const topPlayers = [...players]
    .map(p => ({
      ...p,
      bestScore: p.gamesPlayed.length > 0 ? Math.max(...p.gamesPlayed.map(g => g.score)) : 0,
      totalScore: p.gamesPlayed.reduce((acc, g) => acc + g.score, 0),
    }))
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, 10);

  return { totalPlayers, totalGames, totalWins, avgScore, gradeStats, topPlayers };
}
