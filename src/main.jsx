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

function HomePage(){const {articles,loading}=useArticles();const [category,setCategory]=useState('Semua');const intro=sessionStorage.getItem('valitudo-login-transition')==='1';useEffect(()=>{if(intro){sessionStorage.removeItem('valitudo-login-transition')}},[intro]);const filtered=category==='Semua'?articles:articles.filter(a=>a.category===category);return <Page><div className={'home-page '+(intro?'home-intro':'')}><Reveal><div className="home-banner"><img src={homeBanner} alt="Life good. Be healthy."/><div className="runner-stage" aria-hidden="true"><img src={runnerCutout} alt=""/></div></div></Reveal><div className="home-layout"><Reveal className="today-reveal"><aside className="today"><div className="today-head"><h2>Hari ini</h2><span className="today-date">Rabu, 11 Nov</span></div><div className="today-stats"><Stat value="1.566" label="kkal dikonsumsi"/><Stat value="6 gelas" label="air minum"/><Stat value="Tenang" label="suasana hati"/></div><div className="today-balance"><div className="today-balance-head"><span>Daily balance</span><b>Good</b></div><div className="balance-row"><span>Nutrition</span><i><em style={{width:'82%'}}/></i></div><div className="balance-row"><span>Hydration</span><i><em style={{width:'70%'}}/></i></div><div className="balance-row"><span>Mood</span><i><em style={{width:'88%'}}/></i></div></div><div className="today-focus"><span>Today focus</span><div><b>01</b><p>Drink one more glass of water before lunch.</p></div><div><b>02</b><p>Take a short walk and give your eyes a break.</p></div><div><b>03</b><p>Keep tonight calm and make room for good sleep.</p></div></div><div className="today-streak"><div><span>Weekly streak</span><strong>4 days</strong></div><div className="streak-dots"><i/><i/><i/><i/><i/><i/><i/></div></div><div className="today-note"><span>Small step</span><p>Keep your routine simple today. Consistency matters more than perfection.</p></div></aside></Reveal><section className="home-articles"><Reveal><h2>Artikel pilihan</h2></Reveal><Reveal><Chips value={category} onChange={setCategory}/></Reveal><div className="article-grid">{filtered.map(a=><Reveal key={a.slug} className="article-reveal"><ArticleCard data={a}/></Reveal>)}</div>{loading?<div className="empty-state">Memuat artikel...</div>:filtered.length===0&&<div className="empty-state">Belum ada artikel untuk kategori ini.</div>}</section></div><Footer/></div></Page>}
function Stat({value,label}){const match=String(value).match(/^(\d[\d.]*)/);const target=match?Number(match[1].replaceAll('.','')):null;const suffix=match?String(value).slice(match[1].length):'';const [count,setCount]=useState(target?0:null);useEffect(()=>{if(target===null)return;let start=0;let raf;const duration=2100;const t0=performance.now();const tick=now=>{const progress=Math.min((now-t0)/duration,1);const eased=1-Math.pow(1-progress,3);setCount(Math.floor(target*eased));if(progress<1)raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)},[target]);return <div className="stat"><strong>{target!==null?`${(count??0).toLocaleString('id-ID')}${suffix}`:value}</strong><span>{label}</span></div>}
function ArticleCard({data}){const nav=useNavigate();return <button className="article-card" onClick={()=>nav('/article/'+data.slug)}><img className="article-image" src={data.image} alt={data.title}/><div className="article-copy"><div className="article-category">{data.category}</div><h3>{data.title}</h3><p>{data.excerpt}</p><span>{data.date}</span></div></button>}

function ArticleDetailPage(){const {slug}=useParams();const {article,loading}=useArticle(slug);const nav=useNavigate();if(loading)return <Page><p className="subhead">Memuat artikel...</p></Page>;if(!article)return <Navigate to="/news" replace/>;return <Page><Reveal><button className="back-button" onClick={()=>nav(-1)}>← Kembali ke artikel</button></Reveal><Reveal><article className="article-detail"><img src={article.image} alt={article.title}/><div className="article-detail-body"><div className="article-category">{article.category} · {article.date}</div><h1>{article.title}</h1><p className="article-lead">{article.excerpt}</p>{article.body.split('\n\n').map((p,i)=><p key={i}>{p}</p>)}</div></article></Reveal><Footer/></Page>}

function NewsPage(){const {articles,loading}=useArticles();const [search,setSearch]=useState('');const [category,setCategory]=useState('Semua');const filtered=articles.filter(a=>(category==='Semua'||a.category===category)&&(a.title+' '+a.category).toLowerCase().includes(search.toLowerCase()));return <Page title="Berita kesehatan"><Reveal><div className="news-tools"><div className="search"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari artikel..."/></div><Chips value={category} onChange={setCategory}/></div></Reveal><div className="article-grid news-grid">{filtered.map(a=><Reveal key={a.slug}><ArticleCard data={a}/></Reveal>)}</div>{loading?<div className="empty-state">Memuat artikel...</div>:filtered.length===0&&<div className="empty-state">Artikel tidak ditemukan.</div>}<Footer/></Page>}

function MentalPage(){const nav=useNavigate();const [mood,setMood]=useState(0);const moods=['😊','😌','😴','😎','🥰','🤔','😄'];useEffect(()=>{const t=setInterval(()=>setMood(v=>(v+1)%moods.length),420);return()=>clearInterval(t)},[]);const cards=[['Journaling','Tuliskan apa yang kamu rasakan hari ini.','Mulai menulis','/journal','green',BookOpen,'book','Ruang tenang untuk menuangkan isi pikiran.'],['Mood Tracker','Catat dan pantau mood kamu.','Catat mood','/mood','peach',Smile,'mood','Pilih suasana hati dan lihat polanya dari waktu ke waktu.'],['Motivation Word','Temukan kata-kata kecil yang menguatkan.','Buka kata','/motivation','cyan',Sparkles,'motivation','Satu kalimat sederhana untuk menemani langkahmu hari ini.'],['Drawing','Gambar bebas untuk melepas penat.','Mulai menggambar','/drawing','lavender',PenTool,'pencil','Coret, warna, dan lepaskan pikiran tanpa aturan.']];return <Page title="Solusi kesehatan mental"><Reveal><div className="mental-intro"><span>RUANG UNTUK DIRI SENDIRI</span><h2>Rawat pikiranmu, satu langkah kecil setiap hari.</h2><p>Pilih aktivitas yang paling sesuai dengan kebutuhanmu saat ini.</p></div></Reveal><div className="mental-grid">{cards.map(([t,d,b,p,c,I,kind,detail],i)=><Reveal key={t}><button className={'mental-card '+c} onClick={()=>nav(p)}><div className="mental-card-top"><span className={'mental-object '+kind}>{kind==='mood'?<span className="mood-face">{moods[mood]}</span>:<I/>}</span><span>0{i+1}</span></div><div className="mental-card-copy"><h3>{t}</h3><p>{d}</p><small>{detail}</small></div><span className="mental-card-action">{b}<span>→</span></span></button></Reveal>)}</div><Footer/></Page>}
function NutritionPage(){const [day,setDay]=useState('Senin');const [meals,setMeals]=useState([]);const [form,setForm]=useState({name:'',time:'Sarapan',note:''});const addMeal=()=>{if(!form.name.trim())return;setMeals(m=>[...m,{...form,id:Date.now(),day}]);setForm({name:'',time:'Sarapan',note:''})};const dayMeals=meals.filter(m=>m.day===day);return <Page title="Rencana makan mingguan"><div className="nutrition-planner"><div className="planner-top"><div><span className="eyebrow">PERENCANAAN</span><h2>Rencana makan mingguan</h2><p>Mulai dari kosong, lalu tambahkan menu sesuai kebutuhanmu.</p></div><div className="planner-count"><strong>{meals.length}</strong><span>menu tersimpan</span></div></div><div className="day-tabs">{['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'].map(d=><button className={day===d?'active':''} onClick={()=>setDay(d)} key={d}>{d}</button>)}</div><div className="planner-body"><section className="meal-empty">{dayMeals.length===0?<><div className="empty-icon"><Utensils/></div><h3>Belum ada menu untuk {day}</h3><p>Tambahkan sarapan, makan siang, makan malam, atau camilan untuk mengisi rencana hari ini.</p></>:<div className="meal-list">{dayMeals.map(m=><div className="planned-meal" key={m.id}><div><span>{m.time}</span><h3>{m.name}</h3>{m.note&&<p>{m.note}</p>}</div><button onClick={()=>setMeals(x=>x.filter(v=>v.id!==m.id))}><Trash2/></button></div>)}</div>}</section><aside className="add-meal-card"><span className="eyebrow">TAMBAH MENU</span><h3>Isi rencana makan</h3><label>Nama menu<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Contoh: Oatmeal pisang"/></label><label>Waktu<select value={form.time} onChange={e=>setForm({...form,time:e.target.value})}><option>Sarapan</option><option>Makan siang</option><option>Makan malam</option><option>Camilan</option></select></label><label>Catatan <span>(opsional)</span><input value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Porsi atau catatan"/></label><button className="add-meal-btn" onClick={addMeal}>+ Tambahkan menu</button></aside></div></div><Footer/></Page>}
function AIPage(){const [input,setInput]=useState('');const [messages,setMessages]=useState([]);const [typing,setTyping]=useState(false);const send=()=>{if(!input.trim()||typing)return;const q=input.trim();setInput('');setMessages(m=>[...m,{from:'user',text:q,id:Date.now()}]);setTyping(true);window.setTimeout(()=>{setMessages(m=>[...m,{from:'bot',text:'Aku akan membantu memberikan informasi kesehatan umum berdasarkan pertanyaanmu.',id:Date.now()+1}]);setTyping(false)},1250)};return <Page><div className="ipad-chat"><div className="ipad-frame"><div className="ipad-camera"/><div className="wa-topbar"><div className="chat-avatar"><img src={logo} alt="Valitudo"/></div><div><strong>Valitudo Assistant</strong><span>online</span></div><div className="wa-actions"><Search/><span>•••</span></div></div><div className="wa-chat-wall"><div className="chat-body">{messages.length===0&&!typing?<div className="chat-welcome"><div className="welcome-icon"><Sparkles/></div><h2>How can I help you today?</h2><p>Ask about nutrition, sleep, exercise, or healthy daily habits.</p></div>:<div className="chat-messages">{messages.map((m,i)=><div key={m.id} className={'chat-bubble '+m.from}>{m.text}<small>{i%2===0?'10:24':'10:25'} ✓✓</small></div>)}{typing&&<div className="typing-bubble"><i/><i/><i/></div>}</div>}</div><div className="chat-input"><button className="plus-btn">+</button><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Message"/><button onClick={send} aria-label="Kirim"><Send/></button></div><small className="chat-disclaimer">Valitudo provides general health information, not a medical diagnosis.</small></div></div></div><Footer/></Page>}

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
function MoodPage(){const moods=[['😊','Senang'],['😢','Sedih'],['😞','Kecewa'],['🙏','Bersyukur'],['😡','Marah']];const [selected,setSelected]=useState(3);return <Page title="Mood Tracker"><p className="subhead">Catat dan pantau mood kamu. Pilih yang paling menggambarkan harimu.</p><div className="mood-grid">{moods.map(([e,t],i)=><button className={selected===i?'selected':''} onClick={()=>setSelected(i)} key={t}><span>{e}</span><b>{t}</b></button>)}</div><div className="mood-note">Coba isi mood hari ini secara jujur. Mengenali perasaan adalah langkah baik untuk menjaga kesehatan mental.</div><h2 className="section-title">Minggu ini</h2><div className="week-grid">{['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map((d,i)=><div key={d}><small>{d}</small><span>{moods[i%5][0]}</span></div>)}</div><Footer/></Page>}
function MotivationPage(){const cards=[['🌸','Perlahan, tidak harus sempurna. Kamu tetap layak dicintai.','green'],['🌻','Hari baru, kesempatan baru untuk bertumbuh.','orange'],['🌷','Istirahat juga bagian dari perjalanan.','cyan'],['🌺','Kamu sudah melakukan yang terbaik hari ini.','pink'],['🪻','Tarik napas. Satu langkah kecil tetap berarti.','lavender'],['🌼','Kamu tidak harus berjalan sendirian.','yellow']];return <Page title="Motivation Word"><p className="subhead">Kata-kata kecil untuk menemani harimu.</p><div className="motivation-grid">{cards.map(([e,t,c])=><div className={'motivation-card '+c} key={t}><span>{e}</span><p>{t}</p></div>)}</div><Footer/></Page>}
function DrawingPage(){const canvasRef=useRef(null);const [color,setColor]=useState('#8dbd50');const drawing=useRef(false);useEffect(()=>{const c=canvasRef.current,ctx=c.getContext('2d');ctx.lineCap='round';ctx.lineWidth=4;const pos=e=>{const r=c.getBoundingClientRect();return{x:(e.clientX-r.left)*(c.width/r.width),y:(e.clientY-r.top)*(c.height/r.height)}};const down=e=>{drawing.current=true;const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y)};const move=e=>{if(!drawing.current)return;const p=pos(e);ctx.strokeStyle=color;ctx.lineTo(p.x,p.y);ctx.stroke()};const up=()=>drawing.current=false;c.addEventListener('pointerdown',down);c.addEventListener('pointermove',move);window.addEventListener('pointerup',up);return()=>{c.removeEventListener('pointerdown',down);c.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)}},[color]);return <Page title="Drawing"><div className="drawing-head"><div className="color-dots">{['#8dbd50','#e2bd42','#e58b9b','#76b7bd','#8e7cc3'].map(c=><button key={c} style={{background:c}} className={color===c?'chosen':''} onClick={()=>setColor(c)}/>)}</div><button className="plain-btn" onClick={()=>canvasRef.current.getContext('2d').clearRect(0,0,canvasRef.current.width,canvasRef.current.height)}><Trash2/> Hapus</button></div><canvas ref={canvasRef} width="1080" height="530" className="drawing-canvas"/><Footer/></Page>}

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
  return <Page title="Kelola artikel">
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

createRoot(document.getElementById('root')).render(<BrowserRouter><AuthProvider><App/></AuthProvider></BrowserRouter>);