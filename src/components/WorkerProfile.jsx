import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * WorkerProfile — The beautiful Digital ID card shown after registration.
 * Displays worker info, QR code, and a premium startup-grade card design.
 */
export default function WorkerProfile({ worker, language, onBack, onDashboard }) {
  if (!worker) return null;

  const idShort = worker.id?.slice(0, 8)?.toUpperCase() || 'XXXXXXXX';
  const createdDate = worker.created_at
    ? new Date(worker.created_at).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      });

  // Skill icon mapping
  const skillIcons = {
    Mason: '🧱', Carpenter: '🪵', Helper: '🤝', Electrician: '⚡',
    Plumber: '🔧', Painter: '🎨', Supervisor: '📋', Welder: '🔥',
    Fitter: '⚙️', Default: '👷',
  };

  const skillIcon = skillIcons[worker.skill] || skillIcons.Default;

  const t = {
    hi: {
      title: 'Digital Shram ID',
      name: 'नाम',
      skill: 'हुनर',
      exp: 'अनुभव',
      location: 'जगह',
      id: 'ID',
      since: 'सदस्य तारीख़',
      verified: 'Verified ✓',
      success: '🎉 आपका ID बन गया!',
      successSub: 'अब आपको verified काम मिलेगा',
      home: '← होम पर जाएं',
      dashboard: 'डैशबोर्ड पर जाएं →',
    },
    te: {
      title: 'Digital Shram ID',
      name: 'పేరు',
      skill: 'నైపుణ్యం',
      exp: 'అనుభవం',
      location: 'ప్రాంతం',
      id: 'ID',
      since: 'సభ్యత్వ తేదీ',
      verified: 'Verified ✓',
      success: '🎉 మీ ID సృష్టించబడింది!',
      successSub: 'ఇప్పుడు మీకు verified పని లభిస్తుంది',
      home: '← హోమ్‌కు వెళ్ళండి',
      dashboard: 'డాష్‌బోర్డ్‌కు వెళ్లండి →',
    },
    en: {
      title: 'Digital Shram ID',
      name: 'Name',
      skill: 'Skill',
      exp: 'Experience',
      location: 'Location',
      id: 'ID',
      since: 'Member Since',
      verified: 'Verified ✓',
      success: '🎉 Your ID has been created!',
      successSub: 'You will now receive verified job matches',
      home: '← Go Home',
      dashboard: 'Continue to Dashboard →',
    },
  };

  const text = t[language] || t.en;

  // QR data encodes a verification URL
  const qrData = `https://daksh.app/verify/${worker.id}`;

  return (
    <div className="w-full max-w-md mx-auto space-y-6 animate-in">

      {/* Success Message */}
      <div className="text-center space-y-2 animate-in-delay-1">
        <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'Outfit' }}>
          {text.success}
        </h2>
        <p className="text-white/50 text-base font-medium">{text.successSub}</p>
      </div>

      {/* ═══ THE ID CARD ═══ */}
      <div className="relative animate-in-delay-2">
        {/* Glow behind card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 via-blue-500/20 to-orange-500/20 rounded-3xl blur-xl opacity-60"></div>

        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] shadow-2xl">

          {/* Card Header */}
          <div className="relative px-6 pt-6 pb-4 bg-gradient-to-r from-orange-500/10 to-blue-500/10 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <span className="text-white font-black text-lg" style={{ fontFamily: 'Outfit' }}>D</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white/90 tracking-tight">{text.title}</h3>
                  <span className="text-[10px] text-white/40 font-semibold tracking-[0.2em] uppercase">Trust Protocol</span>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-green-500/20 border border-green-400/30 text-green-400 text-xs font-bold">
                {text.verified}
              </div>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-6 space-y-5">

            {/* Worker Name + Skill Badge */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400/20 to-orange-600/20 border border-orange-400/30 flex items-center justify-center text-3xl shadow-inner">
                {skillIcon}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-black text-white leading-tight" style={{ fontFamily: 'Outfit' }}>
                  {worker.name || 'Unknown'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-400/30 text-orange-300 text-xs font-bold">
                    {worker.skill || 'Worker'}
                  </span>
                  {worker.experience && (
                    <span className="text-xs text-white/40 font-medium">
                      {worker.experience}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              <InfoItem label={text.location} value={worker.location || '—'} icon="📍" />
              <InfoItem label={text.id} value={`#${idShort}`} icon="🔗" mono />
              <InfoItem label={text.since} value={createdDate} icon="📅" />
              <InfoItem label="Rating" value="⭐ New" icon="🏆" />
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 border-t border-dashed border-white/10"></div>
              <span className="text-white/20 text-xs">✂</span>
              <div className="flex-1 border-t border-dashed border-white/10"></div>
            </div>

            {/* QR Code */}
            <div className="flex items-center gap-5">
              <div className="bg-white rounded-xl p-2.5 shadow-lg">
                <QRCodeSVG
                  value={qrData}
                  size={80}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-xs text-white/40 font-medium">Scan to verify worker identity</p>
                <p className="text-[10px] text-white/25 font-mono break-all">{worker.id}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  <span className="text-[10px] text-green-400/70 font-semibold">On-Chain Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="animate-in-delay-3 space-y-3">
        {onDashboard && (
          <button
            onClick={onDashboard}
            className="btn-primary w-full text-lg shadow-[0_0_20px_rgba(59,130,246,0.4)]"
            style={{ background: 'linear-gradient(to right, #3b82f6, #2563eb)' }}
          >
            {text.dashboard}
          </button>
        )}
        <button
          onClick={onBack}
          className="btn-primary btn-outline w-full"
        >
          {text.home}
        </button>
      </div>
    </div>
  );
}

/* ── Small Info Item Component ── */
function InfoItem({ label, value, icon, mono }) {
  return (
    <div className="bg-white/5 rounded-xl px-3 py-2.5 border border-white/5">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-xs">{icon}</span>
        <span className="text-[10px] text-white/35 font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <span className={`text-sm text-white/80 font-semibold ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}
