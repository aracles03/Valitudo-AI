import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

// nilai harus sama dengan kelas CSS motivation-card yang sudah ada
export const MOTIVATION_COLORS = [
  ['green', 'Hijau'], ['orange', 'Oranye'], ['cyan', 'Biru muda'],
  ['pink', 'Merah muda'], ['lavender', 'Ungu'], ['yellow', 'Kuning'],
];

export async function fetchMotivations() {
  const { data, error } = await supabase
    .from('motivations')
    .select('id, emoji, message, color, sort_order')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveMotivation(m) {
  const row = {
    emoji: m.emoji.trim(),
    message: m.message.trim(),
    color: m.color,
    sort_order: Number(m.sortOrder) || 0,
  };
  const res = m.id
    ? await supabase.from('motivations').update(row).eq('id', m.id)
    : await supabase.from('motivations').insert(row);
  if (res.error) throw res.error;
}

export async function deleteMotivation(id) {
  const { error } = await supabase.from('motivations').delete().eq('id', id);
  if (error) throw error;
}

export function useMotivations() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    try {
      setItems(await fetchMotivations());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { items, loading, reload };
}