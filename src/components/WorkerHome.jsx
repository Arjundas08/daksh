import React, { useState } from 'react';
import VoiceRecorder from './VoiceRecorder';
import WorkerProfile from './WorkerProfile';

const API_BASE = 'http://localhost:8000';

const SKILLS = [
  { value: 'Mason', icon: '🧱', hi: 'राजमिस्त्री', te: 'మేస్త్రీ' },
  { value: 'Carpenter', icon: '🪵', hi: 'बढ़ई', te: 'వడ్రంగి' },
  { value: 'Electrician', icon: '⚡', hi: 'इलेक्ट्रीशियन', te: 'ఎలక్ట్రీషియన్' },
  { value: 'Plumber', icon: '🔧', hi: 'प्लंबर', te: 'ప్లంబర్' },
  { value: 'Painter', icon: '🎨', hi: 'पेंटर', te: 'పెయింటర్' },
  { value: 'Helper', icon: '🤝', hi: 'हेल्पर', te: 'హెల్పర్' },
  { value: 'Welder', icon: '🔥', hi: 'वेल्डर', te: 'వెల్డర్' },
  { value: 'Supervisor', icon: '📋', hi: 'सुपरवाइज़र', te: 'సూపర్‌వైజర్' },
  { value: 'Fitter', icon: '⚙️', hi: 'फिटर', te: 'ఫిట్టర్' },
];

export default function WorkerHome({ language, authData, onBack, onComplete }) {
  // Flow: 'choose' -> 'voice'|'form' -> 'processing' -> 'review' -> 'profile'
  const [step, setStep] = useState('choose');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [agentLogs, setAgentLogs] = useState([]);
  const [formLoading, setFormLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: authData?.username || '', 
    phone: authData?.phone || '', 
    email: authData?.email || '',
    password: authData?.password || '',
    skill: '', experience: '', location: '', dailyWage: '',
  });

  const t = {
    hi: {
      chooseTitle: 'अपना ID बनाएं',
      chooseSub: 'Voice या Form — जो आसान लगे',
      voiceTitle: '🎙️ बोलकर बनाएं',
      voiceSub: 'सिर्फ़ बोलो — AI सब समझ लेगा',
      voiceTag: 'सबसे तेज़',
      voiceTime: '~30 सेकंड',
      formTitle: '📝 लिखकर बनाएं',
      formSub: 'फॉर्म भरो — एक-एक डिटेल',
      formTag: 'Traditional',
      formTime: '~2 मिनट',
      recommended: '✨ Recommended',
      // Voice flow
      instruction: 'माइक दबाएं और बोलें:',
      example: '"मेरा नाम राजू है, मैं राजमिस्त्री हूँ, 8 साल का अनुभव है, हैदराबाद में रहता हूँ, मेरा नंबर 9876543210"',
      processing: 'AI आपकी आवाज़ समझ रहा है...',
      agent1: '🎙️ Bhashini ASR — आवाज़ सुन रहा है...',
      agent2: '🧠 Gemini AI — जानकारी निकाल रहा है...',
      agent3: '💾 Database — Profile सेव कर रहा है...',
      reviewTitle: 'ये सही है?',
      reviewSub: 'AI ने ये समझा — confirm करो',
      confirm: '✅ हाँ, सही है — ID बनाओ!',
      retry: '🔄 फिर से बोलो',
      errorTitle: 'कुछ गड़बड़ हो गई',
      // Form
      fName: 'आपका नाम *',
      fPhone: 'फ़ोन नंबर',
      fSkill: 'हुनर चुनें *',
      fExp: 'अनुभव (साल)',
      fLocation: 'जगह / शहर',
      fWage: 'रोज़ की मज़दूरी (₹)',
      fSubmit: '✅ ID बनाएं',
      fNamePh: 'जैसे: राजू कुमार',
      fPhonePh: 'जैसे: 9876543210',
      fExpPh: 'जैसे: 5 साल',
      fLocPh: 'जैसे: हैदराबाद',
      fWagePh: 'जैसे: 800',
      fSelectSkill: 'हुनर चुनें',
    },
    te: {
      chooseTitle: 'మీ ID సృష్టించండి',
      chooseSub: 'Voice లేదా Form — ఏది సులభమో అది',
      voiceTitle: '🎙️ మాట్లాడి సృష్టించండి',
      voiceSub: 'చెప్పండి — AI అంతా అర్థం చేసుకుంటుంది',
      voiceTag: 'వేగవంతం',
      voiceTime: '~30 సెకన్లు',
      formTitle: '📝 రాసి సృష్టించండి',
      formSub: 'ఫారమ్ నింపండి — ప్రతి వివరం',
      formTag: 'Traditional',
      formTime: '~2 నిమిషాలు',
      recommended: '✨ Recommended',
      instruction: 'మైక్ నొక్కండి మరియు చెప్పండి:',
      example: '"నా పేరు రాజు, నేను మేస్త్రీని, 8 సంవత్సరాల అనుభవం ఉంది, హైదరాబాద్‌లో ఉంటాను"',
      processing: 'AI మీ వాయిస్‌ను అర్థం చేసుకుంటోంది...',
      agent1: '🎙️ Bhashini ASR — వాయిస్ వింటోంది...',
      agent2: '🧠 Gemini AI — సమాచారం సేకరిస్తోంది...',
      agent3: '💾 Database — Profile సేవ్ చేస్తోంది...',
      reviewTitle: 'ఇది సరైనదా?',
      reviewSub: 'AI ఇది అర్థం చేసుకుంది — confirm చేయండి',
      confirm: '✅ అవును — ID సృష్టించండి!',
      retry: '🔄 మళ్ళీ చెప్పండి',
      errorTitle: 'ఏదో తప్పు జరిగింది',
      fName: 'మీ పేరు *', fPhone: 'ఫోన్ నంబర్', fSkill: 'నైపుణ్యం ఎంచుకోండి *',
      fExp: 'అనుభవం (సంవత్సరాలు)', fLocation: 'ప్రాంతం / నగరం', fWage: 'రోజు కూలీ (₹)',
      fSubmit: '✅ ID సృష్టించండి',
      fNamePh: 'ఉదా: రాజు కుమార్', fPhonePh: 'ఉదా: 9876543210',
      fExpPh: 'ఉదా: 5 సంవత్సరాలు', fLocPh: 'ఉదా: హైదరాబాద్', fWagePh: 'ఉదా: 800',
      fSelectSkill: 'నైపుణ్యం ఎంచుకోండి',
    },
    en: {
      chooseTitle: 'Create Your ID',
      chooseSub: 'Voice or Form — whichever is easier',
      voiceTitle: '🎙️ Speak to Register',
      voiceSub: 'Just talk — AI understands everything',
      voiceTag: 'Fastest',
      voiceTime: '~30 seconds',
      formTitle: '📝 Fill a Form',
      formSub: 'Enter details manually',
      formTag: 'Traditional',
      formTime: '~2 minutes',
      recommended: '✨ Recommended',
      instruction: 'Tap the mic and say:',
      example: '"My name is Raju, I am a mason, I have 8 years of experience, I live in Hyderabad, my number is 9876543210"',
      processing: 'AI is understanding your voice...',
      agent1: '🎙️ Bhashini ASR — Listening to voice...',
      agent2: '🧠 Gemini AI — Extracting information...',
      agent3: '💾 Database — Saving profile...',
      reviewTitle: 'Is this correct?',
      reviewSub: 'AI understood this — please confirm',
      confirm: '✅ Yes, create my ID!',
      retry: '🔄 Try again',
      errorTitle: 'Something went wrong',
      fName: 'Your Name *', fPhone: 'Phone Number', fSkill: 'Select Skill *',
      fExp: 'Experience (years)', fLocation: 'Location / City', fWage: 'Daily Wage (₹)',
      fSubmit: '✅ Create My ID',
      fNamePh: 'e.g. Raju Kumar', fPhonePh: 'e.g. 9876543210',
      fExpPh: 'e.g. 5 years', fLocPh: 'e.g. Hyderabad', fWagePh: 'e.g. 800',
      fSelectSkill: 'Select a skill',
    },
  };

  const text = t[language] || t.en;

  // ─── Handlers ──────────────────────────────────────────

  const handleVoiceResult = (data) => {
    setResult(data);
    setStep('review');
    setAgentLogs([]);
  };

  const handleVoiceError = (msg) => {
    setError(msg);
    setStep('voice');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.skill) return;

    setFormLoading(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        skill: form.skill,
        location: form.location.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password.trim(),
        experience: form.experience.trim(),
      };

      const res = await fetch(`${API_BASE}/api/workers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Server error');
      }
      
      const data = await res.json();
      setResult({
        worker: data.worker,
        extracted_info: {
          name: form.name, skill: form.skill,
          experience: form.experience, location: form.location, phone: form.phone,
        },
        transcribed_text: null,
        registration_method: 'form',
      });
      setStep('profile');
    } catch (err) {
      setError(err.message);
      setFormLoading(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setForm({ ...form, location: 'Getting location...' });
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Mock reverse geocoding for speed/reliability in demo
        // In a real app, we'd use Google Maps Geocoding API
        setForm({ ...form, location: 'Hyderabad, TS' });
      },
      (error) => {
        setError("Failed to get location. Please type manually.");
        setForm({ ...form, location: '' });
      }
    );
  };

  const confirmProfile = () => setStep('profile');
  const retryRecording = () => { setStep('choose'); setResult(null); setError(null); };

  // ─── Skill label helper ────────────────────────────────
  const getSkillLabel = (s) => {
    const label = language === 'hi' ? s.hi : language === 'te' ? s.te : s.value;
    return `${s.icon} ${label}`;
  };

  return (
    <div className="w-full max-w-lg mx-auto">

      {/* ═══ STEP: CHOOSE METHOD ═══ */}
      {step === 'choose' && (
        <div className="space-y-8 animate-in">
          <div className="text-center space-y-3">
            <h2 className="text-4xl font-black text-white" style={{ fontFamily: 'Outfit' }}>
              {text.chooseTitle}
            </h2>
            <p className="text-lg text-white/50 font-medium">{text.chooseSub}</p>
          </div>

          {/* Method Cards */}
          <div className="grid grid-cols-2 gap-4">

            {/* Voice Card (Highlighted) */}
            <button
              onClick={() => setStep('voice')}
              className="relative card-glass p-0 overflow-hidden cursor-pointer group active:scale-[0.97] transition-all text-left"
              style={{ border: '1.5px solid rgba(249,115,22,0.4)' }}
            >
              {/* Recommended Badge */}
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[10px] font-bold text-center py-1 tracking-wider uppercase z-10">
                {text.recommended}
              </div>

              <div className="pt-10 pb-5 px-4 space-y-3">
                {/* Big Icon */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400/20 to-orange-600/20 border border-orange-400/30 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                  🎙️
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">{text.voiceTitle}</h3>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">{text.voiceSub}</p>
                </div>
                {/* Tags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-orange-400 bg-orange-400/10 px-2.5 py-1 rounded-full border border-orange-400/20">
                    {text.voiceTag}
                  </span>
                  <span className="text-[10px] font-medium text-white/30">{text.voiceTime}</span>
                </div>
              </div>
              {/* Glow edge */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600 opacity-60"></div>
            </button>

            {/* Form Card */}
            <button
              onClick={() => setStep('form')}
              className="card-glass p-0 overflow-hidden cursor-pointer group active:scale-[0.97] transition-all text-left"
            >
              <div className="pt-5 pb-5 px-4 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400/20 to-blue-600/20 border border-blue-400/30 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                  📝
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">{text.formTitle}</h3>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">{text.formSub}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-2.5 py-1 rounded-full border border-blue-400/20">
                    {text.formTag}
                  </span>
                  <span className="text-[10px] font-medium text-white/30">{text.formTime}</span>
                </div>
              </div>
            </button>
          </div>

          <button onClick={onBack} className="btn-primary btn-outline">← Back</button>
        </div>
      )}

      {/* ═══ STEP: VOICE RECORDING ═══ */}
      {step === 'voice' && (
        <div className="space-y-8 animate-in">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'Outfit' }}>🎙️</h2>
            <p className="text-white/60 text-base font-medium">{text.instruction}</p>
          </div>

          {/* Example Prompt */}
          <div className="card-glass p-4">
            <p className="text-orange-300/80 text-sm font-medium italic leading-relaxed">{text.example}</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-400/20 rounded-xl p-4 text-red-300 text-sm animate-in">
              <p className="font-bold mb-1">{text.errorTitle}</p>
              <p className="text-red-300/70">{error}</p>
            </div>
          )}

          <VoiceRecorder
            language={language}
            authData={authData}
            onResult={(data) => {
              setStep('processing');
              setAgentLogs([]);
              setTimeout(() => setAgentLogs(prev => [...prev, text.agent1]), 300);
              setTimeout(() => setAgentLogs(prev => [...prev, text.agent2]), 1200);
              setTimeout(() => setAgentLogs(prev => [...prev, text.agent3]), 2000);
              setTimeout(() => handleVoiceResult(data), 2800);
            }}
            onError={handleVoiceError}
          />

          <button onClick={() => { setStep('choose'); setError(null); }} className="btn-primary btn-outline">← Back</button>
        </div>
      )}

      {/* ═══ STEP: FORM ═══ */}
      {step === 'form' && (
        <div className="space-y-6 animate-in">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'Outfit' }}>📝</h2>
            <p className="text-white/50 text-base font-medium">{text.formTitle}</p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-4">

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs text-white/40 font-semibold uppercase tracking-wider">{text.fName}</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder={text.fNamePh}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 text-sm font-medium focus:outline-none focus:border-orange-400/50 focus:bg-white/8 transition-all"
              />
            </div>

            {/* Phone (Read-Only Verified) */}
            <div className="space-y-1.5">
              <label className="text-xs text-white/40 font-semibold uppercase tracking-wider">{text.fPhone} (Verified)</label>
              <input
                type="tel"
                value={form.phone}
                readOnly
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white/50 text-sm font-medium focus:outline-none cursor-not-allowed"
              />
            </div>

            {/* Skill Selection */}
            <div className="space-y-1.5">
              <label className="text-xs text-white/40 font-semibold uppercase tracking-wider">{text.fSkill}</label>
              <div className="grid grid-cols-3 gap-2">
                {SKILLS.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm({ ...form, skill: s.value })}
                    className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border text-center transition-all cursor-pointer ${
                      form.skill === s.value
                        ? 'bg-orange-500/20 border-orange-400/50 text-orange-300 shadow-lg shadow-orange-500/10'
                        : 'bg-white/3 border-white/8 text-white/50 hover:bg-white/5 hover:border-white/15'
                    }`}
                  >
                    <span className="text-xl">{s.icon}</span>
                    <span className="text-[11px] font-bold leading-tight">
                      {language === 'hi' ? s.hi : language === 'te' ? s.te : s.value}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Experience + Location Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-white/40 font-semibold uppercase tracking-wider">{text.fExp}</label>
                <input
                  type="text"
                  value={form.experience}
                  onChange={e => setForm({ ...form, experience: e.target.value })}
                  placeholder={text.fExpPh}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/20 text-sm font-medium focus:outline-none focus:border-orange-400/50 focus:bg-white/8 transition-all"
                />
              </div>
              <div className="space-y-1.5 relative">
                <label className="text-xs text-white/40 font-semibold uppercase tracking-wider">{text.fLocation}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                    placeholder={text.fLocPh}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-3.5 text-white placeholder-white/20 text-sm font-medium focus:outline-none focus:border-orange-400/50 focus:bg-white/8 transition-all"
                  />
                  <button 
                    type="button"
                    onClick={handleGetLocation}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white/5 hover:bg-orange-500/20 text-white/50 hover:text-orange-400 transition-colors"
                    title="Get Current Location"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Daily Wage */}
            <div className="space-y-1.5">
              <label className="text-xs text-white/40 font-semibold uppercase tracking-wider">{text.fWage}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-bold">₹</span>
                <input
                  type="number"
                  value={form.dailyWage}
                  onChange={e => setForm({ ...form, dailyWage: e.target.value })}
                  placeholder={text.fWagePh}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3.5 text-white placeholder-white/20 text-sm font-medium focus:outline-none focus:border-orange-400/50 focus:bg-white/8 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-400/20 rounded-xl p-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={formLoading || !form.name.trim() || !form.skill}
              className={`btn-primary btn-green ${formLoading ? 'opacity-60 cursor-wait' : ''} ${(!form.name.trim() || !form.skill) ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              {formLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                  Saving...
                </span>
              ) : text.fSubmit}
            </button>
          </form>

          {/* Switch to voice */}
          <div className="text-center">
            <button onClick={() => setStep('voice')} className="text-orange-400/70 text-sm font-semibold hover:text-orange-400 transition-colors cursor-pointer">
              🎙️ {language === 'hi' ? 'या बोलकर बनाएं' : language === 'te' ? 'లేదా మాట్లాడి సృష్టించండి' : 'Or register by voice'}
            </button>
          </div>

          <button onClick={() => { setStep('choose'); setError(null); }} className="btn-primary btn-outline">← Back</button>
        </div>
      )}

      {/* ═══ STEP: PROCESSING (Voice) ═══ */}
      {step === 'processing' && (
        <div className="space-y-8 animate-in text-center">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
            <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin"></div>
            <div className="absolute inset-3 rounded-full border-4 border-blue-500/30 border-b-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute inset-0 flex items-center justify-center text-2xl">🧠</div>
          </div>

          <h3 className="text-xl font-bold text-white">{text.processing}</h3>

          <div className="space-y-2 text-left max-w-sm mx-auto">
            {agentLogs.map((log, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-sm text-white/70 font-medium">{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ STEP: REVIEW (Voice only) ═══ */}
      {step === 'review' && result && (
        <div className="space-y-6 animate-in">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'Outfit' }}>{text.reviewTitle}</h2>
            <p className="text-white/50 text-base">{text.reviewSub}</p>
          </div>

          {result.transcribed_text && (
            <div className="card-glass p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs">🎙️</span>
                <span className="text-xs text-white/30 font-semibold uppercase tracking-wider">Voice Transcription</span>
              </div>
              <p className="text-white/80 text-sm font-medium italic leading-relaxed">"{result.transcribed_text}"</p>
              <span className="text-[10px] text-white/25 font-mono">Lang: {result.detected_language}</span>
            </div>
          )}

          {result.extracted_info && (
            <div className="card-glass p-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs">🧠</span>
                <span className="text-xs text-white/30 font-semibold uppercase tracking-wider">AI Extracted</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ExtractedField label="Name" value={result.extracted_info.name} icon="👤" />
                <ExtractedField label="Skill" value={result.extracted_info.skill} icon={SKILLS.find(s => s.value === result.extracted_info.skill)?.icon || '👷'} />
                <ExtractedField label="Experience" value={result.extracted_info.experience} icon="📅" />
                <ExtractedField label="Location" value={result.extracted_info.location} icon="📍" />
                {result.extracted_info.phone && (
                  <ExtractedField label="Phone" value={result.extracted_info.phone} icon="📱" />
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button onClick={confirmProfile} className="btn-primary btn-green">{text.confirm}</button>
            <button onClick={retryRecording} className="btn-primary btn-outline">{text.retry}</button>
          </div>
        </div>
      )}

      {/* ═══ STEP: PROFILE (Digital ID) ═══ */}
      {step === 'profile' && result?.worker && (
        <WorkerProfile worker={result.worker} language={language} onBack={onBack} onDashboard={() => onComplete(result.worker)} />
      )}
    </div>
  );
}

function ExtractedField({ label, value, icon }) {
  return (
    <div className="bg-white/5 rounded-xl px-3 py-2.5 border border-white/5">
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-xs">{icon}</span>
        <span className="text-[10px] text-white/35 font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-sm text-white/80 font-semibold">{value || '—'}</span>
    </div>
  );
}
