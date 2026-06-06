import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
            // Danger thresholds: Temp > 35C or Wind > 20 km/h
            if (data.current_weather.temperature > 35 || data.current_weather.windspeed > 20) {
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
      if (data.success) {
        setUstaadMessages(prev => [...prev, { role: 'ustaad', text: data.reply }]);
        
        // Use Bhashini TTS for voice output
        try {
          const ttsRes = await fetch(`${API_BASE}/api/voice/synthesize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: data.reply, language: language === 'te' ? 'te' : 'hi', gender: 'male' })
          });
          if (ttsRes.ok) {
            const audioBlob = await ttsRes.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.play().catch(() => {});
          }
        } catch(ttsErr) {
          // Fallback to browser speech synthesis
          if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(data.reply);
            const voices = window.speechSynthesis.getVoices();
            const hiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN'));
            if (hiVoice) utterance.voice = hiVoice;
            window.speechSynthesis.speak(utterance);
          }
        }
      }
    } catch(e) {
      console.error(e);
    } finally {
      setUstaadLoading(false);
    }
  };

  // Voice recording for Ustaad AI (Bhashini ASR)
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'voice.webm');
        formData.append('language', language === 'te' ? 'te' : 'hi');
        
        setUstaadLoading(true);
        try {
          const res = await fetch(`${API_BASE}/api/voice/transcribe`, {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data.success && data.text) {
            handleUstaadSend(data.text);
          }
        } catch(err) {
          console.error('Voice transcription failed:', err);
          setUstaadLoading(false);
        }
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch(err) {
      console.error('Microphone access denied:', err);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
  };

  const skillIcon = skillIcons[w.skill] || skillIcons.Default;

  const score = liveWorker.trustScore || 50;

  // Tabs for Sidebar
  const tabs = [
    { id: 'home', label: 'Overview', icon: '🏠' },
    { id: 'feed', label: 'Find Work', icon: '🔍', badge: jobs.length },
    { id: 'active', label: 'Active Contracts', icon: '📋', badge: activeJobs.length },
    { id: 'wallet', label: 'Escrow Wallet', icon: '💰' },
    { id: 'growth', label: 'Income Simulator', icon: '📈' },
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
                <span className={`${isDanger && temp > 35 ? 'text-rose-400' : 'text-emerald-400'} mt-0.5`}>🌡️</span>
                <div>
                  <span className="text-white font-bold block">Local Temperature: {temp}°C</span>
                  <span className="text-slate-400 text-sm">
                    {temp > 35 ? "Critical heat stroke risk detected today." : "Temperature is within safe working limits."}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className={`${isDanger && wind > 20 ? 'text-rose-400' : 'text-emerald-400'} mt-0.5`}>🌪️</span>
                <div>
                  <span className="text-white font-bold block">Wind Speed: {wind} km/h</span>
                  <span className="text-slate-400 text-sm">
                    {wind > 20 ? "High winds. Scaffolding work is highly unsafe." : "Wind conditions are stable."}
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
                <li className="flex items-center gap-2"><span>✅</span> {isDanger ? 'Extra water break every 30 mins' : 'Stay hydrated regularly'}</li>
                <li className="flex items-center gap-2"><span>✅</span> {isDanger ? 'Mandatory harness double-check due to wind' : 'Wear standard safety gear'}</li>
                {isDanger && <li className="flex items-center gap-2"><span>✅</span> Site operations halt at 12:00 PM</li>}
              </ul>
            </div>

            <div className={isDanger ? "grid grid-cols-2 gap-3 pt-2" : "pt-2"}>
              {isDanger ? (
                <>
                  <button 
                    onClick={() => setShowSafetyWarning(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-all"
                  >
                    Aaj Nahi (Skip)
                  </button>
                  <button 
                    onClick={() => setShowSafetyWarning(false)}
                    className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-rose-500/30"
                  >
                    Main Taiyar Hu
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
          <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Outfit' }}>Welcome, {w.name.split(' ')[0]} 👋</h1>
          <p className="text-slate-400 mt-1">Here is your digital shram profile.</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 px-4 py-2 rounded-xl flex items-center gap-3">
          <span className="text-2xl">{skillIcon}</span>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Primary Skill</span>
            <span className="text-white font-bold">{w.skill}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-2 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10 text-8xl">🛡️</div>
          <div className="relative z-10">
            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Trust Score</div>
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
            <span>✓</span> Verified Identity
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-3xl bg-slate-800 border border-slate-700 p-8">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Jobs Completed</div>
          <div className="text-5xl font-black text-white" style={{ fontFamily: 'Outfit' }}>{liveWorker.jobsCompleted || 0}</div>
        </div>
        <div className="rounded-3xl bg-slate-800 border border-slate-700 p-8">
          <div className="text-emerald-500/70 text-xs font-bold uppercase tracking-widest mb-4">Total Earnings</div>
          <div className="text-5xl font-black text-emerald-400" style={{ fontFamily: 'Outfit' }}>₹{(liveWorker.earnings || 0).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );

  /* ─────────────────── FEED TAB ─────────────────── */
  const renderFeed = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 w-full">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'Outfit' }}>AI Recommended Jobs</h2>
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
          <p className="text-slate-400 font-bold">No jobs matching your profile right now.</p>
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
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Wage</div>
                  <div className="text-xl font-black text-emerald-400">₹{job.wage_per_day}<span className="text-xs text-slate-600 ml-1">/day</span></div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Duration</div>
                  <div className="text-xl font-black text-white">{job.duration_days} <span className="text-xs text-slate-600">days</span></div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Need</div>
                  <div className="text-xl font-black text-blue-400">{job.workers_needed} <span className="text-xs text-slate-600">workers</span></div>
                </div>
              </div>

              <button
                onClick={() => handleAcceptJob(job.id)}
                disabled={processingId === job.id}
                className="w-full bg-white hover:bg-orange-500 text-slate-900 hover:text-white font-black py-4 rounded-xl transition-all active:scale-[0.98]"
              >
                {processingId === job.id ? 'ACCEPTING...' : 'ACCEPT JOB INSTANTLY'}
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
      <h2 className="text-3xl font-black text-white mb-8" style={{ fontFamily: 'Outfit' }}>Active Contracts</h2>
      {workingJobs.length === 0 ? (
        <div className="p-16 text-center bg-slate-800/50 rounded-3xl border border-slate-700 border-dashed">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-slate-400 font-bold text-lg">No active work right now</p>
          <p className="text-slate-600 mt-2">Accept a job from the Find Work tab to start earning</p>
        </div>
      ) : (
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

                <div className="grid grid-cols-3 gap-3 mb-5 bg-slate-900/50 p-4 rounded-2xl">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Wage</div>
                    <div className="text-lg font-black text-emerald-400">₹{job.wage_per_day}<span className="text-xs text-slate-600">/day</span></div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Duration</div>
                    <div className="text-lg font-black text-white">{job.duration_days} days</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total</div>
                    <div className="text-lg font-black text-amber-400">₹{totalEarning.toLocaleString()}</div>
                  </div>
                </div>

                <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 mb-5">
                  <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">📅 Shift Schedule</div>
                  <div className="text-white font-bold">08:00 AM — 05:00 PM</div>
                  <div className="text-slate-400 text-xs mt-1">Mon-Sat • 1hr Lunch Break (12:00 PM)</div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black py-3 rounded-xl flex justify-center items-center gap-2 text-sm transition-all">
                    <span>📞</span> Call Contractor
                  </button>
                  <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-black py-3 rounded-xl flex justify-center items-center gap-2 text-sm transition-all">
                    <span>🗺️</span> Navigate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed Jobs History */}
      {completedJobs.length > 0 && (
        <>
          <h3 className="text-xl font-black text-slate-500 mt-10 mb-4" style={{ fontFamily: 'Outfit' }}>Completed Work</h3>
          <div className="space-y-3">
            {completedJobs.map(job => (
              <div key={job.id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 flex justify-between items-center">
                <div>
                  <div className="text-white font-bold">{job.title}</div>
                  <div className="text-slate-500 text-sm">{job.contractor_name} • {job.location}</div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-400 font-black">+₹{(job.wage_per_day * job.duration_days).toLocaleString()}</div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">✅ Paid</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  /* ─────────────────── WALLET TAB (ESCROW) ─────────────────── */
  const lockedEscrow = workingJobs.reduce((sum, j) => sum + (j.wage_per_day * j.duration_days), 0);
  const realBalance = liveWorker.earnings || 0;

  const renderWallet = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 w-full">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'Outfit' }}>Escrow Wallet</h2>
        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Smart Contract Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Available Balance */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Available Balance</div>
            <div className="text-6xl font-black text-emerald-400 mb-4" style={{ fontFamily: 'Outfit' }}>₹{realBalance.toLocaleString()}</div>
            <div className="flex gap-3">
              <button className="bg-white hover:bg-slate-200 text-slate-900 font-black px-5 py-3 rounded-xl flex items-center gap-2 text-sm transition-all">
                <span>🏦</span> Withdraw to Bank
              </button>
            </div>
          </div>
        </div>

        {/* Locked Escrow */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/20 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Locked in Escrow</div>
            <div className="text-6xl font-black text-amber-400 mb-4" style={{ fontFamily: 'Outfit' }}>₹{lockedEscrow.toLocaleString()}</div>
            <p className="text-slate-500 text-sm">Auto-released when contractor marks work complete</p>
          </div>
        </div>
      </div>

      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Active Escrow Contracts</h3>
      <div className="space-y-4">
        {workingJobs.length === 0 ? (
          <div className="bg-slate-800/50 rounded-3xl p-12 text-center border border-slate-700 border-dashed">
            <p className="text-slate-500">No funds currently locked in escrow.</p>
          </div>
        ) : (
          workingJobs.map(job => {
            const total = job.wage_per_day * job.duration_days;
            return (
              <div key={job.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex justify-between items-center">
                <div>
                  <div className="text-white font-bold text-lg mb-1">{job.title}</div>
                  <div className="text-slate-400 text-sm">{job.contractor_name} • Payout on completion</div>
                </div>
                <div className="text-right">
                  <div className="text-amber-400 font-black text-xl flex items-center gap-2 justify-end">
                    <span>🔒</span> ₹{total.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-1">Locked in Escrow</div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Payment History */}
      {completedJobs.length > 0 && (
        <>
          <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest mt-8 mb-4">Payment History</h3>
          <div className="space-y-3">
            {completedJobs.map(job => (
              <div key={job.id} className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 flex justify-between items-center">
                <div>
                  <div className="text-white font-bold">{job.title}</div>
                  <div className="text-slate-500 text-sm">{job.contractor_name}</div>
                </div>
                <div className="text-emerald-400 font-black text-lg">+₹{(job.wage_per_day * job.duration_days).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  /* ─────────────────── GROWTH TAB (INCOME SIMULATOR) ─────────────────── */
  const renderGrowth = () => {
    // Math for the simulator
    const baseWage = 800;
    const skillMultiplier = simSkill === 'Supervisor' ? 1.7 : 1.0;
    const toolMultiplier = simLoan ? 1.2 : 1.0;
    const monthlyDays = 25;
    
    const monthlyIncome = baseWage * skillMultiplier * toolMultiplier * monthlyDays;
    
    const chartData = [
      { name: 'Current', value: baseWage * 25 },
      { name: 'Year 1', value: monthlyIncome * 12 },
      { name: 'Year 3', value: monthlyIncome * 12 * 3.5 }, // assume slight compound growth
      { name: 'Year 5', value: monthlyIncome * 12 * 6 },
    ];

    const targetIncome = 25000;
    const currentEarnings = liveWorker.earnings || 0;
    const remaining = Math.max(0, targetIncome - currentEarnings);
    const jobsNeeded = Math.ceil(remaining / baseWage);

    return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 w-full">
        {/* ── MUNSHI AI (FINANCIAL AGENT) ── */}
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 border border-indigo-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(79,70,229,0.2)]">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-3xl shrink-0">📊</div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-black text-white" style={{ fontFamily: 'Outfit' }}>Munshi AI <span className="text-indigo-300 text-sm ml-2 font-semibold">Your Financial Agent</span></h3>
                <span className="text-xs font-bold text-white bg-indigo-500/50 px-3 py-1 rounded-full uppercase tracking-widest">Monthly Target: ₹{targetIncome.toLocaleString()}</span>
              </div>
              <p className="text-indigo-100/80 leading-relaxed mb-6 font-medium">
                Bhai, you have earned <strong className="text-emerald-400 font-black">₹{currentEarnings.toLocaleString()}</strong> this month. 
                {remaining > 0 
                  ? ` You need ₹${remaining.toLocaleString()} more. Just take ${jobsNeeded} more days of ${w.skill} work at ₹${baseWage}/day and your target is hit! Keep going!` 
                  : ` Amazing! You have hit your monthly target. Any extra work now is pure bonus!`}
              </p>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-indigo-200">
                  <span>Current: ₹{currentEarnings.toLocaleString()}</span>
                  <span>Goal: ₹{targetIncome.toLocaleString()}</span>
                </div>
                <div className="w-full h-3 bg-indigo-950 rounded-full overflow-hidden border border-indigo-500/20">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000 relative"
                    style={{ width: `${Math.min(100, (currentEarnings / targetIncome) * 100)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'Outfit' }}>See Your Future</h2>
            <p className="text-slate-400 mt-1">Play with the sliders to see how skills and tools increase your wealth.</p>
          </div>
          {score >= 80 && (
            <div className="bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-xl text-amber-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <span>🔓</span> Micro-Loan Unlocked
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-12 gap-8">
          {/* Controls */}
          <div className="md:col-span-5 space-y-8">
            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Skill Level</div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSimSkill('Current')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${simSkill === 'Current' ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}
                >
                  {w.skill}
                </button>
                <button 
                  onClick={() => setSimSkill('Supervisor')}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${simSkill === 'Supervisor' ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}
                >
                  Supervisor
                </button>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Own Equipment</div>
                {score < 80 && <span className="text-[10px] text-rose-400 font-bold bg-rose-500/10 px-2 py-1 rounded">Score &lt; 80 (Locked)</span>}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSimLoan(false)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${!simLoan ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}
                >
                  Contractor Tools
                </button>
                <button 
                  onClick={() => {
                    if (score >= 80) setSimLoan(true);
                  }}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${simLoan ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-900 text-slate-400 border border-slate-700'} ${score < 80 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Get Loan
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500 to-rose-500 rounded-3xl p-6 text-white shadow-[0_10px_30px_rgba(249,115,22,0.3)]">
              <div className="text-orange-100 text-xs font-bold uppercase tracking-widest mb-1">Projected Monthly</div>
              <div className="text-4xl font-black mb-2">₹{monthlyIncome.toLocaleString()}</div>
              <div className="text-sm font-medium text-rose-100">+ {Math.round((monthlyIncome / (baseWage * 25) - 1) * 100)}% increase</div>
            </div>
          </div>

          {/* Chart */}
          <div className="md:col-span-7 bg-slate-800 border border-slate-700 rounded-3xl p-6" style={{minHeight: '400px', height: '400px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  cursor={{ fill: '#1e293b' }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }}
                  formatter={(value) => [`₹${value.toLocaleString()}`, 'Earnings']}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#475569' : '#f97316'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  }

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

      {/* ── USTAAD AI CHAT MODAL ── */}
      {showUstaad && (
        <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full md:w-[440px] h-[85vh] md:h-[650px] bg-slate-900 md:rounded-3xl border border-slate-800 flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
                  👳🏾‍♂️
                </div>
                <div>
                  <h3 className="text-white font-black text-lg leading-tight">Ustaad AI</h3>
                  <p className="text-orange-100/70 text-[10px] uppercase font-bold tracking-widest">Mentor + Munshi</p>
                </div>
              </div>
              <button onClick={() => { setShowUstaad(false); window.speechSynthesis.cancel(); }} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 text-lg">✕</button>
            </div>

            {/* Financial Strip */}
            <div className="bg-indigo-900/60 border-b border-indigo-500/20 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-indigo-300 text-xs font-bold">💰 ₹{(liveWorker.earnings || 0).toLocaleString()}</span>
                <span className="text-indigo-400/50">|</span>
                <span className="text-indigo-300 text-xs font-bold">📋 {liveWorker.jobsCompleted || 0} jobs</span>
                <span className="text-indigo-400/50">|</span>
                <span className="text-indigo-300 text-xs font-bold">⭐ {liveWorker.trustScore || 50}</span>
              </div>
              <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full">LIVE DATA</span>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {ustaadMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                  {m.role === 'ustaad' && <span className="text-2xl mt-1">👳🏾‍♂️</span>}
                  <div className={`max-w-[80%] p-3.5 rounded-2xl text-sm font-medium leading-relaxed ${m.role === 'user' ? 'bg-orange-500 text-white rounded-br-sm' : 'bg-slate-800 text-white border border-slate-700 rounded-bl-sm'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {ustaadLoading && (
                <div className="flex justify-start gap-2">
                  <span className="text-2xl mt-1">👳🏾‍♂️</span>
                  <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl rounded-bl-sm">
                    <span className="flex gap-1">
                      <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{animationDelay:'75ms'}}></span>
                      <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{animationDelay:'150ms'}}></span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Input with Voice */}
            <div className="p-3 bg-slate-800/50 border-t border-slate-800">
              <div className="flex items-center gap-2">
                {/* Mic Button — Bhashini Voice Input */}
                <button 
                  onMouseDown={startVoiceRecording}
                  onMouseUp={stopVoiceRecording}
                  onTouchStart={startVoiceRecording}
                  onTouchEnd={stopVoiceRecording}
                  className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-all ${
                    isRecording 
                      ? 'bg-red-500 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]' 
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
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
                  placeholder={isRecording ? '🔴 Bol raha hai...' : 'Type ya mic dabao...'}
                  disabled={isRecording}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500 disabled:opacity-50"
                />
                <button 
                  onClick={() => handleUstaadSend()}
                  disabled={!ustaadInput.trim() || ustaadLoading}
                  className="w-12 h-12 shrink-0 rounded-xl bg-orange-500 flex items-center justify-center text-white disabled:opacity-50 hover:bg-orange-400 transition-colors"
                >
                  ➤
                </button>
              </div>
              <p className="text-center text-[9px] text-slate-600 mt-1.5 font-medium">🎙️ Hold mic for voice in Hindi/Telugu/English • Powered by Bhashini</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
