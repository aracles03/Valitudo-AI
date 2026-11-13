import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Home, Newspaper, Brain, Sparkles, Utensils, UserCircle, BookOpen, Smile, PenTool, Search, Send, Mic, Save, Trash2, LogOut, Eye, EyeOff } from 'lucide-react';
import './styles.css';
import logo from './assets/logo.png';
import homeBanner from './assets/home-banner.png';
import runnerCutout from './assets/runner-cutout.png';
import { supabase } from './lib/supabase';
import { AuthProvider, useAuth } from './lib/auth';
import { useArticles, useArticle, fetchArticles, saveArticle, deleteArticle, uploadArticleImage, slugify } from './lib/articles';
import { LogsProvider, useLogs, todayStr, shiftDay, DAILY_GLASS_TARGET, MOOD_OPTIONS } from './lib/logs';
import { useMealPlan, DAYS, MEAL_TIMES } from './lib/mealPlan';
import { useMotivations, saveMotivation, deleteMotivation, MOTIVATION_COLORS } from './lib/motivations';

const navItems = [
  ['/home', Home], ['/news', Newspaper], ['/mental', Brain], ['/ai', Sparkles], ['/nutrition', Utensils]
];
const extraItems = [['/journal', BookOpen], ['/mood', Smile], ['/motivation', Sparkles], ['/drawing', PenTool]];

function Protected({children}){const {loading,session}=useAuth();if(loading)return <LoadingPage/>;return session?children:<Navigate to="/login" replace/>}
function PublicOnly({children}){const {loading,session}=useAuth();if(loading)return <LoadingPage/>;return session?<Navigate to="/home" replace/>:children}

function App(){
  const [loading,setLoading]=useState(true);
  useEffect(()=>{const t=setTimeout(()=>setLoading(false),1200);return()=>clearTimeout(t)},[]);
  if(loading) return <LoadingPage/>;
  return <Routes>
    <Route path="/login" element={<PublicOnly><Auth type="login"/></PublicOnly>} />
    <Route path="/register" element={<PublicOnly><Auth type="register"/></PublicOnly>} />
    <Route path="/*" element={<Protected><Shell/></Protected>} />
  </Routes>;
}

function LoadingPage(){return <div className="loading-page"><div className="loading-particles"/><div className="loading-orbit"><span className="loading-ring"/><img src={logo} alt="Valitudo"/></div><div className="loading-wordmark">VALITUDO</div><p>Your everyday space for better health.</p><div className="loading-line"><span/></div></div>}

function Shell(){
  const loc=useLocation();
  return <div className="app-shell"><Sidebar/><main className="page"><div key={loc.pathname} className="route-view"><Routes>
    <Route path="/home" element={<HomePage/>}/><Route path="/news" element={<NewsPage/>}/><Route path="/mental" element={<MentalPage/>}/>
    <Route path="/ai" element={<AIPage/>}/><Route path="/nutrition" element={<NutritionPage/>}/><Route path="/profile" element={<ProfilePage/>}/><Route path="/article/:slug" element={<ArticleDetailPage/>}/>
    <Route path="/admin" element={<AdminArticlesPage/>}/>
    <Route path="/admin/motivasi" element={<AdminMotivationPage/>}/>
    <Route path="/journal" element={<JournalPage/>}/><Route path="/mood" element={<MoodPage/>}/><Route path="/motivation" element={<MotivationPage/>}/><Route path="/drawing" element={<DrawingPage/>}/>
    <Route path="*" element={<Navigate to="/home" replace/>}/>
  </Routes></div></main></div>;
}

function Sidebar(){
  const nav=useNavigate(), loc=useLocation();
  const {isAdmin,signOut}=useAuth();
  const active=p=>loc.pathname===p;
  const logout=async()=>{await signOut();nav('/login',{replace:true})};
  return <aside className="sidebar">
    <button className="sidebar-logo" onClick={()=>nav('/home')} aria-label="Valitudo"><img src={logo}/></button>
    <div className="side-nav">
      {navItems.map(([path,Icon])=><button key={path} className={active(path)?'side-btn active':'side-btn'} onClick={()=>nav(path)}><Icon/></button>)}
      {isAdmin&&<button className={active('/admin')?'side-btn active':'side-btn'} onClick={()=>nav('/admin')} aria-label="Kelola artikel"><PenTool/></button>}
    </div>
    <div className="sidebar-bottom">
      <button className="profile-short login-short" onClick={logout} aria-label="Log out">
        <UserCircle/><small>LOG OUT</small>
      </button>
      <button className="register-short" onClick={async()=>{await signOut();nav('/register',{replace:true})}}>Don't have an account? <b>Register now</b></button>
    </div>
  </aside>;
}

function Footer(){return <footer className="site-footer">
  <div className="footer-main">
    <div className="footer-brand">Valitudo</div>
    <p>Teman harian untuk hidup lebih sehat.</p>
    <small>© 2026 Valitudo. Informasi di aplikasi ini bukan pengganti saran dokter.</small>
  </div>
  <div className="footer-col"><strong>Tautan</strong><button>Tentang kami</button><button>Kebijakan privasi</button><button>Syarat penggunaan</button></div>
  <div className="footer-col"><strong>Bantuan</strong><button>halo@valitudo.id</button><button>Instagram</button><button>Pusat bantuan</button></div>
</footer>}
function Reveal({children,className=''}){const ref=useRef(null);useEffect(()=>{const el=ref.current;if(!el)return;const obs=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){el.classList.add('is-visible');obs.unobserve(el)}},{threshold:.12,rootMargin:'0px 0px -40px 0px'});obs.observe(el);return()=>obs.disconnect()},[]);return <div ref={ref} className={'reveal '+className}>{children}</div>}
function Page({children,title}){const particleCount=22;return <div className="content"><div className="page-particles" aria-hidden="true">{Array.from({length:particleCount},(_,i)=><span key={i} className={'abstract-particle p-'+(i+1)}/>)}</div>{title&&<Reveal><h1 className="page-title">{title}</h1></Reveal>}{children}</div>}
function Chips({items=['Semua','Gizi','Tidur','Olahraga','Mental'], value, onChange}){const [internal,setInternal]=useState(items[0]);const selected=value??internal;const choose=x=>{setInternal(x);onChange?.(x)};return <div className="chips">{items.map(x=><button key={x} className={selected===x?'selected':''} onClick={()=>choose(x)}>{x}</button>)}</div>}

function HomePage(){const {articles,loading}=useArticles();const {summary:s}=useLogs();const [category,setCategory]=useState('Semua');const intro=sessionStorage.getItem('valitudo-login-transition')==='1';useEffect(()=>{if(intro){sessionStorage.removeItem('valitudo-login-transition')}},[intro]);const filtered=category==='Semua'?articles:articles.filter(a=>a.category===category);const today=new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'short'});return <Page><div className={'home-page '+(intro?'home-intro':'')}><Reveal><div className="home-banner"><img src={homeBanner} alt="Life good. Be healthy."/><div className="runner-stage" aria-hidden="true"><img src={runnerCutout} alt=""/></div></div></Reveal><div className="home-layout"><Reveal className="today-reveal"><aside className="today"><div className="today-head"><h2>Hari ini</h2><span className="today-date">{today}</span></div><div className="today-stats"><Stat value={s.kcal} label="kkal dikonsumsi"/><Stat value={`${s.glasses} gelas`} label="air minum"/><Stat value={s.mood||'Belum diisi'} label="suasana hati"/></div><div className="today-balance"><div className="today-balance-head"><span>Daily balance</span><b style={s.balance==='Belum ada'?{opacity:.5}:undefined}>{s.balance}</b></div><div className="balance-row"><span>Nutrition</span><i><em style={{width:s.nutritionPct+'%'}}/></i></div><div className="balance-row"><span>Hydration</span><i><em style={{width:s.hydrationPct+'%'}}/></i></div><div className="balance-row"><span>Mood</span><i><em style={{width:s.moodPct+'%'}}/></i></div></div><div className="today-streak"><div><span>Weekly streak</span><strong>{s.streak} days</strong></div><div className="streak-dots">{Array.from({length:7},(_,i)=><i key={i} style={{background:i<s.streak?'#3d6b45':'#d5ddd3'}}/>)}</div></div></aside></Reveal><section className="home-articles"><Reveal><h2>Artikel pilihan</h2></Reveal><Reveal><Chips value={category} onChange={setCategory}/></Reveal><div className="article-grid">{filtered.map(a=><Reveal key={a.slug} className="article-reveal"><ArticleCard data={a}/></Reveal>)}</div>{loading?<div className="empty-state">Memuat artikel...</div>:filtered.length===0&&<div className="empty-state">Belum ada artikel untuk kategori ini.</div>}</section></div><Footer/></div></Page>}
function Stat({value,label}){const match=String(value).match(/^(\d[\d.]*)/);const target=match?Number(match[1].replaceAll('.','')):null;const suffix=match?String(value).slice(match[1].length):'';const [count,setCount]=useState(target?0:null);useEffect(()=>{if(target===null)return;let start=0;let raf;const duration=2100;const t0=performance.now();const tick=now=>{const progress=Math.min((now-t0)/duration,1);const eased=1-Math.pow(1-progress,3);setCount(Math.floor(target*eased));if(progress<1)raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)},[target]);return <div className="stat"><strong>{target!==null?`${(count??0).toLocaleString('id-ID')}${suffix}`:value}</strong><span>{label}</span></div>}
function ArticleCard({data}){const nav=useNavigate();return <button className="article-card" onClick={()=>nav('/article/'+data.slug)}><img className="article-image" src={data.image} alt={data.title}/><div className="article-copy"><div className="article-category">{data.category}</div><h3>{data.title}</h3><p>{data.excerpt}</p><span>{data.date}</span></div></button>}

function ArticleDetailPage(){const {slug}=useParams();const {article,loading}=useArticle(slug);const nav=useNavigate();if(loading)return <Page><p className="subhead">Memuat artikel...</p></Page>;if(!article)return <Navigate to="/news" replace/>;return <Page><Reveal><button className="back-button" onClick={()=>nav(-1)}>← Kembali ke artikel</button></Reveal><Reveal><article className="article-detail"><img src={article.image} alt={article.title}/><div className="article-detail-body"><div className="article-category">{article.category} · {article.date}</div><h1>{article.title}</h1><p className="article-lead">{article.excerpt}</p>{article.body.split('\n\n').map((p,i)=><p key={i}>{p}</p>)}</div></article></Reveal><Footer/></Page>}

function NewsPage(){const {articles,loading}=useArticles();const [search,setSearch]=useState('');const [category,setCategory]=useState('Semua');const filtered=articles.filter(a=>(category==='Semua'||a.category===category)&&(a.title+' '+a.category).toLowerCase().includes(search.toLowerCase()));return <Page title="Berita kesehatan"><Reveal><div className="news-tools"><div className="search"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari artikel..."/></div><Chips value={category} onChange={setCategory}/></div></Reveal><div className="article-grid news-grid">{filtered.map(a=><Reveal key={a.slug}><ArticleCard data={a}/></Reveal>)}</div>{loading?<div className="empty-state">Memuat artikel...</div>:filtered.length===0&&<div className="empty-state">Artikel tidak ditemukan.</div>}<Footer/></Page>}

function MentalPage(){const nav=useNavigate();const [mood,setMood]=useState(0);const moods=['😊','😌','😴','😎','🥰','🤔','😄'];useEffect(()=>{const t=setInterval(()=>setMood(v=>(v+1)%moods.length),420);return()=>clearInterval(t)},[]);const cards=[['Journaling','Tuliskan apa yang kamu rasakan hari ini.','Mulai menulis','/journal','green',BookOpen,'book','Ruang tenang untuk menuangkan isi pikiran.'],['Mood Tracker','Catat dan pantau mood kamu.','Catat mood','/mood','peach',Smile,'mood','Pilih suasana hati dan lihat polanya dari waktu ke waktu.'],['Motivation Word','Temukan kata-kata kecil yang menguatkan.','Buka kata','/motivation','cyan',Sparkles,'motivation','Satu kalimat sederhana untuk menemani langkahmu hari ini.'],['Drawing','Gambar bebas untuk melepas penat.','Mulai menggambar','/drawing','lavender',PenTool,'pencil','Coret, warna, dan lepaskan pikiran tanpa aturan.']];return <Page title="Solusi kesehatan mental"><Reveal><div className="mental-intro"><span>RUANG UNTUK DIRI SENDIRI</span><h2>Rawat pikiranmu, satu langkah kecil setiap hari.</h2><p>Pilih aktivitas yang paling sesuai dengan kebutuhanmu saat ini.</p></div></Reveal><div className="mental-grid">{cards.map(([t,d,b,p,c,I,kind,detail],i)=><Reveal key={t}><button className={'mental-card '+c} onClick={()=>nav(p)}><div className="mental-card-top"><span className={'mental-object '+kind}>{kind==='mood'?<span className="mood-face">{moods[mood]}</span>:<I/>}</span><span>0{i+1}</span></div><div className="mental-card-copy"><h3>{t}</h3><p>{d}</p><small>{detail}</small></div><span className="mental-card-action">{b}<span>→</span></span></button></Reveal>)}</div><Footer/></Page>}
function NutritionPage(){
  const {items,loading,addItem,updateItem,removeItem}=useMealPlan();
  const [day,setDay]=useState('Senin');
  const blank=d=>({name:'',time:'Sarapan',note:'',day:d});
  const [form,setForm]=useState(blank('Senin'));
  const [editingId,setEditingId]=useState(null);
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState('');

  const dayItems=items
    .filter(m=>m.day_name===day)
    .sort((a,b)=>MEAL_TIMES.indexOf(a.meal_time)-MEAL_TIMES.indexOf(b.meal_time)||new Date(a.created_at)-new Date(b.created_at));

  const chooseDay=d=>{setDay(d);setEditingId(null);setForm(blank(d));setMsg('')};
  const resetForm=()=>{setForm(blank(day));setEditingId(null);setMsg('')};
  const startEdit=m=>{setEditingId(m.id);setForm({name:m.name,time:m.meal_time,note:m.note??'',day:m.day_name});setMsg('')};

  const submit=async()=>{
    if(!form.name.trim()){setMsg('Isi nama menu dulu.');return}
    setBusy(true);setMsg('');
    try{
      if(editingId){await updateItem(editingId,form);setMsg('Menu diperbarui.')}
      else{await addItem(form);setMsg('Menu ditambahkan.')}
      setEditingId(null);setForm(blank(day));
    }catch(e){setMsg(e.message)}
    finally{setBusy(false)}
  };

  const remove=async m=>{
    if(!window.confirm(`Hapus "${m.name}"?`))return;
    setBusy(true);setMsg('');
    try{
      await removeItem(m.id);
      if(editingId===m.id)resetForm();
    }catch(e){setMsg(e.message)}
    finally{setBusy(false)}
  };

  return <Page title="Rencana makan mingguan"><TodayLog/>
    <div className="nutrition-planner">
      <div className="planner-top">
        <div><span className="eyebrow">PERENCANAAN</span><h2>Rencana makan mingguan</h2><p>Mulai dari kosong, lalu tambahkan menu sesuai kebutuhanmu.</p></div>
        <div className="planner-count"><strong>{items.length}</strong><span>menu tersimpan</span></div>
      </div>
      <div className="day-tabs">{DAYS.map(d=><button className={day===d?'active':''} onClick={()=>chooseDay(d)} key={d}>{d}</button>)}</div>
      <div className="planner-body">
        <section className="meal-empty">
          {loading?<p>Memuat rencana...</p>:dayItems.length===0?<>
            <div className="empty-icon"><Utensils/></div>
            <h3>Belum ada menu untuk {day}</h3>
            <p>Tambahkan sarapan, makan siang, makan malam, atau camilan untuk mengisi rencana hari ini.</p>
          </>:<div className="meal-list">{dayItems.map(m=><div className="planned-meal" key={m.id} style={editingId===m.id?{outline:'2px solid #2d5a36'}:undefined}>
            <div><span>{m.meal_time}</span><h3>{m.name}</h3>{m.note&&<p>{m.note}</p>}</div>
            <div className="admin-item-actions">
              <button className="plain-btn" onClick={()=>startEdit(m)} disabled={busy}>Edit</button>
              <button onClick={()=>remove(m)} disabled={busy} aria-label="Hapus menu"><Trash2/></button>
            </div>
          </div>)}</div>}
        </section>
        <aside className="add-meal-card">
          <span className="eyebrow">{editingId?'EDIT MENU':'TAMBAH MENU'}</span>
          <h3>{editingId?'Ubah rencana makan':'Isi rencana makan'}</h3>
          <label>Nama menu<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Contoh: Oatmeal pisang"/></label>
          <label>Hari<select value={form.day} onChange={e=>setForm({...form,day:e.target.value})}>{DAYS.map(d=><option key={d}>{d}</option>)}</select></label>
          <label>Waktu<select value={form.time} onChange={e=>setForm({...form,time:e.target.value})}>{MEAL_TIMES.map(t=><option key={t}>{t}</option>)}</select></label>
          <label>Catatan <span>(opsional)</span><input value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Porsi atau catatan"/></label>
          <button className="add-meal-btn" onClick={submit} disabled={busy}>{busy?'Menyimpan...':editingId?'Simpan perubahan':'+ Tambahkan menu'}</button>
          {editingId&&<button className="plain-btn" onClick={resetForm} disabled={busy}>Batal edit</button>}
          {msg&&<p className="admin-msg">{msg}</p>}
        </aside>
      </div>
    </div>
    <Footer/>
  </Page>;
}
function AIPage(){
  const [input,setInput]=useState('');
  const [messages,setMessages]=useState([]);
  const [typing,setTyping]=useState(false);
  const bottomRef=useRef(null);
  const timeNow=()=>new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  const readErr=async error=>{try{const j=await error.context.json();return j.error||error.message}catch{return error.message}};

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:'smooth'})},[messages,typing]);

  const send=async()=>{
    const q=input.trim();
    if(!q||typing)return;
    setInput('');
    const userMsg={id:Date.now(),from:'user',text:q,time:timeNow()};
    const next=[...messages,userMsg];
    setMessages(next);
    setTyping(true);
    const history=next
      .filter(m=>m.from==='user'||m.from==='bot')
      .map(m=>({role:m.from==='user'?'user':'assistant',content:m.text}));
    try{
      const {data,error}=await supabase.functions.invoke('chat-agent',{body:{messages:history,today:todayStr()}});
      if(error)throw new Error(await readErr(error));
      if(data?.error)throw new Error(data.error);
      setMessages(m=>[...m,{id:Date.now()+1,from:'bot',text:data.reply,time:timeNow()}]);
    }catch(err){
      console.error(err);
      setMessages(m=>[...m,{id:Date.now()+1,from:'error',text:err.message||'Gagal terhubung ke asisten.',time:timeNow()}]);
    }finally{
      setTyping(false);
    }
  };

  return <Page><div className="ipad-chat"><div className="ipad-frame"><div className="ipad-camera"/>
    <div className="wa-topbar"><div className="chat-avatar"><img src={logo} alt="Valitudo"/></div><div><strong>Valitudo Assistant</strong><span>online</span></div><div className="wa-actions"><Search/><span>•••</span></div></div>
    <div className="wa-chat-wall"><div className="chat-body">
      {messages.length===0&&!typing
        ?<div className="chat-welcome"><div className="welcome-icon"><Sparkles/></div><h2>How can I help you today?</h2><p>Ask about nutrition, sleep, exercise, or healthy daily habits.</p></div>
        :<div className="chat-messages">
          {messages.map(m=>m.from==='error'
            ?<div key={m.id} className="chat-bubble bot" style={{color:'#b42318'}}>{m.text}</div>
            :<div key={m.id} className={'chat-bubble '+m.from} style={{whiteSpace:'pre-wrap'}}>{m.text}<small>{m.time}</small></div>)}
          {typing&&<div className="typing-bubble"><i/><i/><i/></div>}
          <div ref={bottomRef}/>
        </div>}
    </div></div>
    <div className="chat-input">
      <button className="plus-btn" type="button" onClick={()=>setMessages([])} title="Percakapan baru" aria-label="Percakapan baru">+</button>
      <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Message"/>
      <button onClick={send} disabled={typing} aria-label="Kirim"><Send/></button>
    </div>
    <small className="chat-disclaimer">Valitudo provides general health information, not a medical diagnosis.</small>
  </div></div><Footer/></Page>;
}
function Auth({type}){
  const nav=useNavigate();
  const login=type==='login';
  const [show,setShow]=useState(false);
  const [leaving,setLeaving]=useState(false);
  const [busy,setBusy]=useState(false);
  const [errorMsg,setErrorMsg]=useState('');
  const [form,setForm]=useState({name:'',email:'',password:''});
  const submit=async e=>{
    e.preventDefault();
    setBusy(true);setErrorMsg('');
    const {data,error}=login
      ?await supabase.auth.signInWithPassword({email:form.email,password:form.password})
      :await supabase.auth.signUp({email:form.email,password:form.password,options:{data:{full_name:form.name}}});
    if(error){
      setBusy(false);
      setErrorMsg(error.message==='Invalid login credentials'?'Email atau password salah.':error.message);
      return;
    }
    if(!login&&!data.session){setBusy(false);setErrorMsg('Kami sudah mengirim email konfirmasi. Silakan cek kotak masuk kamu.');return}
    setLeaving(true);
    setTimeout(()=>{sessionStorage.setItem('valitudo-login-transition','1');nav('/home',{replace:true})},650);
  };
  return <div className={'auth-page '+(leaving?'auth-leaving':'')}><div className="auth-glow glow-one"/><div className="auth-glow glow-two"/><div className="auth-card"><div className="auth-visual"><div className="auth-logo-ring"><img src={logo} alt="Valitudo"/></div><div className="auth-wordmark">VALITUDO</div><p>Life good. Be healthy.</p><span className="auth-caption">A calmer way to take care of yourself.</span></div><form onSubmit={submit}><span className="auth-eyebrow">WELCOME BACK</span><h1>{login?'Welcome to Valitudo':'Create your Valitudo account'}</h1><p className="auth-subtitle">{login?'Continue your journey toward a healthier everyday life.':'Start building healthier habits in one simple space.'}</p>{!login&&<Field label="Full name" value={form.name} onChange={v=>setForm({...form,name:v})}/>}<Field label="Email" type="email" value={form.email} onChange={v=>setForm({...form,email:v})}/><div className="field"><label>Password</label><div className="password-wrap"><input required minLength={6} type={show?'text':'password'} value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><button type="button" onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</button></div></div>{errorMsg&&<p className="auth-error">{errorMsg}</p>}<button className="auth-submit" disabled={busy}>{busy?'Memproses...':(login?'Log in':'Create account')}<span>→</span></button><p className="auth-switch">{login?"Don't have an account?":'Already have an account?'} <button type="button" className="text-link" onClick={()=>nav(login?'/register':'/login')}>{login?'Register now':'Log in'}</button></p></form></div>{leaving&&<div className="login-transition"><div className="transition-orbit"><img src={logo}/></div><strong>VALITUDO</strong><span>Preparing your space...</span><div className="transition-line"><i/></div></div>}</div>;
}

function Field({label,value,onChange,type='text'}){return <div className="field"><label>{label}</label><input required type={type} value={value} onChange={e=>onChange(e.target.value)}/></div>}

function ProfilePage(){const nav=useNavigate();const {user,signOut}=useAuth();const [name,setName]=useState(user?.user_metadata?.full_name||'');const [saved,setSaved]=useState(false);const logout=async()=>{await signOut();nav('/login',{replace:true})};const save=async()=>{const {error}=await supabase.auth.updateUser({data:{full_name:name}});if(!error)setSaved(true)};return <Page title="Profil saya"><div className="profile-page"><div className="profile-hero"><div className="profile-avatar">{(name||'?').charAt(0).toUpperCase()}</div><div><span className="eyebrow">AKUN VALITUDO</span><h2>{name||'Pengguna'}</h2><p>Kelola informasi akun dan preferensimu.</p></div></div><div className="profile-form"><div className="profile-section-title"><div><h3>Informasi pribadi</h3><p>Perbarui data yang digunakan di akunmu.</p></div></div><Field label="Nama pengguna" value={name} onChange={v=>{setName(v);setSaved(false)}}/><Field label="Email" value={user?.email||''} onChange={()=>{}}/><Field label="Tanggal lahir" value="01/01/2000" onChange={()=>{}}/><div className="profile-actions"><button className="save-btn" onClick={save}><Save/>{saved?'Tersimpan':'Simpan perubahan'}</button><button className="plain-btn" onClick={logout}><LogOut/> Keluar</button></div></div></div><Footer/></Page>}

function JournalPage(){const [title,setTitle]=useState('Hari yang tenang');const [text,setText]=useState('');const [entries,setEntries]=useState(['Hari yang tenang','Bersyukur','Cakap tiap pagi','Rencana esok hari']);return <Page title="Journaling"><div className="journal-layout"><aside className="journal-list">{entries.map((e,i)=><button key={e} className={i===0?'selected':''}><b>{e}</b><span>Catatan kecil tentang hari ini...</span></button>)}</aside><section className="journal-paper"><h2>{title}</h2><div className="paper-lines"><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Tulis apa yang kamu rasakan hari ini..."/></div><div className="journal-actions"><button className="save-btn" onClick={()=>{if(text.trim()){setEntries([title,...entries]);setText('')}}}>Simpan</button><button className="plain-btn" onClick={()=>setText('')}>Batal</button></div></section></div><Footer/></Page>}
function MoodPage(){const {rows,summary,addLog}=useLogs();const [selected,setSelected]=useState(null);const [busy,setBusy]=useState(false);const [msg,setMsg]=useState('');const days=Array.from({length:7},(_,i)=>shiftDay(todayStr(),i-6));const moodOn=d=>rows.filter(r=>r.kind==='mood'&&r.log_date===d).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0]?.label;const save=async()=>{if(!selected)return;setBusy(true);setMsg('');try{await addLog({kind:'mood',label:selected});setSelected(null);setMsg('Mood tersimpan.')}catch(e){setMsg(e.message)}finally{setBusy(false)}};return <Page title="Mood Tracker"><p className="subhead">Catat dan pantau mood kamu. Pilih yang paling menggambarkan harimu.</p><div className="mood-grid">{MOOD_OPTIONS.map(([e,t])=><button className={selected===t?'selected':''} onClick={()=>setSelected(t)} key={t}><span>{e}</span><b>{t}</b></button>)}</div><div className="journal-actions"><button className="save-btn" onClick={save} disabled={!selected||busy}>{busy?'Menyimpan...':'Simpan mood'}</button>{msg&&<span className="admin-msg">{msg}</span>}</div><div className="mood-note">Mood hari ini: <b>{summary.mood||'belum diisi'}</b></div><h2 className="section-title">7 hari terakhir</h2><div className="week-grid">{days.map(d=>{const m=moodOn(d);const emoji=MOOD_OPTIONS.find(([,t])=>t===m)?.[0]??'–';return <div key={d}><small>{new Date(d+'T00:00:00').toLocaleDateString('id-ID',{weekday:'short'})}</small><span>{emoji}</span></div>})}</div><Footer/></Page>}
function TodayLog(){const {rows,summary,addLog,removeLog}=useLogs();const [name,setName]=useState('');const [kcal,setKcal]=useState('');const [time,setTime]=useState('Sarapan');const [busy,setBusy]=useState(false);const [msg,setMsg]=useState('');const today=todayStr();const meals=rows.filter(r=>r.kind==='meal'&&r.log_date===today).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));const water=rows.filter(r=>r.kind==='water'&&r.log_date===today).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));const run=async fn=>{setBusy(true);setMsg('');try{await fn()}catch(e){setMsg(e.message)}finally{setBusy(false)}};const addMeal=()=>{if(!name.trim()||!kcal){setMsg('Isi nama makanan dan jumlah kkal.');return}run(async()=>{await addLog({kind:'meal',label:`${time}: ${name.trim()}`,kcal:Number(kcal)});setName('');setKcal('')})};const addWater=()=>run(()=>addLog({kind:'water'}));const undoWater=()=>{if(water[0])run(()=>removeLog(water[0].id))};const deleteMeal=m=>run(()=>removeLog(m.id));return <div className="nutrition-planner today-log"><div className="planner-top"><div><span className="eyebrow">HARI INI</span><h2>Catat konsumsi</h2></div><div className="planner-count"><strong>{summary.kcal.toLocaleString('id-ID')}</strong><span>kkal hari ini</span></div></div><div className="planner-body"><section className="meal-empty"><h3>Air minum: {summary.glasses} / {DAILY_GLASS_TARGET} gelas</h3><div className="journal-actions"><button className="plain-btn" onClick={undoWater} disabled={busy||!water.length}>− Kurangi</button><button className="save-btn" onClick={addWater} disabled={busy}>+ Tambah gelas</button></div>{meals.length===0?<p>Belum ada makanan yang dicatat hari ini.</p>:<div className="meal-list">{meals.map(m=><div className="planned-meal" key={m.id}><div><span>{m.kcal} kkal</span><h3>{m.label}</h3></div><button onClick={()=>deleteMeal(m)} disabled={busy}><Trash2/></button></div>)}</div>}</section><aside className="add-meal-card"><span className="eyebrow">TAMBAH MAKANAN</span><h3>Catat makanan</h3><label>Nama makanan<input value={name} onChange={e=>setName(e.target.value)} placeholder="Contoh: Nasi goreng"/></label><label>Kalori (kkal)<input type="number" min="0" value={kcal} onChange={e=>setKcal(e.target.value)} placeholder="Contoh: 450"/></label><label>Waktu<select value={time} onChange={e=>setTime(e.target.value)}><option>Sarapan</option><option>Makan siang</option><option>Makan malam</option><option>Camilan</option></select></label><button className="add-meal-btn" onClick={addMeal} disabled={busy}>+ Catat makanan</button>{msg&&<p className="admin-msg">{msg}</p>}</aside></div></div>}
function MotivationPage(){const {items,loading}=useMotivations();return <Page title="Motivation Word"><p className="subhead">Kata-kata kecil untuk menemani harimu.</p><div className="motivation-grid">{items.map(m=><div className={'motivation-card '+m.color} key={m.id}><span>{m.emoji}</span><p>{m.message}</p></div>)}</div>{loading?<div className="empty-state">Memuat...</div>:items.length===0&&<div className="empty-state">Belum ada kata motivasi.</div>}<Footer/></Page>}
function DrawingPage(){const canvasRef=useRef(null);const [color,setColor]=useState('#8dbd50');const drawing=useRef(false);useEffect(()=>{const c=canvasRef.current,ctx=c.getContext('2d');ctx.lineCap='round';ctx.lineWidth=4;const pos=e=>{const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*(c.width/r.width),y:(e.clientY-r.top)*(c.height/r.height)}};const down=e=>{drawing.current=true;const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y)};const move=e=>{if(!drawing.current)return;const p=pos(e);ctx.strokeStyle=color;ctx.lineTo(p.x,p.y);ctx.stroke()};const up=()=>drawing.current=false;c.addEventListener('pointerdown',down);c.addEventListener('pointermove',move);window.addEventListener('pointerup',up);return()=>{c.removeEventListener('pointerdown',down);c.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)}},[color]);return <Page title="Drawing"><div className="drawing-head"><div className="color-dots">{['#8dbd50','#e2bd42','#e58b9b','#76b7bd','#8e7cc3'].map(c=><button key={c} style={{background:c}} className={color===c?'chosen':''} onClick={()=>setColor(c)}/>)}</div><button className="plain-btn" onClick={()=>canvasRef.current.getContext('2d').clearRect(0,0,canvasRef.current.width,canvasRef.current.height)}><Trash2/> Hapus</button></div><canvas ref={canvasRef} width="1080" height="530" className="drawing-canvas"/><Footer/></Page>}

function AdminTabs(){const nav=useNavigate(),loc=useLocation();return <div className="chips" style={{marginBottom:16}}><button className={loc.pathname==='/admin'?'selected':''} onClick={()=>nav('/admin')}>Artikel</button><button className={loc.pathname==='/admin/motivasi'?'selected':''} onClick={()=>nav('/admin/motivasi')}>Motivasi</button></div>}

function AdminMotivationPage(){
  const {isAdmin,adminLoading}=useAuth();
  const {items,loading,reload}=useMotivations();
  const blank={id:null,emoji:'🌿',message:'',color:'green',sortOrder:0};
  const [form,setForm]=useState(blank);
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState('');
  if(adminLoading)return <Page><p className="subhead">Memeriksa akses...</p></Page>;
  if(!isAdmin)return <Navigate to="/home" replace/>;
  const colorLabel=c=>MOTIVATION_COLORS.find(([v])=>v===c)?.[1]??c;
  const edit=m=>{setForm({id:m.id,emoji:m.emoji,message:m.message,color:m.color,sortOrder:m.sort_order});setMsg('')};
  const reset=()=>{setForm(blank);setMsg('')};
  const save=async e=>{
    e.preventDefault();
    if(!form.emoji.trim()||!form.message.trim()){setMsg('Emoji dan teks wajib diisi.');return}
    setBusy(true);setMsg('');
    try{
      await saveMotivation(form);
      setMsg(form.id?'Kata diperbarui.':'Kata ditambahkan.');
      setForm(blank);
      await reload();
    }catch(err){setMsg(err.message)}
    finally{setBusy(false)}
  };
  const remove=async m=>{
    if(!window.confirm('Hapus kata motivasi ini?'))return;
    setBusy(true);setMsg('');
    try{
      await deleteMotivation(m.id);
      if(form.id===m.id)setForm(blank);
      await reload();
    }catch(err){setMsg(err.message)}
    finally{setBusy(false)}
  };
  return <Page title="Kelola motivasi"><AdminTabs/>
    <div className="admin-layout">
      <section className="admin-list">
        <button className="save-btn" onClick={reset}>+ Kata baru</button>
        {loading?<p className="subhead">Memuat...</p>:items.map(m=><div className="admin-item" key={m.id}>
          <div><b>{m.emoji} {m.message}</b><span>{colorLabel(m.color)} · urutan {m.sort_order}</span></div>
          <div className="admin-item-actions">
            <button className="plain-btn" onClick={()=>edit(m)}>Edit</button>
            <button className="plain-btn" onClick={()=>remove(m)} aria-label="Hapus"><Trash2/></button>
          </div>
        </div>)}
      </section>
      <form className="admin-form" onSubmit={save}>
        <h3>{form.id?'Edit kata':'Kata baru'}</h3>
        <Field label="Emoji (ikon kartu)" value={form.emoji} onChange={v=>setForm({...form,emoji:v})}/>
        <Field label="Teks motivasi" value={form.message} onChange={v=>setForm({...form,message:v})}/>
        <div className="field"><label>Warna kartu</label><select value={form.color} onChange={e=>setForm({...form,color:e.target.value})}>{MOTIVATION_COLORS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
        <Field label="Urutan (angka kecil tampil lebih dulu)" type="number" value={form.sortOrder} onChange={v=>setForm({...form,sortOrder:v})}/>
        <p className="subhead">Pratinjau:</p>
        <div className="motivation-grid"><div className={'motivation-card '+form.color}><span>{form.emoji||'🌿'}</span><p>{form.message||'Teks motivasi akan tampil di sini.'}</p></div></div>
        <div className="journal-actions"><button className="save-btn" disabled={busy}>{busy?'Menyimpan...':'Simpan'}</button>{form.id&&<button type="button" className="plain-btn" onClick={reset} disabled={busy}>Batal edit</button>}</div>
        {msg&&<p className="admin-msg">{msg}</p>}
      </form>
    </div>
    <Footer/>
  </Page>;
}

function AdminArticlesPage(){
  const {isAdmin,adminLoading}=useAuth();
  const blank={id:null,slug:'',title:'',category:'Gizi',excerpt:'',body:'',image:'',publishedAt:new Date().toLocaleDateString('en-CA')};
  const [list,setList]=useState([]);
  const [form,setForm]=useState(blank);
  const [file,setFile]=useState(null);
  const [busy,setBusy]=useState(false);
  const [msg,setMsg]=useState('');
  const preview=useMemo(()=>file?URL.createObjectURL(file):'',[file]);
  const reload=()=>fetchArticles().then(setList).catch(e=>setMsg(e.message));
  useEffect(()=>{if(isAdmin)reload()},[isAdmin]);
  if(adminLoading)return <Page><p className="subhead">Memeriksa akses...</p></Page>;
  if(!isAdmin)return <Navigate to="/home" replace/>;
  const edit=a=>{setForm({...a});setFile(null);setMsg('')};
  const reset=()=>{setForm(blank);setFile(null)};
  const save=async e=>{
    e.preventDefault();
    setBusy(true);setMsg('');
    try{
      const image=file?await uploadArticleImage(file):form.image;
      await saveArticle({...form,image,slug:form.id?form.slug:slugify(form.title)});
      setMsg(form.id?'Artikel diperbarui.':'Artikel ditambahkan.');
      reset();reload();
    }catch(err){setMsg(err.message)}
    finally{setBusy(false)}
  };
  const remove=async a=>{
    if(!window.confirm(`Hapus artikel "${a.title}"?`))return;
    try{await deleteArticle(a.id);if(form.id===a.id)reset();reload()}catch(err){setMsg(err.message)}
  };
  return <Page title="Kelola artikel"><AdminTabs/>
    <div className="admin-layout">
      <section className="admin-list">
        <button className="save-btn" onClick={reset}>+ Artikel baru</button>
        {list.map(a=><div className="admin-item" key={a.id}>
          <div><b>{a.title}</b><span>{a.category} · {a.date}</span></div>
          <div className="admin-item-actions">
            <button className="plain-btn" onClick={()=>edit(a)}>Edit</button>
            <button className="plain-btn" onClick={()=>remove(a)}><Trash2/></button>
          </div>
        </div>)}
      </section>
      <form className="admin-form" onSubmit={save}>
        <h3>{form.id?'Edit artikel':'Artikel baru'}</h3>
        <Field label="Judul" value={form.title} onChange={v=>setForm({...form,title:v})}/>
        <div className="field"><label>Kategori</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{['Gizi','Tidur','Olahraga','Mental'].map(c=><option key={c}>{c}</option>)}</select></div>
        <Field label="Tanggal terbit" type="date" value={form.publishedAt} onChange={v=>setForm({...form,publishedAt:v})}/>
        <div className="field"><label>Ringkasan</label><textarea rows="3" value={form.excerpt} onChange={e=>setForm({...form,excerpt:e.target.value})}/></div>
        <div className="field"><label>Isi artikel <span>(pisahkan paragraf dengan baris kosong)</span></label><textarea rows="12" value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/></div>
        <div className="field"><label>Gambar (upload file)</label><input type="file" accept="image/*" onChange={e=>setFile(e.target.files[0]||null)}/></div>
        <div className="field"><label>atau tempel URL gambar</label><input value={form.image} onChange={e=>setForm({...form,image:e.target.value})}/></div>
        {(preview||form.image)&&<img className="admin-preview" src={preview||form.image} alt=""/>}
        <div className="journal-actions"><button className="save-btn" disabled={busy}>{busy?'Menyimpan...':'Simpan'}</button></div>
        {msg&&<p className="admin-msg">{msg}</p>}
      </form>
    </div>
    <Footer/>
  </Page>;
}

createRoot(document.getElementById('root')).render(<BrowserRouter><AuthProvider><LogsProvider><App/></LogsProvider></AuthProvider></BrowserRouter>);