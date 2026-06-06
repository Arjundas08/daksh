import React, { useState, useEffect } from 'react';
import SafetyAudit from './SafetyAudit';

const API_BASE = 'http://localhost:8000';

const SKILLS = ['Mason', 'Carpenter', 'Electrician', 'Plumber', 'Painter', 'Helper', 'Welder', 'Fitter', 'Supervisor'];

export default function ContractorDashboard({ contractor, language, onLogout }) {
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [suggestedWage, setSuggestedWage] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    skill_needed: 'Mason',
    location: 'Hyderabad',
    workers_needed: 2,
    duration_days: 10,
    wage_per_day: 950,
  });

  const c = contractor || {
    name: 'Sharma Constructions',
    company_name: 'Sharma Constructions',
    phone: '8888888881',
    trustScore: 90,
    jobsPosted: 0,
  };
  
  const displayName = c.company_name || c.name;

  // Fetch active jobs posted by this contractor
  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    try {
      const res = await fetch(`${API_BASE}/api/jobs?status=open`);
      const data = await res.json();
      if (data.success) {
        setActiveJobs(data.jobs);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  }

  // Fetch suggested wage when skill changes
  useEffect(() => {
    async function getWage() {
      try {
        const res = await fetch(`${API_BASE}/api/jobs/suggest-wage?skill=${formData.skill_needed}`);
        const data = await res.json();
        if (data.success) {
          setSuggestedWage(data.suggested_wage);
          setFormData(prev => ({ ...prev, wage_per_day: data.suggested_wage }));
        }
      } catch (err) { /* ignore */ }
    }
    getWage();
  }, [formData.skill_needed]);

  const handlePostJob = async (e) => {
    e.preventDefault();
    setPosting(true);
    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractor_name: displayName,
          contractor_phone: c.phone,
          ...formData,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        setFormData({ title: '', skill_needed: 'Mason', location: 'Hyderabad', workers_needed: 2, duration_days: 10, wage_per_day: 950 });
        fetchJobs(); // Refresh
      }
    } catch (err) {
      console.error('Failed to post job:', err);
    } finally {
      setPosting(false);
    }
  };

  const text = language === 'hi' ? {
    welcome: 'नमस्ते',
    postJob: '+ नया काम पोस्ट करें',
    activeJobs: 'सक्रिय नौकरियां',
    noJobs: 'कोई नौकरी पोस्ट नहीं की गई',
    deploy: '🤖 Agent को Deploy करें',
    trustScore: 'Trust Score',
    jobTitle: 'काम का नाम',
    skill: 'कौशल चाहिए',
    location: 'जगह',
    workers: 'मज़दूर चाहिए',
    duration: 'कितने दिन',
    wage: 'दैनिक मज़दूरी',
    cancel: 'रद्द करें',
    suggested: 'AI सुझाव',
    perDay: '/ दिन',
    open: 'खुला',
  } : {
    welcome: 'Hello',
    postJob: '+ Post New Job',
    activeJobs: 'Active Jobs',
    noJobs: 'No jobs posted yet',
    deploy: '🤖 Deploy to Agent',
    trustScore: 'Trust Score',
    jobTitle: 'Job Title',
    skill: 'Skill Needed',
    location: 'Location',
    workers: 'Workers Needed',
    duration: 'Duration (days)',
    wage: 'Daily Wage (₹)',
    cancel: 'Cancel',
    suggested: 'AI Suggested',
    perDay: '/ day',
    open: 'Open',
  };

  return (
    <div className="w-full max-w-7xl mx-auto pb-12 px-4 animate-in z-10 relative">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-2xl">
        <div>
          <h2 className="text-3xl font-black text-white drop-shadow-lg" style={{ fontFamily: 'Outfit' }}>
            {text.welcome}, {displayName}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl">🏗️</span>
            <span className="text-blue-400 font-bold tracking-wide">Contractor</span>
            <span className="text-white/40 px-2">•</span>
            <span className="text-white/70 font-semibold">{text.trustScore}: {c.trustScore}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSafety(true)} 
            className="btn-primary bg-purple-600 hover:bg-purple-500 border-none text-lg px-6 py-3 shadow-[0_0_30px_rgba(147,51,234,0.3)] flex items-center gap-2"
          >
            <span>🛡️</span> Run Safety Audit
          </button>
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="btn-primary btn-orange text-lg px-6 py-3 shadow-[0_0_30px_rgba(249,115,22,0.3)]"
          >
            {showForm ? text.cancel : text.postJob}
          </button>
          <button onClick={onLogout} className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:bg-red-500/20 hover:text-red-400 transition-colors shadow-lg backdrop-blur-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">

        {/* Left Column - Post Job Form or Stats */}
        <div className="lg:col-span-5 space-y-8">
          
          {showForm ? (
            <form onSubmit={handlePostJob} className="card-glass p-8 space-y-6 shadow-2xl">
              <h3 className="text-2xl font-black text-white">{text.postJob}</h3>
              
              <div>
                <label className="text-sm text-white/40 font-bold uppercase tracking-wider block mb-2">{text.jobTitle}</label>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-black/40 border-2 border-white/10 rounded-2xl px-4 py-3 text-white text-lg font-bold placeholder-white/20 focus:outline-none focus:border-blue-500/50 transition-all"
                  placeholder="e.g. High-Rise Brick Laying"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/40 font-bold uppercase tracking-wider block mb-2">{text.skill}</label>
                  <select
                    value={formData.skill_needed}
                    onChange={(e) => setFormData({...formData, skill_needed: e.target.value})}
                    className="w-full bg-black/40 border-2 border-white/10 rounded-2xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-blue-500/50 transition-all"
                  >
                    {SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-white/40 font-bold uppercase tracking-wider block mb-2">{text.location}</label>
                  <input
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full bg-black/40 border-2 border-white/10 rounded-2xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-blue-500/50 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-white/40 font-bold uppercase tracking-wider block mb-2">{text.workers}</label>
                  <input
                    type="number" min={1} max={50}
                    value={formData.workers_needed}
                    onChange={(e) => setFormData({...formData, workers_needed: parseInt(e.target.value)})}
                    className="w-full bg-black/40 border-2 border-white/10 rounded-2xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
                <div>
                  <label className="text-sm text-white/40 font-bold uppercase tracking-wider block mb-2">{text.duration}</label>
                  <input
                    type="number" min={1} max={365}
                    value={formData.duration_days}
                    onChange={(e) => setFormData({...formData, duration_days: parseInt(e.target.value)})}
                    className="w-full bg-black/40 border-2 border-white/10 rounded-2xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-white/40 font-bold uppercase tracking-wider block mb-2">
                  {text.wage}
                  {suggestedWage && (
                    <span className="text-blue-400 ml-2">({text.suggested}: ₹{suggestedWage})</span>
                  )}
                </label>
                <input
                  type="number" min={100}
                  value={formData.wage_per_day}
                  onChange={(e) => setFormData({...formData, wage_per_day: parseFloat(e.target.value)})}
                  className="w-full bg-black/40 border-2 border-white/10 rounded-2xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-blue-500/50 transition-all"
                />
              </div>

              <button 
                type="submit" 
                disabled={posting}
                className="btn-primary btn-green w-full text-xl py-4 shadow-[0_0_30px_rgba(34,197,94,0.3)] disabled:opacity-50"
              >
                {posting ? '⏳ Posting...' : text.deploy}
              </button>
            </form>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="bg-blue-400/10 border border-blue-400/30 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
                <h3 className="text-2xl font-bold text-white/90">{text.trustScore}</h3>
                <div className="text-[80px] leading-none font-black text-blue-400 mt-4" style={{ fontFamily: 'Outfit' }}>
                  {c.trustScore}
                </div>
                <div className="text-lg font-bold text-white/60">/ 100</div>
              </div>

              <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-inner text-center">
                <div className="text-white/40 text-sm font-bold uppercase tracking-wider mb-2">{text.activeJobs}</div>
                <div className="text-5xl font-black text-white">{activeJobs.length}</div>
              </div>
            </>
          )}
        </div>

        {/* Right Column - Active Jobs Feed */}
        <div className="lg:col-span-7">
          <h3 className="text-3xl font-black text-white mb-6 flex items-center gap-3 drop-shadow-md">
            <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
            {text.activeJobs}
          </h3>
          
          <div className="space-y-6">
            {loading ? (
              <div className="card-glass p-12 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-4 border-white/10 border-t-blue-500 animate-spin"></div>
              </div>
            ) : activeJobs.length === 0 ? (
              <div className="card-glass p-12 text-center">
                <p className="text-2xl text-white/50 font-bold">{text.noJobs}</p>
                <p className="text-white/30 mt-2">Click "{text.postJob}" to create your first job</p>
              </div>
            ) : (
              activeJobs.map((job) => (
                <div key={job.id} className="card-glass p-6 overflow-hidden relative shadow-xl border-blue-500/20">
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-blue-600 to-blue-400 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl shadow-lg uppercase tracking-widest">
                    {text.open}
                  </div>
                  
                  <h4 className="text-2xl font-black text-white mb-2">{job.title}</h4>
                  <p className="text-white/50 font-semibold mb-4 flex items-center gap-2">
                    <span className="text-blue-400">📍</span> {job.location}
                    <span className="text-white/20 px-1">•</span>
                    Needs: <span className="text-orange-400">{job.skill_needed}</span>
                  </p>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                      <div className="text-xs text-white/40 font-bold uppercase mb-1">Wage</div>
                      <div className="text-xl font-black text-green-400">₹{job.wage_per_day}</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                      <div className="text-xs text-white/40 font-bold uppercase mb-1">Duration</div>
                      <div className="text-xl font-black text-white">{job.duration_days}d</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                      <div className="text-xs text-white/40 font-bold uppercase mb-1">Workers</div>
                      <div className="text-xl font-black text-blue-400">{job.workers_needed}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {showSafety && (
        <SafetyAudit 
          contractorId={c.id || "demo-contractor"} 
          language={language} 
          onClose={() => setShowSafety(false)} 
        />
      )}
    </div>
  );
}
