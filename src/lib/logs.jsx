import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

// ===== Target dan skor (boleh diubah) =====
export const DAILY_KCAL_TARGET = 2000;
export const DAILY_GLASS_TARGET = 8;
export const MOOD_OPTIONS = [['😊','Senang'],['😢','Sedih'],['😞','Kecewa'],['🙏','Bersyukur'],['😡','Marah']];
export const MOOD_SCORE = { Senang: 100, Bersyukur: 90, Sedih: 40, Kecewa: 30, Marah: 20 };

const DAY_MS = 24 * 60 * 60 * 1000;

export function todayStr(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function shiftDay(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return todayStr(d);
}

function computeStreak(rows) {
  if (!rows.length) return 0;
  const latest = rows.reduce((a, b) => (new Date(b.created_at) > new Date(a.created_at) ? b : a));
  // streak mati jika sudah lebih dari 24 jam tanpa input
  if (Date.now() - new Date(latest.created_at).getTime() > DAY_MS) return 0;
  const dates = new Set(rows.map(r => r.log_date));
  let count = 0;
  let cursor = latest.log_date;
  while (dates.has(cursor)) {
    count++;
    cursor = shiftDay(cursor, -1);
  }
  return count;
}

function computeSummary(rows) {
  const today = todayStr();
  const todays = rows.filter(r => r.log_date === today);
  const kcal = todays.filter(r => r.kind === 'meal').reduce((sum, r) => sum + (r.kcal || 0), 0);
  const glasses = todays.filter(r => r.kind === 'water').length;
  const latestMood = todays
    .filter(r => r.kind === 'mood')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  const mood = latestMood?.label ?? null;

  const nutritionPct = Math.min(100, Math.round((kcal / DAILY_KCAL_TARGET) * 100));
  const hydrationPct = Math.min(100, Math.round((glasses / DAILY_GLASS_TARGET) * 100));
  const moodPct = mood ? (MOOD_SCORE[mood] ?? 50) : 0;

  const hasData = kcal > 0 || glasses > 0 || !!mood;
  const avg = Math.round((nutritionPct + hydrationPct + moodPct) / 3);
  const balance = !hasData ? 'Belum ada' : avg >= 70 ? 'Good' : avg >= 40 ? 'Cukup' : 'Perlu perhatian';

  return { kcal, glasses, mood, nutritionPct, hydrationPct, moodPct, balance, streak: computeStreak(rows) };
}

const LogsContext = createContext(null);

export function LogsProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [rows, setRows] = useState([]);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!userId) { setRows([]); return; }
    // 60 hari terakhir, cukup untuk menghitung streak
    const since = shiftDay(todayStr(), -60);
    const { data, error } = await supabase
      .from('daily_logs')
      .select('id, kind, label, kcal, log_date, created_at')
      .gte('log_date', since)
      .order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    setRows(data ?? []);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // real time: muat ulang setiap ada perubahan data milik user ini
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('daily-logs-' + userId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_logs', filter: `user_id=eq.${userId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, load]);

  // cek ulang tiap menit supaya streak mati tepat setelah 24 jam
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const summary = useMemo(() => computeSummary(rows), [rows, tick]);

  const addLog = async ({ kind, label = null, kcal = 0 }) => {
    const { error } = await supabase
      .from('daily_logs')
      .insert({ kind, label, kcal, log_date: todayStr() });
    if (error) throw error;
    await load();
  };

  const removeLog = async id => {
    const { error } = await supabase.from('daily_logs').delete().eq('id', id);
    if (error) throw error;
    await load();
  };

  return (
    <LogsContext.Provider value={{ rows, summary, addLog, removeLog }}>
      {children}
    </LogsContext.Provider>
  );
}

export function useLogs() {
  return useContext(LogsContext);
}