import { createClient } from 'npm:@supabase/supabase-js@2';

const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.8-flash';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const MEAL_TIMES = ['Sarapan', 'Makan siang', 'Makan malam', 'Camilan'];
const MOODS = ['Senang', 'Sedih', 'Kecewa', 'Bersyukur', 'Marah'];

const SYSTEM = `Kamu adalah Valitudo Assistant, asisten kesehatan umum di aplikasi Valitudo. Jawab dalam bahasa Indonesia yang hangat dan sederhana, kecuali pengguna menulis dalam bahasa lain. Jawaban singkat, beberapa kalimat, kecuali diminta lebih panjang.

Batasan:
- Berikan informasi kesehatan umum tentang nutrisi, tidur, olahraga, dan kebiasaan sehat. Kamu bukan dokter dan tidak memberi diagnosis.
- Jangan memberi dosis obat atau menyarankan obat tertentu.
- Jangan memberi target kalori ekstrem atau diet yang membatasi makan secara drastis. Jika pengguna bercerita tentang makan terlalu sedikit, memuntahkan makanan, atau makan berlebihan yang sulit dikendalikan, tanggapi dengan empati dan sarankan berbicara dengan dokter atau ahli gizi. Jangan memberi tips diet untuk kondisi itu.
- Jika pengguna menyebut gejala berat (nyeri dada, sesak napas, pingsan, perdarahan hebat) atau ingin menyakiti diri sendiri, minta mereka segera menghubungi 112 atau 119, atau orang terpercaya di sekitar mereka.

Penggunaan alat:
- Gunakan get_today_summary atau get_meal_plan jika pengguna bertanya tentang catatan atau rencananya, lalu jawab berdasarkan hasilnya. Jangan mengarang data.
- Gunakan log_water, log_meal, atau log_mood hanya jika pengguna jelas meminta untuk mencatat. Setelah mencatat, konfirmasi singkat apa yang tersimpan.
- Jika kalori makanan tidak disebutkan, berikan perkiraan dan katakan bahwa itu perkiraan.`;

// format function declaration Gemini
const TOOLS = [
  {
    name: 'get_today_summary',
    description: 'Ringkasan catatan hari ini: total kkal makanan, daftar makanan, jumlah gelas air, dan mood terakhir.',
  },
  {
    name: 'get_meal_plan',
    description: 'Rencana makan mingguan pengguna. Kosongkan day untuk melihat semua hari.',
    parameters: { type: 'object', properties: { day: { type: 'string', enum: DAYS } } },
  },
  {
    name: 'log_water',
    description: 'Mencatat gelas air minum hari ini. Hanya dipakai jika pengguna meminta.',
    parameters: {
      type: 'object',
      properties: { glasses: { type: 'integer', minimum: 1, maximum: 10 } },
      required: ['glasses'],
    },
  },
  {
    name: 'log_meal',
    description: 'Mencatat makanan yang sudah dimakan hari ini. Hanya dipakai jika pengguna meminta.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        kcal: { type: 'integer', minimum: 0, maximum: 5000 },
        meal_time: { type: 'string', enum: MEAL_TIMES },
      },
      required: ['name', 'kcal', 'meal_time'],
    },
  },
  {
    name: 'log_mood',
    description: 'Mencatat mood hari ini. Hanya dipakai jika pengguna meminta.',
    parameters: {
      type: 'object',
      properties: { mood: { type: 'string', enum: MOODS } },
      required: ['mood'],
    },
  },
];

type Msg = { role: 'user' | 'assistant'; content: string };

function cleanHistory(list: unknown): Msg[] {
  if (!Array.isArray(list)) return [];
  const out: Msg[] = [];
  for (const m of list.slice(-20)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') continue;
    const text = m.content.trim().slice(0, 2000);
    if (!text) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += '\n' + text;
    else out.push({ role: m.role, content: text });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

async function runTool(name: string, input: any, sb: any, today: string) {
  if (name === 'get_today_summary') {
    const { data, error } = await sb
      .from('daily_logs')
      .select('kind, label, kcal, created_at')
      .eq('log_date', today)
      .order('created_at', { ascending: true });
    if (error) return { error: error.message };
    const meals = data.filter((r: any) => r.kind === 'meal');
    const moods = data.filter((r: any) => r.kind === 'mood');
    return {
      date: today,
      total_kcal: meals.reduce((s: number, r: any) => s + (r.kcal || 0), 0),
      meals: meals.map((r: any) => ({ label: r.label, kcal: r.kcal })),
      glasses_of_water: data.filter((r: any) => r.kind === 'water').length,
      water_target: 8,
      mood: moods.length ? moods[moods.length - 1].label : null,
    };
  }

  if (name === 'get_meal_plan') {
    let q = sb.from('meal_plans').select('day_name, meal_time, name, note').order('created_at', { ascending: true });
    if (DAYS.includes(input?.day)) q = q.eq('day_name', input.day);
    const { data, error } = await q;
    if (error) return { error: error.message };
    return { plans: data };
  }

  if (name === 'log_water') {
    const n = Math.min(Math.max(Math.round(Number(input?.glasses) || 1), 1), 10);
    const rows = Array.from({ length: n }, () => ({ kind: 'water', log_date: today, kcal: 0 }));
    const { error } = await sb.from('daily_logs').insert(rows);
    if (error) return { error: error.message };
    return { saved: `${n} gelas air` };
  }

  if (name === 'log_meal') {
    const food = String(input?.name ?? '').trim().slice(0, 100);
    if (!food) return { error: 'nama makanan kosong' };
    const time = MEAL_TIMES.includes(input?.meal_time) ? input.meal_time : 'Camilan';
    const kcal = Math.min(Math.max(Math.round(Number(input?.kcal) || 0), 0), 5000);
    const label = `${time}: ${food}`;
    const { error } = await sb.from('daily_logs').insert({ kind: 'meal', label, kcal, log_date: today });
    if (error) return { error: error.message };
    return { saved: label, kcal };
  }

  if (name === 'log_mood') {
    if (!MOODS.includes(input?.mood)) return { error: 'mood tidak valid' };
    const { error } = await sb.from('daily_logs').insert({ kind: 'mood', label: input.mood, kcal: 0, log_date: today });
    if (error) return { error: error.message };
    return { saved: input.mood };
  }

  return { error: 'alat tidak dikenal' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Metode tidak didukung.' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Silakan login terlebih dahulu.' }, 401);

  const body = await req.json().catch(() => null);
  const history = cleanHistory(body?.messages);
  if (!history.length) return json({ error: 'Pesan kosong.' }, 400);

  const today = /^\d{4}-\d{2}-\d{2}$/.test(body?.today ?? '')
    ? body.today
    : new Date().toISOString().slice(0, 10);

  // client dengan token pengguna, sehingga RLS berlaku
  const sb = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userData.user) return json({ error: 'Sesi berakhir. Silakan login ulang.' }, 401);

  const system = `${SYSTEM}\n\nTanggal hari ini: ${today}.`;

  // Gemini memakai role "model", bukan "assistant"
  const contents: any[] = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  for (let step = 0; step < 5; step++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          tools: [{ functionDeclarations: TOOLS }],
          generationConfig: { maxOutputTokens: 2048 },
        }),
      },
    );

    if (!res.ok) {
      console.error('Gemini error', res.status, await res.text());
      return json({ error: 'Asisten sedang tidak tersedia. Coba lagi sebentar.' }, 502);
    }

    const data = await res.json();
    const content = data.candidates?.[0]?.content;
    const parts: any[] = content?.parts ?? [];
    const calls = parts.filter((p) => p.functionCall);

    if (!calls.length) {
      const reply = parts
        .filter((p) => typeof p.text === 'string' && !p.thought)
        .map((p) => p.text)
        .join('\n')
        .trim();
      return json({ reply: reply || 'Maaf, aku belum bisa menjawab itu. Coba tulis ulang pertanyaanmu.' });
    }

    // kirim balik konten model apa adanya (termasuk metadata dari Gemini)
    contents.push(content);

    const responses: any[] = [];
    for (const p of calls) {
      const output = await runTool(p.functionCall.name, p.functionCall.args ?? {}, sb, today);
      responses.push({ functionResponse: { name: p.functionCall.name, response: { result: output } } });
    }
    contents.push({ role: 'user', parts: responses });
  }

  return json({ reply: 'Maaf, permintaanmu belum selesai diproses. Coba tulis ulang dengan lebih singkat.' });
});