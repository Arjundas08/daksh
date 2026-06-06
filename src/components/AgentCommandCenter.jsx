import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://localhost:8000';

const AGENT_CONFIG = {
  ThekedaarAgent: { icon: '🔍', color: '#f97316', label: 'Thekedaar', desc: 'Auto Job-Worker Matching' },
  MunshiAgent:    { icon: '🎙️', color: '#8b5cf6', label: 'Munshi', desc: 'Voice Data Extraction' },
  ResearchAgent:  { icon: '📊', color: '#06b6d4', label: 'Research', desc: 'Market Wage Analysis' },
  ComplianceAgent:{ icon: '📋', color: '#eab308', label: 'Compliance', desc: 'Document Validation' },
  SurakshaAgent:  { icon: '🛡️', color: '#22c55e', label: 'Suraksha', desc: 'Safety Monitoring' },
  Orchestrator:   { icon: '🧠', color: '#ec4899', label: 'Orchestrator', desc: 'Agent Manager' },
};

const ACTION_ICONS = {
  BOOT: '⚡',
  SCAN: '🔎',
  THINK: '🧠',
  MATCH: '✅',
  ERROR: '❌',
  STARTUP: '🚀',
};

export default function AgentCommandCenter({ onClose }) {
  const [logs, setLogs] = useState([]);
  const [isLive, setIsLive] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const logEndRef = useRef(null);
  const [agentStats, setAgentStats] = useState({});

  // Fetch logs every 2 seconds
  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch(`${API_BASE}/api/agents/logs`);
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs);
          
          // Build stats
          const stats = {};
          data.logs.forEach(log => {
            if (!stats[log.agent]) stats[log.agent] = { actions: 0, lastSeen: null };
            stats[log.agent].actions++;
            stats[log.agent].lastSeen = log.timestamp;
          });
          setAgentStats(stats);
        }
      } catch (err) {
        // Backend might be down
      }
    }

    fetchLogs();
    if (isLive) {
      const interval = setInterval(fetchLogs, 2000);
      return () => clearInterval(interval);
    }
  }, [isLive]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isLive && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isLive]);

  const filteredLogs = filter === 'ALL' ? logs : logs.filter(l => l.agent === filter);

  const formatTime = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch { return ''; }
  };

  const agentColor = (name) => AGENT_CONFIG[name]?.color || '#94a3b8';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose}></div>

      <div className="relative z-10 w-full max-w-6xl h-[85vh] bg-[#0a0a0f] border border-white/10 rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <span className="text-xl">🤖</span>
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0a0a0f] animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight" style={{ fontFamily: 'Outfit' }}>
                Agent Command Center
              </h2>
              <p className="text-white/40 text-xs font-bold tracking-widest uppercase">
                {Object.keys(agentStats).length} Agents Active • {logs.length} Events
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsLive(!isLive)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all ${
                isLive
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                  : 'bg-white/5 text-white/40 border border-white/10'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-white/30'}`}></span>
              {isLive ? 'LIVE' : 'PAUSED'}
            </button>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors">
              ✕
            </button>
          </div>
        </div>

        {/* Agent Status Bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-white/5 bg-white/[0.01] overflow-x-auto">
          <button
            onClick={() => setFilter('ALL')}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all ${
              filter === 'ALL'
                ? 'bg-white/10 text-white border border-white/20'
                : 'text-white/30 hover:text-white/60'
            }`}
          >
            All
          </button>
          {Object.entries(AGENT_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all ${
                filter === key
                  ? 'text-white border shadow-lg'
                  : 'text-white/30 hover:text-white/60'
              }`}
              style={filter === key ? { backgroundColor: cfg.color + '20', borderColor: cfg.color + '40', color: cfg.color } : {}}
            >
              <span>{cfg.icon}</span>
              {cfg.label}
              {agentStats[key] && (
                <span className="ml-1 bg-white/10 px-2 py-0.5 rounded-full text-[10px]">
                  {agentStats[key].actions}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Agent Cards Row */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 px-6 py-3 border-b border-white/5">
          {Object.entries(AGENT_CONFIG).map(([key, cfg]) => {
            const active = !!agentStats[key];
            return (
              <div
                key={key}
                className="relative p-3 rounded-xl border text-center transition-all"
                style={{
                  backgroundColor: active ? cfg.color + '08' : 'transparent',
                  borderColor: active ? cfg.color + '30' : 'rgba(255,255,255,0.05)',
                }}
              >
                <div className="text-2xl mb-1">{cfg.icon}</div>
                <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: active ? cfg.color : 'rgba(255,255,255,0.25)' }}>
                  {cfg.label}
                </div>
                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${active ? 'animate-pulse' : ''}`} style={{ backgroundColor: active ? cfg.color : 'rgba(255,255,255,0.1)' }}></div>
              </div>
            );
          })}
        </div>

        {/* Log Stream */}
        <div className="flex-1 overflow-y-auto px-6 py-4 font-mono text-sm space-y-1" style={{ scrollbarWidth: 'thin' }}>
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 space-y-4">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-3xl animate-pulse">🤖</div>
              <div>
                <p className="text-white font-bold">Waiting for Agent Activity...</p>
                <p className="text-white/50 text-xs mt-1">Agents run every 15 seconds. Logs will appear here automatically.</p>
              </div>
            </div>
          ) : (
            filteredLogs.map((log, i) => {
              const cfg = AGENT_CONFIG[log.agent] || {};
              const actionIcon = ACTION_ICONS[log.action] || '▸';
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.03] transition-colors group"
                  style={{
                    animationName: i === filteredLogs.length - 1 ? 'slideUp' : undefined,
                    animationDuration: '0.3s',
                  }}
                >
                  {/* Timestamp */}
                  <span className="text-white/20 text-xs font-medium shrink-0 pt-0.5 w-[70px]">
                    {formatTime(log.timestamp)}
                  </span>

                  {/* Agent Badge */}
                  <span
                    className="text-[10px] font-black uppercase tracking-widest shrink-0 px-2 py-0.5 rounded-md w-[100px] text-center"
                    style={{ backgroundColor: (cfg.color || '#666') + '20', color: cfg.color || '#999' }}
                  >
                    {cfg.label || log.agent}
                  </span>

                  {/* Action */}
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider shrink-0 px-2 py-0.5 rounded-md w-[60px] text-center"
                    style={{
                      backgroundColor: log.action === 'MATCH' ? 'rgba(34,197,94,0.15)' : log.action === 'ERROR' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                      color: log.action === 'MATCH' ? '#22c55e' : log.action === 'ERROR' ? '#ef4444' : 'rgba(255,255,255,0.5)'
                    }}
                  >
                    {actionIcon} {log.action}
                  </span>

                  {/* Details */}
                  <span className="text-white/70 text-xs leading-relaxed">
                    {log.details}
                  </span>
                </div>
              );
            })
          )}
          <div ref={logEndRef} />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-white/30 font-bold tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            System Operational • Polling every 2s
          </div>
          <div className="text-[10px] text-white/20 font-medium">
            DAKSH Agent Network v2.0
          </div>
        </div>
      </div>
    </div>
  );
}
