import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

export const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
export const MEAL_TIMES = ['Sarapan', 'Makan siang', 'Makan malam', 'Camilan'];

export function useMealPlan() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('meal_plans')
      .select('id, day_name, meal_time, name, note, created_at, updated_at')
      .order('created_at', { ascending: true });
    if (error) console.error(error);
    else setItems(data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const addItem = async ({ day, time, name, note }) => {
    const { error } = await supabase.from('meal_plans').insert({
      day_name: day,
      meal_time: time,
      name: name.trim(),
      note: note?.trim() || null,
    });
    if (error) throw error;
    await load();
  };

  const updateItem = async (id, { day, time, name, note }) => {
    const { error } = await supabase
      .from('meal_plans')
      .update({
        day_name: day,
        meal_time: time,
        name: name.trim(),
        note: note?.trim() || null,
      })
      .eq('id', id);
    if (error) throw error;
    await load();
  };

  const removeItem = async id => {
    const { error } = await supabase.from('meal_plans').delete().eq('id', id);
    if (error) throw error;
    await load();
  };

  return { items, loading, addItem, updateItem, removeItem };
}