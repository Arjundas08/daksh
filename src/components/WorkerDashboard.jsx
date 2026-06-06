import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const API_BASE = 'http://localhost:8000';

export default function WorkerDashboard({ worker, language, onLogout }) {
  const [activeTab, setActiveTab] = useState('home');
  const [jobs, setJobs] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const w = worker || {
    id: 'DEMO-001',
    name: 'Unknown',
    skill: 'Helper',
    location: 'Unknown',
    trustScore: 50,
    jobsCompleted: 0,
    earnings: 0,
  };

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
  const skillIcon = skillIcons[w.skill] || skillIcons.Default;

  const t = {
    hi: {
      welcome: 'नमस्ते', trustScore: 'Trust Score', trustSub: 'आपका भरोसा मीटर',
      jobs: 'काम पूरे', earnings: 'कुल कमाई', newMatches: 'नए काम',
      accept: 'स्वीकार करें', idTitle: 'Digital ID', noJobs: 'कोई नया काम नहीं',
      perDay: '/दिन', days: 'दिन', matchTag: 'Skill Match', otherTag: 'Other',
      verified: 'Verified', home: 'होम', feed: 'काम खोजें', active: 'मेरा काम',
    },
    en: {
      welcome: 'Welcome', trustScore: 'Trust Score', trustSub: 'Reliability Rating',
      jobs: 'Jobs Done', earnings: 'Earned', newMatches: 'New Matches',
      accept: 'Accept', idTitle: 'Digital ID', noJobs: 'No jobs available',
      perDay: '/day', days: 'days', matchTag: 'Match', otherTag: 'Other',
      verified: 'Verified', home: 'Home', feed: 'Find Work', active: 'My Work',
    }
  };
  const text = t[language] || t.en;
  const score = w.trustScore || 50;

  const tabs = [
    { id: 'home', label: text.home, icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>
    )},
    { id: 'feed', label: text.feed, icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
    ), badge: jobs.length },
    { id: 'active', label: text.active, icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
    ), badge: activeJobs.length },
  ];

  /* ─────────────────── HOME TAB ─────────────────── */
  const renderHome = () => (
    <div className="space-y-8 animate-in">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 sm:p-10 border border-slate-700/50">
        <div className="flex items-center gap-4 mb-1">
          <span className="text-3xl">{skillIcon}</span>
          <span className="text-xs font-bold tracking-widest uppercase text-orange-400 bg-orange-400/10 px-3 py-1 rounded-full">{w.skill}</span>
          <span className="text-xs text-slate-500 font-medium">{w.location}</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white mt-4 tracking-tight" style={{ fontFamily: 'Outfit' }}>
          {text.welcome}, {w.name.split(' ')[0]} 👋
        </h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-5">
        <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 text-center hover:border-orange-500/30 transition-colors">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">{text.trustScore}</div>
          <div className={`text-5xl font-black ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-rose-400'}`} style={{ fontFamily: 'Outfit' }}>{score}</div>
          <div className="text-[10px] text-slate-600 font-bold mt-1">/ 100</div>
        </div>
        <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 text-center hover:border-blue-500/30 transition-colors">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">{text.jobs}</div>
          <div className="text-5xl font-black text-white" style={{ fontFamily: 'Outfit' }}>{w.jobsCompleted || 0}</div>
          <div className="text-[10px] text-slate-600 font-bold mt-1">completed</div>
        </div>
        <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 text-center hover:border-emerald-500/30 transition-colors">
          <div className="text-[11px] font-bold text-emerald-500/70 uppercase tracking-widest mb-3">{text.earnings}</div>
          <div className="text-4xl font-black text-emerald-400" style={{ fontFamily: 'Outfit' }}>₹{(w.earnings || 0).toLocaleString()}</div>
          <div className="text-[10px] text-slate-600 font-bold mt-1">total</div>
        </div>
      </div>

      {/* Digital ID */}
      <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6 flex items-center gap-6">
        <div className="bg-white p-3 rounded-xl shrink-0 shadow-lg">
          <QRCodeSVG value={`https://daksh.app/verify/${w.id}`} size={72} level="H" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white mb-1">{text.idTitle}</h3>
          <p className="text-sm text-slate-400 font-mono tracking-wider mb-2 truncate">{w.id}</p>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            {text.verified}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setActiveTab('feed')}
          className="rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-bold py-5 text-lg transition-all hover:shadow-[0_8px_30px_rgba(249,115,22,0.3)] active:scale-[0.97]"
        >
          🔍 {text.feed}
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className="rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold py-5 text-lg border border-slate-700 transition-all active:scale-[0.97]"
        >
          📋 {text.active} {activeJobs.length > 0 && `(${activeJobs.length})`}
        </button>
      </div>
    </div>
  );

  /* ─────────────────── JOB FEED TAB ─────────────────── */
  const renderFeed = () => (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white" style={{ fontFamily: 'Outfit' }}>
          {text.newMatches}
        </h2>
        {jobs.length > 0 && (
          <span className="text-xs font-bold text-slate-500 bg-slate-800 px-3 py-1.5 rounded-full tracking-widest">{jobs.length} JOBS</span>
        )}
      </div>

      {loadingJobs ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-16 flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full border-3 border-slate-700 border-t-orange-500 animate-spin mb-4"></div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Scanning...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-16 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-lg text-slate-500 font-bold">{text.noJobs}</p>
          <p className="text-sm text-slate-600 mt-2">New jobs appear automatically</p>
        </div>
      ) : (
        jobs.map((job) => {
          const isMatch = job.skill_needed.toLowerCase() === w.skill.toLowerCase();
          const matchPercent = isMatch ? Math.min(99, 80 + Math.floor(score / 5)) : Math.floor(30 + Math.random() * 20);

          return (
            <div key={job.id} className="group rounded-2xl border border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/60 p-6 sm:p-8 transition-all duration-300 hover:border-slate-600">

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <span className={`text-[11px] font-bold tracking-widest px-3 py-1.5 rounded-full ${isMatch ? 'text-orange-400 bg-orange-500/10 border border-orange-500/20' : 'text-slate-500 bg-slate-800 border border-slate-700'}`}>
                  {isMatch && '● '}{matchPercent}% {isMatch ? text.matchTag : text.otherTag}
                </span>
                <span className="text-xs text-slate-500 font-medium">{job.contractor_name}</span>
              </div>

              {/* Title */}
              <h3 className="text-2xl sm:text-3xl font-black text-white mb-2 group-hover:text-orange-300 transition-colors">{job.title}</h3>
              <p className="text-sm text-slate-500 flex items-center gap-2 mb-6">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {job.location}
              </p>

              {/* Info row */}
              <div className="flex items-center gap-6 mb-6 text-sm">
                <div>
                  <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest block">Wage</span>
                  <span className="text-emerald-400 font-black text-lg">₹{job.wage_per_day}<span className="text-slate-600 text-xs font-medium">{text.perDay}</span></span>
                </div>
                <div className="w-px h-8 bg-slate-700"></div>
                <div>
                  <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest block">Duration</span>
                  <span className="text-white font-black text-lg">{job.duration_days} <span className="text-slate-600 text-xs font-medium">{text.days}</span></span>
                </div>
                <div className="w-px h-8 bg-slate-700"></div>
                <div>
                  <span className="text-slate-600 text-[10px] font-bold uppercase tracking-widest block">Workers</span>
                  <span className="text-blue-400 font-black text-lg">{job.workers_needed}</span>
                </div>
              </div>

              {/* Action */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleAcceptJob(job.id)}
                  disabled={processingId === job.id}
                  className={`flex-1 bg-white text-slate-900 hover:bg-orange-500 hover:text-white font-bold py-3.5 rounded-xl transition-all duration-300 active:scale-[0.97] text-base ${processingId === job.id ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {processingId === job.id ? '⏳ Accepting...' : `✓ ${text.accept}`}
                </button>
                <button className="w-14 flex items-center justify-center rounded-xl border border-slate-700 text-slate-600 hover:text-rose-400 hover:border-rose-500/50 transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  /* ─────────────────── ACTIVE WORK TAB ─────────────────── */
  const renderActive = () => (
    <div className="space-y-6 animate-in">
      <h2 className="text-2xl font-black text-white" style={{ fontFamily: 'Outfit' }}>
        {text.active}
      </h2>

      {activeJobs.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-16 text-center">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-lg text-slate-500 font-bold">No active work</p>
          <p className="text-sm text-slate-600 mt-2 mb-6">Accept a job from the feed to get started</p>
          <button onClick={() => setActiveTab('feed')} className="bg-orange-500 hover:bg-orange-400 text-white font-bold px-8 py-3 rounded-xl transition-all">
            Browse Jobs →
          </button>
        </div>
      ) : (
        activeJobs.map(job => (
          <div key={job.id} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 sm:p-8">
            {/* Status */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full tracking-widest">
                ● ACCEPTED
              </span>
              <span className="text-xs text-slate-500 font-medium">{job.contractor_name}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">{job.title}</h3>

            <div className="flex items-center gap-4 text-sm mb-8">
              <span className="text-emerald-400 font-bold text-lg">₹{job.wage_per_day}/day</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">{job.location}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">{job.duration_days} {text.days}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-base active:scale-[0.97]">
                📞 Call Contractor
              </button>
              <button className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 text-base active:scale-[0.97]">
                🗺️ Navigate
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-[#0f172a] z-10 relative">
      {/* Content Area */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-28">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'feed' && renderFeed()}
        {activeTab === 'active' && renderActive()}
      </div>

      {/* ── BOTTOM NAVIGATION BAR ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-around py-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center gap-1 px-6 py-2.5 rounded-xl transition-all duration-200 ${
                activeTab === tab.id
                  ? 'text-orange-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.icon}
              <span className="text-[11px] font-bold tracking-wide">{tab.label}</span>
              {tab.badge > 0 && (
                <span className="absolute -top-0.5 right-2 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-black px-1">
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute -bottom-2 w-8 h-1 rounded-full bg-orange-500"></span>
              )}
            </button>
          ))}
          {/* Logout in nav */}
          <button
            onClick={onLogout}
            className="flex flex-col items-center gap-1 px-6 py-2.5 rounded-xl text-slate-600 hover:text-rose-400 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span className="text-[11px] font-bold tracking-wide">Logout</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
