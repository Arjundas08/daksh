import React, { useState, useEffect } from 'react';
import WorkerHome from './components/WorkerHome';
import WorkerAuth from './components/WorkerAuth';
import WorkerDashboard from './components/WorkerDashboard';
import ContractorDashboard from './components/ContractorDashboard';
import ContractorAuth from './components/ContractorAuth';
import AgentCommandCenter from './components/AgentCommandCenter';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

/* ── Floating Particles Component ── */
function Particles() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDuration: `${8 + Math.random() * 12}s`,
            animationDelay: `${Math.random() * 5}s`,
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            opacity: 0.3 + Math.random() * 0.4,
          }}
        />
      ))}
    </div>
  );
}



export default function App() {
  const [role, setRole] = useState(null); // 'worker' | 'contractor'
  const [language, setLanguage] = useState('hi');
  const [isLoaded, setIsLoaded] = useState(false);
  const [workerAuthStep, setWorkerAuthStep] = useState('login'); // 'login' | 'register' | 'dashboard'
  const [loggedInWorker, setLoggedInWorker] = useState(null);
  
  const [contractorAuthStep, setContractorAuthStep] = useState('auth'); // 'auth' | 'dashboard'
  const [loggedInContractor, setLoggedInContractor] = useState(null);

  const [showCommandCenter, setShowCommandCenter] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('lang') || 'hi';
    setLanguage(savedLang);
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  const [authData, setAuthData] = useState(null);

  const goHome = () => {
    setRole(null);
    setWorkerAuthStep('auth');
    setLoggedInWorker(null);
    setContractorAuthStep('auth');
    setLoggedInContractor(null);
    setAuthData(null);
  };

  const handleAuthSuccess = async (data) => {
    const { mode, phone, password, username, email } = data;
    setAuthData(data); // Save all fields for registration if needed
    
    try {
      if (mode === 'login') {
        const res = await fetch(`${API_BASE}/api/workers/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password }),
        });
        const resData = await res.json();

        if (res.ok && resData.status === 'existing') {
          const w = resData.worker;
          setLoggedInWorker({
            id: w.id, name: w.name, phone: w.phone, skill: w.skill,
            location: w.location, trustScore: w.trust_score,
            jobsCompleted: w.jobs_completed, earnings: w.earnings,
          });
          setWorkerAuthStep('dashboard');
        } else {
          alert(resData.detail || 'Incorrect phone or password!');
          setWorkerAuthStep('auth');
        }
      } 
      else if (mode === 'register') {
        // Quick check if phone already exists before allowing registration
        const checkRes = await fetch(`${API_BASE}/api/workers/check-phone`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
        });
        const checkData = await checkRes.json();
        
        if (checkData.status === 'existing') {
          alert('Account already exists! Please login.');
          setWorkerAuthStep('auth');
        } else {
          // Go to Voice Registration
          setWorkerAuthStep('register');
        }
      }
    } catch (err) {
      console.error('Auth API error:', err);
      alert('Network error connecting to backend.');
      setWorkerAuthStep('auth');
    }
  };

  const handleContractorAuthSuccess = async (data) => {
    const { mode, phone, password, name, companyName, email } = data;
    try {
      if (mode === 'login') {
        const res = await fetch(`${API_BASE}/api/contractors/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password }),
        });
        const resData = await res.json();
        
        if (res.ok && resData.status === 'existing') {
          setLoggedInContractor(resData.contractor);
          setContractorAuthStep('dashboard');
        } else {
          alert(resData.detail || 'Incorrect phone or password!');
          setContractorAuthStep('auth');
        }
      } else if (mode === 'register') {
        const res = await fetch(`${API_BASE}/api/contractors/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password, name, company_name: companyName, email }),
        });
        const resData = await res.json();
        
        if (res.ok && resData.success) {
          setLoggedInContractor(resData.contractor);
          setContractorAuthStep('dashboard');
        } else {
          alert(resData.detail || 'Registration failed.');
          setContractorAuthStep('auth');
        }
      }
    } catch (err) {
      console.error('Contractor Auth error:', err);
      alert('Network error connecting to backend.');
      setContractorAuthStep('auth');
    }
  };

  const langLabels = { hi: 'हिंदी', te: 'తెలుగు', en: 'English' };

  // Translations
  const t = {
    hi: {
      tagline: 'हुनर को सम्मान।',
      tagline2: 'काम को ज़िम्मेदारी।',
      subtitle: 'बोलो, बनाओ, कमाओ — सब कुछ अपने फ़ोन से',
      badge: 'Voice-First Platform',
      feat1: '🎙️ Voice AI',
      feat2: '🛡️ Verified ID',
      feat3: '⚡ Instant Match',
      feat4: '🌐 Multilingual',
      worker: 'मैं मज़दूर हूँ',
      workerSub: 'बोलकर अपना Digital ID बनाओ — काम तुम्हें ढूंढेगा',
      workerTag: '🎙️ 30 सेकंड में रजिस्टर',
      contractor: 'मैं ठेकेदार हूँ',
      contractorSub: 'AI से सबसे सही कारीगर पाओ — Verified, Trusted',
      contractorTag: '⚡ Smart Matching',
    },
    te: {
      tagline: 'నైపుణ్యానికి గౌరవం.',
      tagline2: 'పనికి బాధ్యత.',
      subtitle: 'మాట్లాడండి, నిర్మించండి, సంపాదించండి — మీ ఫోన్ నుండి',
      badge: 'Voice-First Platform',
      feat1: '🎙️ Voice AI',
      feat2: '🛡️ Verified ID',
      feat3: '⚡ Instant Match',
      feat4: '🌐 Multilingual',
      worker: 'నేను కూలీని',
      workerSub: 'మాట్లాడి మీ Digital ID సృష్టించండి — పని మిమ్మల్ని కనుగొంటుంది',
      workerTag: '🎙️ 30 సెకన్లలో రిజిస్టర్',
      contractor: 'నేను కాంట్రాక్టర్‌ని',
      contractorSub: 'AI తో సరైన పనివారిని పొందండి — Verified, Trusted',
      contractorTag: '⚡ Smart Matching',
    },
    en: {
      tagline: 'Skills Deserve',
      tagline2: 'Respect.',
      subtitle: 'Speak. Build. Earn — everything from your phone',
      badge: 'Voice-First Platform',
      feat1: '🎙️ Voice AI',
      feat2: '🛡️ Verified ID',
      feat3: '⚡ Instant Match',
      feat4: '🌐 Multilingual',
      worker: 'I am a Worker',
      workerSub: 'Create your Digital ID by voice — jobs will find you',
      workerTag: '🎙️ Register in 30 sec',
      contractor: 'I am a Contractor',
      contractorSub: 'Find the right skilled workers with AI — Verified & Trusted',
      contractorTag: '⚡ Smart Matching',
    },
  };

  const text = t[language];

  return (
    <div className="min-h-screen bg-hero flex flex-col relative overflow-hidden">
      <Particles />

      {/* ═══ HEADER ═══ */}
      <header className={`backdrop-blur-2xl bg-white/5 border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50 transition-all duration-700 ${isLoaded ? 'animate-header' : 'opacity-0'}`}>
        <div className="flex items-center gap-4 cursor-pointer group" onClick={goHome}>
          {/* Logo */}
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-all duration-300 animate-glow">
              <span className="text-white font-black text-2xl tracking-tighter" style={{fontFamily: 'Outfit'}}>D</span>
            </div>
            {/* Ping ring */}
            <div className="absolute inset-0 rounded-2xl border-2 border-orange-400 animate-ping opacity-20"></div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white leading-none tracking-tight flex items-center gap-2" style={{fontFamily: 'Outfit'}}>
              DAKSH
              <span className="text-[10px] bg-gradient-to-r from-orange-400 to-orange-500 text-white px-2 py-0.5 rounded-full font-bold tracking-wider uppercase">BETA</span>
            </h1>
            <span className="text-[11px] text-white/40 font-semibold tracking-[0.25em] uppercase">Digital Shram Protocol</span>
          </div>
        </div>

        {/* Language Toggle */}
        <div className="flex bg-white/5 backdrop-blur-xl rounded-2xl p-1 gap-1 border border-white/10">
          {Object.entries(langLabels).map(([code, label]) => (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                language === code
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 flex items-center justify-center px-6 py-8 z-10 relative">

        {/* ── ROLE SELECTOR ── */}
        {!role && (
          <div className="w-full max-w-6xl space-y-12">

            {/* Badge */}
            <div className={`flex justify-center ${isLoaded ? 'animate-in-delay-1' : 'opacity-0'}`}>
              <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white/80 text-sm font-semibold shadow-xl">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400"></span>
                </span>
                {text.badge}
              </div>
            </div>

            {/* Hero Headline */}
            <div className={`text-center space-y-6 ${isLoaded ? 'animate-in-delay-2' : 'opacity-0'}`}>
              <h2 className="text-6xl md:text-8xl lg:text-[100px] font-black leading-[1.05] tracking-tight" style={{fontFamily: 'Outfit'}}>
                <span className="text-white">{text.tagline}</span>
                <br />
                <span className="gradient-text">{text.tagline2}</span>
              </h2>
              <p className="text-xl md:text-3xl text-white/60 font-medium max-w-3xl mx-auto leading-relaxed">
                {text.subtitle}
              </p>
            </div>

            {/* Feature Pills */}
            <div className={`flex flex-wrap items-center justify-center gap-4 py-4 ${isLoaded ? 'animate-in-delay-3' : 'opacity-0'}`}>
              {[text.feat1, text.feat2, text.feat3, text.feat4].map((feat, i) => (
                <span key={i} className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white/70 text-base md:text-lg font-semibold backdrop-blur-sm hover:bg-white/10 hover:border-white/20 transition-all cursor-default shadow-lg">
                  {feat}
                </span>
              ))}
            </div>

            {/* Role Cards — Side by Side */}
            <div className={`grid md:grid-cols-2 gap-8 max-w-4xl mx-auto ${isLoaded ? 'animate-in-delay-4' : 'opacity-0'}`}>

              {/* Worker Card */}
              <button
                onClick={() => { setRole('worker'); setWorkerAuthStep('auth'); }}
                className="card-glass text-left p-0 cursor-pointer group active:scale-[0.97] transition-all overflow-hidden hover:shadow-[0_0_40px_rgba(249,115,22,0.3)]"
              >
                <div className="relative h-64 overflow-hidden">
                  <img src="/worker.png" alt="Worker" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                  <div className="absolute bottom-5 left-6 right-6">
                    <h3 className="text-3xl font-black text-white leading-tight">{text.worker}</h3>
                  </div>
                  <div className="absolute top-3 right-3">
                    <svg className="w-5 h-5 text-green-400 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-base text-white/60 leading-relaxed line-clamp-2">{text.workerSub}</p>
                  <div className="inline-flex items-center gap-2 text-sm font-bold text-orange-400 bg-orange-400/10 px-4 py-2 rounded-full border border-orange-400/20">
                    {text.workerTag}
                  </div>
                </div>
              </button>

              {/* Contractor Card */}
              <button
                onClick={() => setRole('contractor')}
                className="card-glass text-left p-0 cursor-pointer group active:scale-[0.97] transition-all overflow-hidden hover:shadow-[0_0_40px_rgba(59,130,246,0.3)]"
              >
                <div className="relative h-64 overflow-hidden">
                  <img src="/contractor.png" alt="Contractor" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                  <div className="absolute bottom-5 left-6 right-6">
                    <h3 className="text-3xl font-black text-white leading-tight">{text.contractor}</h3>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-base text-white/60 leading-relaxed line-clamp-2">{text.contractorSub}</p>
                  <div className="inline-flex items-center gap-2 text-sm font-bold text-blue-400 bg-blue-400/10 px-4 py-2 rounded-full border border-blue-400/20">
                    {text.contractorTag}
                  </div>
                </div>
              </button>
            </div>

            {/* Bottom Agent Bar */}
            <div className={`flex items-center justify-center pt-4 pb-6 ${isLoaded ? 'animate-in-delay-5' : 'opacity-0'}`}>
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-white/60 text-sm font-medium">
                <div className="flex -space-x-1.5">
                  <div className="w-5 h-5 rounded-full bg-orange-500/80 border border-white/20 flex items-center justify-center text-[8px]">🎙️</div>
                  <div className="w-5 h-5 rounded-full bg-blue-500/80 border border-white/20 flex items-center justify-center text-[8px]">🔍</div>
                  <div className="w-5 h-5 rounded-full bg-green-500/80 border border-white/20 flex items-center justify-center text-[8px]">📝</div>
                  <div className="w-5 h-5 rounded-full bg-purple-500/80 border border-white/20 flex items-center justify-center text-[8px]">🛡️</div>
                  <div className="w-5 h-5 rounded-full bg-red-500/80 border border-white/20 flex items-center justify-center text-[8px]">📊</div>
                </div>
                <span>5 AI Agents</span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── WORKER PATH (Stage 2 & 5.5) ── */}
        {role === 'worker' && (
          <>
            {workerAuthStep === 'auth' && (
              <WorkerAuth language={language} onAuthSuccess={handleAuthSuccess} onBack={goHome} />
            )}
            {workerAuthStep === 'register' && (
              <WorkerHome 
                language={language} 
                authData={authData} 
                onBack={goHome} 
                onComplete={(newWorker) => {
                setLoggedInWorker({
                  ...newWorker,
                  trustScore: 50,
                  jobsCompleted: 0,
                  earnings: 0
                });
                setWorkerAuthStep('dashboard');
              }} />
            )}
            {workerAuthStep === 'dashboard' && (
              <WorkerDashboard worker={loggedInWorker} language={language} setLanguage={setLanguage} onLogout={goHome} />
            )}
          </>
        )}

        {/* ── CONTRACTOR DASHBOARD (Stage 4 & 5.6) ── */}
        {role === 'contractor' && (
          <>
            {contractorAuthStep === 'auth' && (
              <ContractorAuth language={language} onAuthSuccess={handleContractorAuthSuccess} onBack={goHome} />
            )}
            {contractorAuthStep === 'dashboard' && loggedInContractor && (
              <ContractorDashboard 
                contractor={loggedInContractor} 
                language={language} 
                setLanguage={setLanguage}
                onLogout={goHome} 
              />
            )}
          </>
        )}
      </main>

      {/* Floating Agent Command Center Button */}
      <button
        onClick={() => setShowCommandCenter(!showCommandCenter)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-emerald-500/40 hover:shadow-emerald-500/60 hover:scale-110 transition-all active:scale-95 group"
        title="Agent Command Center"
      >
        <span className="text-2xl group-hover:animate-bounce">🤖</span>
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-[#0c0a1a] animate-pulse"></span>
      </button>

      {/* Agent Command Center Modal */}
      {showCommandCenter && (
        <AgentCommandCenter onClose={() => setShowCommandCenter(false)} />
      )}
    </div>
  );
}
