import { useEffect, useState } from 'react';
import { supabase } from './supabase';

const columns = 'id, slug, title, category, excerpt, body, image_url, published_at';

export function formatDate(value) {
  return new Date(value + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toArticle(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    excerpt: row.excerpt ?? '',
    body: row.body ?? '',
    image: row.image_url ?? '',
    publishedAt: row.published_at,
    date: formatDate(row.published_at),
  };
}

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function fetchArticles() {
  const { data, error } = await supabase
    .from('articles')
    .select(columns)
    .order('published_at', { ascending: false });
  if (error) throw error;
  return data.map(toArticle);
}

export async function fetchArticleBySlug(slug) {
  const { data, error } = await supabase
    .from('articles')
    .select(columns)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data ? toArticle(data) : null;
}

export async function saveArticle(a) {
  const row = {
    slug: a.slug,
    title: a.title,
    category: a.category,
    excerpt: a.excerpt,
    body: a.body,
    image_url: a.image,
    published_at: a.publishedAt,
  };
  const res = a.id
    ? await supabase.from('articles').update(row).eq('id', a.id)
    : await supabase.from('articles').insert(row);
  if (res.error) throw res.error;
}

export async function deleteArticle(id) {
  const { error } = await supabase.from('articles').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadArticleImage(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from('article-images')
    .upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('article-images').getPublicUrl(path).data.publicUrl;
}

export function useArticles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetchArticles()
      .then(d => active && setArticles(d))
      .catch(err => console.error(err))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);
  return { articles, loading };
}

export function useArticle(slug) {
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchArticleBySlug(slug)
      .then(a => active && setArticle(a))
      .catch(err => console.error(err))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [slug]);
  return { article, loading };
}