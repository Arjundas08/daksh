import React, { useState, useEffect } from 'react';
import SafetyAudit from './SafetyAudit';

const API_BASE = 'http://localhost:8000';

const SKILLS = ['Mason', 'Carpenter', 'Electrician', 'Plumber', 'Painter', 'Helper', 'Welder', 'Fitter', 'Supervisor'];

export default function ContractorDashboard({ contractor, language, onLogout }) {
  const [activeTab, setActiveTab] = useState('jobs');
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [suggestedWage, setSuggestedWage] = useState(null);
  const [expandedJob, setExpandedJob] = useState(null);
  const [jobApplicants, setJobApplicants] = useState({});
  const [completingJob, setCompletingJob] = useState(null);
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
  };
  
  const displayName = c.company_name || c.name;

  // Fetch jobs posted by this contractor
  useEffect(() => {
    fetchMyJobs();
    const interval = setInterval(fetchMyJobs, 4000);
    return () => clearInterval(interval);
  }, [displayName]);

  async function fetchMyJobs() {
    try {
      const res = await fetch(`${API_BASE}/api/jobs/contractor/${encodeURIComponent(displayName)}/posted`);
      const data = await res.json();
      if (data.success) {
        setMyJobs(data.jobs);
        // Fetch applicants for each job that has them
        for (const job of data.jobs) {
          if (job.applicant_count > 0) {
            fetchApplicants(job.id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchApplicants(jobId) {
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/applicants`);
      const data = await res.json();
      if (data.success) {
        setJobApplicants(prev => ({ ...prev, [jobId]: data.applicants }));
      }
    } catch (err) {
      console.error('Failed to fetch applicants:', err);
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
        fetchMyJobs();
      }
    } catch (err) {
      console.error('Failed to post job:', err);
    } finally {
      setPosting(false);
    }
  };

  const handleCompleteJob = async (jobId) => {
    setCompletingJob(jobId);
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/complete`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.message}`);
        fetchMyJobs();
      }
    } catch (err) {
      console.error('Failed to complete job:', err);
    } finally {
      setCompletingJob(null);
    }
  };

  const tabs = [
    { id: 'jobs', label: 'My Jobs', icon: '📋' },
    { id: 'post', label: 'Post New Job', icon: '➕' },
    { id: 'safety', label: 'Safety Audit', icon: '🛡️' },
  ];

  const openJobs = myJobs.filter(j => j.status === 'open');
  const closedJobs = myJobs.filter(j => j.status === 'closed');

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 overflow-hidden font-sans">
      
      {/* ── SIDEBAR ── */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex shrink-0 z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.4)]">
              <span className="text-white font-black text-xl" style={{fontFamily: 'Outfit'}}>D</span>
            </div>
            <h1 className="text-2xl font-black text-white" style={{fontFamily: 'Outfit'}}>DAKSH</h1>
          </div>
          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest ml-[52px] -mt-1">Contractor</p>

          <div className="mt-6 bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Company</div>
            <div className="text-white font-bold text-sm truncate">{displayName}</div>
            <div className="text-slate-400 text-xs mt-1">📞 {c.phone}</div>
          </div>

          <nav className="space-y-2 mt-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'post') setShowForm(true);
                  if (tab.id === 'safety') setShowSafety(true);
                }}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-500 hover:bg-slate-800/50 hover:text-slate-300'
                }`}
              >
                <span className="text-xl">{tab.icon}</span>
                <span>{tab.label}</span>
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
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-10 relative">
        
        {/* Mobile Top Bar */}
        <div className="md:hidden flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <span className="text-white font-black text-sm">D</span>
            </div>
            <h1 className="text-xl font-black text-white">DAKSH</h1>
          </div>
          <button className="text-slate-400" onClick={onLogout}>Logout</button>
        </div>

        {/* ── Post Job Form (Modal-like) ── */}
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <form onSubmit={handlePostJob} className="max-w-lg w-full bg-slate-900 border border-slate-700 rounded-3xl p-8 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-white" style={{fontFamily:'Outfit'}}>Post New Job</h3>
                <button type="button" onClick={() => {setShowForm(false); setActiveTab('jobs');}} className="text-slate-500 hover:text-white text-2xl">✕</button>
              </div>
              
              <div>
                <label className="text-xs text-slate-500 font-bold uppercase tracking-widest block mb-2">Job Title</label>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="e.g. High-Rise Brick Laying"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-widest block mb-2">Skill Needed</label>
                  <select
                    value={formData.skill_needed}
                    onChange={(e) => setFormData({...formData, skill_needed: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-blue-500 transition-all"
                  >
                    {SKILLS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-widest block mb-2">Location</label>
                  <input
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-blue-500 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-widest block mb-2">Workers</label>
                  <input
                    type="number" min={1} max={50}
                    value={formData.workers_needed}
                    onChange={(e) => setFormData({...formData, workers_needed: parseInt(e.target.value)})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-widest block mb-2">Duration (Days)</label>
                  <input
                    type="number" min={1} max={365}
                    value={formData.duration_days}
                    onChange={(e) => setFormData({...formData, duration_days: parseInt(e.target.value)})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold uppercase tracking-widest block mb-2">
                    Wage/Day
                    {suggestedWage && <span className="text-blue-400 ml-1">(AI: ₹{suggestedWage})</span>}
                  </label>
                  <input
                    type="number" min={100}
                    value={formData.wage_per_day}
                    onChange={(e) => setFormData({...formData, wage_per_day: parseFloat(e.target.value)})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={posting}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-4 rounded-xl transition-all text-lg shadow-lg shadow-emerald-500/30 disabled:opacity-50 active:scale-[0.98]"
              >
                {posting ? '⏳ Posting...' : '🤖 Deploy to Agent Network'}
              </button>
            </form>
          </div>
        )}

        {/* ── JOBS VIEW ── */}
        {activeTab === 'jobs' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500 w-full">
            
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
              <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Trust Score</div>
                <div className="text-5xl font-black text-blue-400" style={{fontFamily:'Outfit'}}>{c.trustScore || 90}</div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Open Jobs</div>
                <div className="text-5xl font-black text-emerald-400" style={{fontFamily:'Outfit'}}>{openJobs.length}</div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Completed</div>
                <div className="text-5xl font-black text-amber-400" style={{fontFamily:'Outfit'}}>{closedJobs.length}</div>
              </div>
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl p-6 flex items-center justify-center cursor-pointer hover:scale-[1.02] transition-transform shadow-lg shadow-blue-500/20"
                   onClick={() => setShowForm(true)}>
                <span className="text-white font-black text-lg">+ Post New Job</span>
              </div>
            </div>

            {/* Open Jobs with Hired Workers */}
            <h2 className="text-3xl font-black text-white mb-6" style={{fontFamily:'Outfit'}}>
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse inline-block mr-3"></span>
              Active Jobs
            </h2>

            {loading ? (
              <div className="bg-slate-800 rounded-3xl p-16 flex items-center justify-center border border-slate-700">
                <div className="w-10 h-10 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin"></div>
              </div>
            ) : openJobs.length === 0 ? (
              <div className="bg-slate-800/50 rounded-3xl p-16 text-center border border-slate-700 border-dashed">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-slate-400 font-bold text-lg">No active jobs posted yet</p>
                <p className="text-slate-600 mt-2">Click "Post New Job" to deploy your first job to the Agent Network</p>
              </div>
            ) : (
              <div className="space-y-6">
                {openJobs.map(job => {
                  const applicants = jobApplicants[job.id] || [];
                  const isExpanded = expandedJob === job.id;
                  const totalEscrow = job.wage_per_day * job.duration_days * applicants.length;

                  return (
                    <div key={job.id} className="bg-slate-800 border border-slate-700 rounded-3xl overflow-hidden hover:border-slate-600 transition-colors">
                      {/* Job Header */}
                      <div className="p-8 cursor-pointer" onClick={() => setExpandedJob(isExpanded ? null : job.id)}>
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-2xl font-black text-white mb-2">{job.title}</h3>
                            <p className="text-slate-400 text-sm flex items-center gap-4">
                              <span>📍 {job.location}</span>
                              <span>•</span>
                              <span className="text-blue-400">{job.skill_needed}</span>
                              <span>•</span>
                              <span>{job.duration_days} days</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-emerald-400 font-black text-2xl">₹{job.wage_per_day}<span className="text-sm text-slate-600">/day</span></div>
                            {applicants.length > 0 && (
                              <span className="inline-flex items-center gap-1.5 mt-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                {applicants.length} Hired
                              </span>
                            )}
                            {applicants.length === 0 && (
                              <span className="inline-flex items-center gap-1.5 mt-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                                Waiting for workers...
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-6 bg-slate-900/50 p-4 rounded-2xl">
                          <div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Workers Needed</div>
                            <div className="text-xl font-black text-white">{job.workers_needed}</div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Escrow</div>
                            <div className="text-xl font-black text-amber-400">🔒 ₹{totalEscrow.toLocaleString()}</div>
                          </div>
                          <div className="ml-auto text-slate-500 text-2xl transition-transform" style={{transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'}}>
                            ▼
                          </div>
                        </div>
                      </div>

                      {/* Expanded: Show Hired Workers */}
                      {isExpanded && (
                        <div className="border-t border-slate-700 p-8 bg-slate-900/30">
                          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Hired Workers</h4>
                          
                          {applicants.length === 0 ? (
                            <p className="text-slate-500 italic">No workers have accepted this job yet. The ThekedaarAgent is scanning for matches...</p>
                          ) : (
                            <div className="space-y-3">
                              {applicants.map(worker => (
                                <div key={worker.worker_id} className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-2xl p-5">
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-lg shadow-lg">
                                      {worker.name.charAt(0)}
                                    </div>
                                    <div>
                                      <div className="text-white font-bold text-lg">{worker.name}</div>
                                      <div className="text-slate-400 text-sm flex items-center gap-3">
                                        <span className="text-blue-400">{worker.skill}</span>
                                        <span>•</span>
                                        <span>Trust: {worker.trust_score}</span>
                                        <span>•</span>
                                        <span className="text-emerald-400">📞 {worker.phone}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                                      worker.application_status === 'accepted' 
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                        : 'bg-slate-700 text-slate-400'
                                    }`}>
                                      {worker.application_status === 'accepted' ? '● Working' : worker.application_status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Complete & Pay button */}
                          {applicants.filter(a => a.application_status === 'accepted').length > 0 && (
                            <button
                              onClick={() => handleCompleteJob(job.id)}
                              disabled={completingJob === job.id}
                              className="mt-6 w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black py-5 rounded-xl transition-all text-lg shadow-lg shadow-emerald-500/30 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                              {completingJob === job.id ? (
                                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Processing Payment...</>
                              ) : (
                                <>💰 Mark Completed & Release Payment (₹{(job.wage_per_day * job.duration_days).toLocaleString()} per worker)</>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed Jobs */}
            {closedJobs.length > 0 && (
              <>
                <h2 className="text-2xl font-black text-slate-500 mt-12 mb-6" style={{fontFamily:'Outfit'}}>Completed Jobs</h2>
                <div className="space-y-4">
                  {closedJobs.map(job => (
                    <div key={job.id} className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 flex justify-between items-center">
                      <div>
                        <h4 className="text-lg font-bold text-slate-400">{job.title}</h4>
                        <p className="text-slate-600 text-sm">{job.location} • {job.skill_needed} • {job.duration_days} days</p>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest bg-slate-700/50 text-slate-500 px-3 py-1 rounded-full">✅ Completed</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {showSafety && (
        <div className="fixed inset-0 z-[100]">
          <SafetyAudit 
            contractorId={c.id || "demo-contractor"} 
            language={language} 
            onClose={() => {setShowSafety(false); setActiveTab('jobs');}} 
          />
        </div>
      )}
    </div>
  );
}
