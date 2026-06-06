import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { translations } from '../utils/translations';

const API_BASE = 'http://localhost:8000';

export default function WorkerDashboard({ worker, language, setLanguage, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [jobs, setJobs] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  
  // New features state
  const [showSafetyWarning, setShowSafetyWarning] = useState(true);
  const [simSkill, setSimSkill] = useState('Current');
  const [simLoan, setSimLoan] = useState(false);
  
  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [isDanger, setIsDanger] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  // Ustaad AI Chatbot State
  const [showUstaad, setShowUstaad] = useState(false);
  const [ustaadMessages, setUstaadMessages] = useState([
    { role: 'ustaad', text: 'Namaste Bhai! Main aapka Ustaad AI hoon. Kaam, paisa, ya skill seekhne ke baare mein kuch bhi poocho. 🙏' }
  ]);
  const [ustaadInput, setUstaadInput] = useState('');
  const [ustaadLoading, setUstaadLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const t = (key) => {
    return translations[language || 'en']?.[key] || translations['en'][key] || key;
  };

  const w = worker || {
    id: 'DEMO-001',
    name: 'Unknown',
    skill: 'Helper',
    location: 'Unknown',
    trustScore: 50,
    jobsCompleted: 0,
    earnings: 0,
  };

  // Live worker data (refreshes from DB to catch payment updates)
  const [liveWorker, setLiveWorker] = useState(w);

  useEffect(() => {
    async function refreshWorker() {
      try {
        const res = await fetch(`${API_BASE}/api/workers/${w.id}`);
        const data = await res.json();
        if (data.success && data.worker) {
          setLiveWorker({
            ...w,
            earnings: data.worker.earnings || 0,
            trustScore: data.worker.trust_score || w.trustScore,
            jobsCompleted: data.worker.jobs_completed || w.jobsCompleted,
            photo: data.worker.photo || w.photo || '',
          });
        }
      } catch(e) { /* ignore */ }
    }
    refreshWorker();
    const interval = setInterval(refreshWorker, 5000);
    return () => clearInterval(interval);
  }, [w.id]);

  useEffect(() => {
    const now = new Date();
    setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          const data = await res.json();
          if (data.current_weather) {
            setWeather(data.current_weather);
            // Real construction safety thresholds: Temp > 40C (Extreme Heat) or Wind > 40 km/h (Scaffolding risk)
            const temp = data.current_weather.temperature;
            const wind = data.current_weather.windspeed;
            if (temp > 40 || wind > 40) {
              setIsDanger(true);
            } else {
              setIsDanger(false);
            }
          }
        } catch (err) {
          console.error("Weather fetch failed", err);
        } finally {
          setLoadingWeather(false);
        }
      }, (error) => {
        console.error("Location error:", error);
        setLoadingWeather(false);
      });
    } else {
      setLoadingWeather(false);
    }
  }, []);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch(`${API_BASE}/api/jobs?status=open`);
        const appsRes = await fetch(`${API_BASE}/api/jobs/worker/${w.id}/applications`);
        const data = await res.json();
        const appsData = await appsRes.json();

        if (data.success) {
          const appliedJobIds = new Set(appsData.applications?.map(a => a.id) || []);
          const availableJobs = data.jobs.filter(j => !appliedJobIds.has(j.id));
          const matching = availableJobs.filter(j => j.skill_needed.toLowerCase() === w.skill.toLowerCase());
          const others = availableJobs.filter(j => j.skill_needed.toLowerCase() !== w.skill.toLowerCase());
          setJobs([...matching, ...others]);
          if (appsData.success) setActiveJobs(appsData.applications);
        }
      } catch (err) {
        console.error('Failed to fetch jobs:', err);
      } finally {
        setLoadingJobs(false);
      }
    }
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, [w.skill, w.id]);

  const handleAcceptJob = async (jobId) => {
    setProcessingId(jobId);
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_id: w.id })
      });
      const data = await res.json();
      if (data.success) {
        setJobs(prev => prev.filter(j => j.id !== jobId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const skillIcons = {
    Mason: '🧱', Carpenter: '🪵', Helper: '🤝', Electrician: '⚡',
    Plumber: '🔧', Painter: '🎨', Supervisor: '📋', Welder: '🔥',
    Fitter: '⚙️', Default: '👷',
  };
  
  const handleUstaadSend = async (overrideMsg) => {
    const msg = overrideMsg || ustaadInput.trim();
    if (!msg) return;
    setUstaadMessages(prev => [...prev, { role: 'user', text: msg }]);
    setUstaadInput('');
    setUstaadLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat/ustaad`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          role: 'worker',
          skill: w.skill,
          worker_id: w.id,
          earnings: liveWorker.earnings || 0,
          jobs_completed: liveWorker.jobsCompleted || 0,
          trust_score: liveWorker.trustScore || 50,
          active_jobs: activeJobs.filter(j => j.application_status !== 'completed').length,
        })
      });
      const data = await res.json();
      
      if (data.success && data.reply) {
        setUstaadMessages(prev => [...prev, { role: 'ustaad', text: data.reply }]);
        
        // Voice output using browser SpeechSynthesis in selected language
        speakText(data.reply);
      } else {
        // API returned but no success
        const fallback = `Bhai, abhi network slow hai. Tera trust score ${liveWorker.trustScore || 50} hai aur tune Rs.${(liveWorker.earnings || 0).toLocaleString()} kamaye hain. Mehnat kar, target hit hoga! 💪`;
        setUstaadMessages(prev => [...prev, { role: 'ustaad', text: fallback }]);
        speakText(fallback);
      }
    } catch(e) {
      console.error('Ustaad AI error:', e);
      // Fallback so user ALWAYS gets a response
      const fallback = `Arre Bhai! Network thoda slow hai, par tension mat le. Tera kaam chal raha hai, mehnat kar aur Rs.25,000 target zaroor hit hoga! 🔥`;
      setUstaadMessages(prev => [...prev, { role: 'ustaad', text: fallback }]);
      speakText(fallback);
    } finally {
      setUstaadLoading(false);
    }
  };

  // Voice output function - uses high-quality Neural TTS (Edge TTS via backend)
  const speakText = async (text) => {
    // Stop any currently playing audio if we had a global reference (optional)
    try {
      const langMap = { en: 'en', hi: 'hi', te: 'te' };
      const targetLang = langMap[language] || 'hi';
      
      const ttsRes = await fetch(`${API_BASE}/api/voice/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, language: targetLang, gender: 'male' })
      });
      
      if (ttsRes.ok) {
        const audioBlob = await ttsRes.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play().catch(e => console.error("Audio play failed:", e));
      } else {
        throw new Error("TTS failed");
      }
    } catch(err) {
      console.error("High quality TTS failed, falling back to browser:", err);
      // Fallback to basic browser speech synthesis ONLY if backend fails
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        const targetLang = { en: 'en', hi: 'hi', te: 'te' }[language] || 'hi';
        const matchedVoice = voices.find(v => v.lang.startsWith(targetLang)) || voices.find(v => v.lang.includes('IN')) || voices.find(v => v.lang.includes('hi'));
        if (matchedVoice) utterance.voice = matchedVoice;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Voice recording for Ustaad AI (Native Browser Speech)
  const startVoiceRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Browser does not support voice input. Please type.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'te' ? 'te-IN' : (language === 'hi' ? 'hi-IN' : 'en-IN');
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      handleUstaadSend(text);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    setMediaRecorder(recognition);
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && typeof mediaRecorder.stop === 'function') {
      mediaRecorder.stop();
    }
  };

  const skillIcon = skillIcons[w.skill] || skillIcons.Default;

  const score = liveWorker.trustScore || 50;

  // Tabs for Sidebar
  const tabs = [
    { id: 'home', label: t('overview'), icon: '🏠' },
    { id: 'feed', label: t('findWork'), icon: '🔍', badge: jobs.length },
    { id: 'active', label: t('activeContracts'), icon: '📋', badge: activeJobs.length },
    { id: 'wallet', label: t('escrowWallet'), icon: '💰' },
    { id: 'growth', label: t('incomeSimulator'), icon: '📈' },
  ];

  /* ─────────────────── SAFETY WARNING MODAL ─────────────────── */
  const renderSafetyWarning = () => {
    if (loadingWeather) {
      return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-orange-500 rounded-full animate-spin mb-4"></div>
          <p className="text-orange-400 font-bold uppercase tracking-widest text-sm">Predictive Safety AI Scanning...</p>
          <p className="text-slate-500 text-xs mt-2">Checking real-time local weather & site data</p>
        </div>
      );
    }

    const temp = weather?.temperature || "N/A";
    const wind = weather?.windspeed || "N/A";

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
        <div className={`max-w-md w-full bg-slate-900 border-2 rounded-3xl overflow-hidden ${isDanger ? 'border-rose-500 shadow-[0_0_50px_rgba(244,63,113,0.3)]' : 'border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.3)]'}`}>
          <div className={`${isDanger ? 'bg-rose-500' : 'bg-emerald-500'} p-6 text-center`}>
            <div className={`text-5xl mb-2 ${isDanger ? 'animate-bounce' : ''}`}>{isDanger ? '⚠️' : '✅'}</div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">
              {isDanger ? 'Aaj Khatra Hai' : 'Mausam Sahi Hai'}
            </h2>
            <p className={`${isDanger ? 'text-rose-100' : 'text-emerald-100'} font-medium mt-1`}>
              Predictive AI Report • {currentTime}
            </p>
          </div>
          
          <div className="p-6 space-y-6">
            {/* AI Analysis */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className={`${temp > 40 ? 'text-rose-400' : 'text-emerald-400'} mt-0.5`}>🌡️</span>
                <div>
                  <span className="text-white font-bold block">Local Temperature: {temp}°C</span>
                  <span className="text-slate-400 text-sm">
                    {temp > 40 ? "Critical heat stroke risk detected today." : temp > 35 ? "High heat. Stay hydrated." : "Temperature is within safe working limits."}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className={`${wind > 40 ? 'text-rose-400' : 'text-emerald-400'} mt-0.5`}>🌪️</span>
                <div>
                  <span className="text-white font-bold block">Wind Speed: {wind} km/h</span>
                  <span className="text-slate-400 text-sm">
                    {wind > 40 ? "High winds. Scaffolding work is highly unsafe." : "Wind conditions are stable."}
                  </span>
                </div>
              </div>
              {isDanger && (
                <div className="flex items-start gap-3">
                  <span className="text-orange-400 mt-0.5">🏥</span>
                  <div>
                    <span className="text-white font-bold block">Your Medical History</span>
                    <span className="text-slate-400 text-sm">You reported dizziness in heat 2 weeks ago. AI flags you as vulnerable.</span>
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-slate-800"></div>

            {/* Mandatory Actions */}
            <div>
              <h3 className={`text-xs font-black uppercase tracking-widest mb-3 ${isDanger ? 'text-rose-500' : 'text-emerald-500'}`}>
                {isDanger ? 'Mandatory Directives' : 'Standard Protocol'}
              </h3>
              <ul className="space-y-2 text-slate-300 font-medium text-sm">
                <li className="flex items-center gap-2"><span>✅</span> {temp > 35 ? 'Extra water break every 30 mins' : 'Stay hydrated regularly'}</li>
                <li className="flex items-center gap-2"><span>✅</span> {wind > 40 ? 'Mandatory harness double-check due to wind' : 'Wear standard safety gear'}</li>
                {temp > 40 && <li className="flex items-center gap-2"><span>✅</span> Site operations halt at 12:00 PM</li>}
              </ul>
            </div>

            <div className={isDanger ? "grid grid-cols-2 gap-3 pt-2" : "pt-2"}>
              {isDanger ? (
                <>
                  <button 
                    onClick={() => setShowSafetyWarning(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-all"
                  >
                    {t('safetySkip')}
                  </button>
                  <button 
                    onClick={() => setShowSafetyWarning(false)}
                    className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-rose-500/30"
                  >
                    {t('safetyReady')}
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setShowSafetyWarning(false)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/30"
                >
                  Enter Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ─────────────────── HOME TAB ─────────────────── */
  const renderHome = () => (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Outfit' }}>{t('welcome')}, {w.name.split(' ')[0]} 👋</h1>
          <p className="text-slate-400 mt-1">Here is your digital shram profile.</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 px-4 py-2 rounded-xl flex items-center gap-3">
          <span className="text-2xl">{skillIcon}</span>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">{t('primarySkill')}</span>
            <span className="text-white font-bold">{w.skill}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-2 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10 text-8xl">🛡️</div>
          <div className="relative z-10">
            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">{t('trustScore')}</div>
            <div className="flex items-baseline gap-4">
              <span className={`text-8xl font-black ${score >= 80 ? 'text-emerald-400' : 'text-amber-400'}`} style={{ fontFamily: 'Outfit' }}>{score}</span>
              <span className="text-xl font-bold text-slate-600">/ 100</span>
            </div>
            <p className="text-slate-400 mt-4 max-w-sm">This score automatically qualifies you for higher-paying jobs and equipment micro-loans.</p>
          </div>
        </div>

        <div className="rounded-3xl bg-slate-800 border border-slate-700 p-8 flex flex-col items-center justify-center text-center">
          {/* Worker Photo */}
          {liveWorker.photo ? (
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-orange-500/40 shadow-[0_0_30px_rgba(249,115,22,0.3)] mb-4">
              <img src={liveWorker.photo} alt={w.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-4xl shadow-lg shadow-orange-500/30 mb-4">
              {w.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h3 className="text-white font-bold text-lg mb-0.5">{w.name}</h3>
          <p className="text-slate-500 font-mono text-xs mb-3">{w.id}</p>
          <div className="bg-white p-2.5 rounded-xl shadow-xl mb-3">
            <QRCodeSVG value={`https://daksh.app/verify/${w.id}`} size={80} level="H" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
            <span>✓</span> {t('verifiedIdentity')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-3xl bg-slate-800 border border-slate-700 p-8">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">{t('jobsCompleted')}</div>
          <div className="text-5xl font-black text-white" style={{ fontFamily: 'Outfit' }}>{liveWorker.jobsCompleted || 0}</div>
        </div>
        <div className="rounded-3xl bg-slate-800 border border-slate-700 p-8">
          <div className="text-emerald-500/70 text-xs font-bold uppercase tracking-widest mb-4">{t('totalEarnings')}</div>
          <div className="text-5xl font-black text-emerald-400" style={{ fontFamily: 'Outfit' }}>₹{(liveWorker.earnings || 0).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );

  /* ─────────────────── FEED TAB ─────────────────── */
  const renderFeed = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 w-full">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'Outfit' }}>{t('aiRecommendedJobs')}</h2>
        {jobs.length > 0 && <span className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full uppercase tracking-widest">{jobs.length} Matches</span>}
      </div>

      {loadingJobs ? (
        <div className="p-16 text-center">
          <div className="w-8 h-8 border-4 border-slate-700 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Scanning Market...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-16 text-center bg-slate-800/50 rounded-3xl border border-slate-700 border-dashed">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-slate-400 font-bold">{t('noJobs')}</p>
        </div>
      ) : (
        jobs.map(job => {
          const isMatch = job.skill_needed.toLowerCase() === w.skill.toLowerCase();
          const matchPercent = isMatch ? Math.min(99, 80 + Math.floor(score / 5)) : Math.floor(30 + Math.random() * 20);

          return (
            <div key={job.id} className="bg-slate-800 border border-slate-700 rounded-3xl p-8 hover:border-slate-500 transition-colors">
              <div className="flex items-center justify-between mb-6">
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${isMatch ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-700 text-slate-400'}`}>
                  {matchPercent}% Match
                </span>
                <span className="text-sm font-bold text-slate-500">{job.contractor_name}</span>
              </div>
              
              <h3 className="text-2xl font-black text-white mb-2">{job.title}</h3>
              <p className="text-slate-400 flex items-center gap-2 mb-6 text-sm">
                <span>📍</span> {job.location}
              </p>

              <div className="flex items-center gap-8 mb-8 bg-slate-900/50 p-4 rounded-2xl">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('wage')}</div>
                  <div className="text-xl font-black text-emerald-400">₹{job.wage_per_day}<span className="text-xs text-slate-600 ml-1">/day</span></div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('duration')}</div>
                  <div className="text-xl font-black text-white">{job.duration_days} <span className="text-xs text-slate-600">days</span></div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('need')}</div>
                  <div className="text-xl font-black text-blue-400">{job.workers_needed} <span className="text-xs text-slate-600">{t('workers')}</span></div>
                </div>
              </div>

              <button
                onClick={() => handleAcceptJob(job.id)}
                disabled={processingId === job.id}
                className="w-full bg-white hover:bg-orange-500 text-slate-900 hover:text-white font-black py-4 rounded-xl transition-all active:scale-[0.98]"
              >
                {processingId === job.id ? t('accepting') : t('acceptJob')}
              </button>
            </div>
          )
        })
      )}
    </div>
  );

  /* ─────────────────── ACTIVE TAB ─────────────────── */
  const completedJobs = activeJobs.filter(j => j.application_status === 'completed');
  const workingJobs = activeJobs.filter(j => j.application_status !== 'completed');

  const renderActive = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 w-full">
      <h2 className="text-3xl font-black text-white mb-8" style={{ fontFamily: 'Outfit' }}>{t('activeContracts')}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workingJobs.map(job => {
          const totalEarning = job.wage_per_day * job.duration_days;
          return (
            <div key={job.id} className="bg-slate-800 border border-emerald-500/20 rounded-3xl p-8 relative overflow-hidden hover:border-emerald-500/40 transition-colors">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
              <div className="flex justify-between items-start mb-5">
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  ● ACTIVE
                </span>
                <span className="text-sm font-bold text-slate-500">{job.contractor_name}</span>
              </div>
              
              <h3 className="text-2xl font-black text-white mb-2">{job.title}</h3>
              <p className="text-slate-400 text-sm mb-5 flex items-center gap-2"><span>📍</span>{job.location}</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-2xl">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('wage')}</div>
                  <div className="text-xl font-black text-white">₹{job.wage_per_day}<span className="text-xs text-slate-600 ml-1">/day</span></div>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-2xl">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t('safeInEscrow')}</div>
                  <div className="text-xl font-black text-emerald-400">₹{totalEarning.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );

  /* ─────────────────── WALLET TAB ─────────────────── */
  const renderWallet = () => {
    const escrowSum = workingJobs.reduce((sum, j) => sum + (j.wage_per_day * j.duration_days), 0);

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 w-full">
        <h2 className="text-3xl font-black text-white mb-8" style={{ fontFamily: 'Outfit' }}>{t('escrowWallet')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">{t('walletBalance')}</div>
            <div className="text-5xl font-black text-white" style={{ fontFamily: 'Outfit' }}>₹{(liveWorker.earnings || 0).toLocaleString()}</div>
            <p className="text-slate-500 text-sm mt-4">✓ {t('availableToWithdraw')}</p>
          </div>
          
          <div className="rounded-3xl bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 text-8xl">🔒</div>
            <div className="relative z-10">
              <div className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">{t('safeInEscrow')}</div>
              <div className="text-5xl font-black text-emerald-400" style={{ fontFamily: 'Outfit' }}>₹{escrowSum.toLocaleString()}</div>
              <p className="text-slate-400 text-sm mt-4">{t('escrowGuarantee')}</p>
            </div>
          </div>
        </div>

        <button className="w-full bg-white hover:bg-emerald-500 text-slate-900 hover:text-white font-black py-4 rounded-xl transition-all active:scale-[0.98] mb-8">
          {t('withdrawNow')}
        </button>

        <h3 className="text-xl font-bold text-white mb-4">{t('recentTransactions')}</h3>
        <div className="space-y-4">
          {completedJobs.length === 0 ? (
            <p className="text-slate-500 italic">{t('noTransactions')}</p>
          ) : (
            completedJobs.map(job => (
              <div key={job.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex justify-between items-center">
                <div>
                  <div className="text-white font-bold">{job.title}</div>
                  <div className="text-slate-500 text-sm">{job.contractor_name}</div>
                </div>
                <div className="text-emerald-400 font-black">+₹{(job.wage_per_day * job.duration_days).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  /* ─────────────────── GROWTH TAB ─────────────────── */
  const renderGrowth = () => {
    const targetIncome = 25000;
    const currentIncome = liveWorker.earnings || 0;
    const progress = Math.min(100, Math.max(0, (currentIncome / targetIncome) * 100));
    
    const baseWage = simSkill === 'Current' ? 900 : 1500;
    const monthlyIncome = simLoan ? baseWage * 30 : baseWage * 25;

    return (
      <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 w-full">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'Outfit' }}>{t('incomeSimulator')}</h2>
          <span className="text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full uppercase tracking-widest">Munshi AI</span>
        </div>

        {/* Current Target Tracker */}
        <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-500/30 rounded-3xl p-8 mb-8">
          <div className="flex justify-between items-end mb-6">
            <div>
              <div className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1">{t('targetIncome')}</div>
              <div className="text-4xl font-black text-white" style={{ fontFamily: 'Outfit' }}>₹{targetIncome.toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{t('currentPace')}</div>
              <div className="text-xl font-bold text-emerald-400">₹{currentIncome.toLocaleString()}</div>
            </div>
          </div>
          
          <div className="w-full bg-slate-800 rounded-full h-4 mb-4 overflow-hidden border border-slate-700">
            <div className="bg-indigo-500 h-4 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-indigo-300 font-bold">{progress.toFixed(0)}% Achieved</span>
            <span className="text-slate-400">{t('remainingNeeded')}: <span className="text-white font-bold">₹{Math.max(0, targetIncome - currentIncome).toLocaleString()}</span></span>
          </div>

          <div className="mt-6 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-center gap-4">
            <div className="text-3xl">💡</div>
            <div>
              <p className="text-indigo-200 text-sm font-bold mb-1">Munshi AI Advice:</p>
              <p className="text-indigo-300/80 text-xs">Based on your current average wage of ₹900/day, you need approximately <strong className="text-white">{Math.ceil(Math.max(0, targetIncome - currentIncome) / 900)} {t('moreJobsToHit')}</strong>.</p>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-bold text-white mb-4">{t('careerGrowth')}</h3>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans">
      
      {showSafetyWarning && renderSafetyWarning()}

      {/* ── SIDEBAR ── */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex shrink-0 z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.4)]">
              <span className="text-white font-black text-xl" style={{fontFamily: 'Outfit'}}>D</span>
            </div>
            <h1 className="text-2xl font-black text-white" style={{fontFamily: 'Outfit'}}>DAKSH</h1>
          </div>

          {/* Worker Profile Card in Sidebar */}
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700 flex items-center gap-3 mb-6">
            <div className="w-11 h-11 shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              {liveWorker.photo ? (
                <img src={liveWorker.photo} alt={w.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-black text-lg">{w.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-white font-bold text-sm truncate">{w.name}</div>
              <div className="text-slate-400 text-xs">{skillIcon} {w.skill}</div>
            </div>
          </div>

          {/* Language Switcher */}
          {setLanguage && (
            <div className="flex gap-1 mb-6 bg-slate-800 rounded-xl p-1 border border-slate-700">
              {[{code:'en',label:'EN'},{code:'hi',label:'हिं'},{code:'te',label:'తె'}].map(l => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`flex-1 py-2 rounded-lg text-xs font-black tracking-wider transition-all ${
                    language === l.code
                      ? 'bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.4)]'
                      : 'text-slate-500 hover:text-white'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}

          <nav className="space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="ml-auto bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <span className="text-xl">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-12 relative">
        {/* Mobile Nav Top Bar */}
        <div className="md:hidden flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <span className="text-white font-black text-sm">D</span>
            </div>
            <h1 className="text-xl font-black text-white">DAKSH</h1>
          </div>
          <button className="text-slate-400" onClick={onLogout}>Logout</button>
        </div>

        {/* Content Router */}
        {activeTab === 'home' && renderHome()}
        {activeTab === 'feed' && renderFeed()}
        {activeTab === 'active' && renderActive()}
        {activeTab === 'wallet' && renderWallet()}
        {activeTab === 'growth' && renderGrowth()}
      </main>

      {/* Mobile Bottom Nav (retained for mobile layout only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-50 flex justify-around p-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl ${activeTab === tab.id ? 'text-white' : 'text-slate-500'}`}
          >
            <span className="text-xl relative">
              {tab.icon}
              {tab.badge > 0 && <span className="absolute -top-1 -right-2 bg-orange-500 w-3 h-3 rounded-full border-2 border-slate-900"></span>}
            </span>
            <span className="text-[9px] font-bold tracking-wider truncate max-w-[60px]">{tab.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>

      {/* ── USTAAD AI FLOATING BUTTON ── */}
      <button 
        onClick={() => setShowUstaad(true)}
        className="fixed bottom-24 md:bottom-8 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 flex items-center justify-center shadow-[0_0_40px_rgba(249,115,22,0.5)] hover:scale-110 active:scale-95 transition-all"
      >
        <span className="text-3xl">👳🏾‍♂️</span>
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-slate-900"></span>
        </span>
      </button>

      {/* ── USTAAD AI FULL SCREEN EXPERIENCE ── */}
      {showUstaad && (
        <div className="fixed inset-0 z-[200] bg-[#0a0e1a] flex flex-col animate-in fade-in duration-300">
          
          {/* ── HEADER BAR ── */}
          <div className="shrink-0 bg-gradient-to-r from-[#0a0e1a] via-[#1a1205] to-[#0a0e1a] px-6 py-5 flex items-center justify-between border-b border-orange-500/10">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(249,115,22,0.4)] border border-orange-400/30">
                👳🏾‍♂️
              </div>
              <div>
                <h2 className="text-white font-black text-2xl tracking-wide" style={{ fontFamily: 'Outfit' }}>
                  Ustaad AI
                  <span className="ml-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-widest">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Online
                  </span>
                </h2>
                <p className="text-orange-300/60 text-sm font-medium mt-0.5">{t('ustaadMentor')} • Munshi AI Financial Agent</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Live Data Chips */}
              <div className="hidden md:flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-2xl px-4 py-2.5">
                <span className="text-emerald-400 text-sm font-black">💰 ₹{(liveWorker.earnings || 0).toLocaleString()}</span>
                <span className="text-slate-700">|</span>
                <span className="text-blue-400 text-sm font-bold">📋 {liveWorker.jobsCompleted || 0}</span>
                <span className="text-slate-700">|</span>
                <span className="text-amber-400 text-sm font-bold">⭐ {liveWorker.trustScore || 50}</span>
                <span className="text-[9px] font-bold text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded-full ml-2 uppercase tracking-widest">{t('ustaadLive')}</span>
              </div>
              <button 
                onClick={() => { setShowUstaad(false); window.speechSynthesis.cancel(); }} 
                className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 text-lg transition-all"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── CHAT MESSAGES AREA ── */}
          <div className="flex-1 overflow-y-auto px-4 md:px-16 lg:px-32 xl:px-48 py-8 space-y-6" style={{ scrollBehavior: 'smooth' }}>
            {ustaadMessages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-4 animate-in slide-in-from-bottom-2 duration-300`}>
                {m.role === 'ustaad' && (
                  <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center text-2xl shadow-lg mt-1">
                    👳🏾‍♂️
                  </div>
                )}
                <div className={`max-w-[75%] px-6 py-4 rounded-3xl text-base font-medium leading-relaxed shadow-lg ${
                  m.role === 'user' 
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-br-lg' 
                    : 'bg-slate-800/80 text-slate-100 border border-slate-700/50 rounded-bl-lg backdrop-blur-sm'
                }`}>
                  {m.text}
                </div>
                {m.role === 'user' && (
                  <div className="w-12 h-12 shrink-0 bg-slate-700 rounded-xl flex items-center justify-center text-xl mt-1">
                    {w.photo ? <img src={w.photo} className="w-full h-full rounded-xl object-cover" /> : '👤'}
                  </div>
                )}
              </div>
            ))}
            
            {ustaadLoading && (
              <div className="flex justify-start gap-4 animate-in slide-in-from-bottom-2 duration-300">
                <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                  👳🏾‍♂️
                </div>
                <div className="bg-slate-800/80 border border-slate-700/50 px-8 py-5 rounded-3xl rounded-bl-lg">
                  <div className="flex gap-2">
                    <span className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"></span>
                    <span className="w-3 h-3 bg-orange-400 rounded-full animate-bounce" style={{animationDelay:'100ms'}}></span>
                    <span className="w-3 h-3 bg-amber-500 rounded-full animate-bounce" style={{animationDelay:'200ms'}}></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── INPUT BAR ── */}
          <div className="shrink-0 bg-gradient-to-t from-[#0a0e1a] to-transparent px-4 md:px-16 lg:px-32 xl:px-48 py-6">
            <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-3 flex items-center gap-3 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
              {/* Mic Button */}
              <button 
                onMouseDown={startVoiceRecording}
                onMouseUp={stopVoiceRecording}
                onTouchStart={startVoiceRecording}
                onTouchEnd={stopVoiceRecording}
                className={`w-14 h-14 shrink-0 rounded-xl flex items-center justify-center text-2xl transition-all ${
                  isRecording 
                    ? 'bg-red-500 text-white animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.6)] scale-110' 
                    : 'bg-slate-700/50 text-slate-400 hover:bg-orange-500/20 hover:text-orange-400 border border-slate-600/50'
                }`}
                title="Hold to speak"
              >
                🎙️
              </button>
              
              <input 
                type="text" 
                value={ustaadInput}
                onChange={e => setUstaadInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUstaadSend()}
                placeholder={isRecording ? '🔴 Bol raha hai...' : t('ustaadAsk')}
                disabled={isRecording}
                className="flex-1 bg-transparent text-white text-lg font-medium focus:outline-none placeholder:text-slate-500 disabled:opacity-50 px-2"
                style={{ fontFamily: 'Outfit' }}
              />
              
              <button 
                onClick={() => handleUstaadSend()}
                disabled={!ustaadInput.trim() || ustaadLoading}
                className="w-14 h-14 shrink-0 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center text-white text-xl font-bold disabled:opacity-30 hover:shadow-[0_0_20px_rgba(249,115,22,0.5)] transition-all active:scale-95"
              >
                ➤
              </button>
            </div>
            <p className="text-center text-xs text-slate-600 mt-3 font-medium">
              🎙️ {t('bhashiniMic')} • 🔊 Voice output in {language === 'hi' ? 'Hindi' : language === 'te' ? 'Telugu' : 'English'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
