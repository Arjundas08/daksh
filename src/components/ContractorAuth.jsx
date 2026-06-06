import React, { useState } from 'react';
import { auth, signInWithPopup, googleProvider } from '../firebase';

export default function ContractorAuth({ language, onAuthSuccess, onBack }) {
  const [mode, setMode] = useState(null); // 'login' | 'register'
  const [step, setStep] = useState('input');
  
  // Form fields
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  
  const [error, setError] = useState('');

  const text = language === 'hi' ? {
    loginTitle: 'ठेकेदार लॉगिन',
    registerTitle: 'नया ठेकेदार अकाउंट',
    phoneSub: 'अपने अकाउंट में लॉगिन करें',
    regSub: 'अपना विवरण दर्ज करें',
    phonePh: '10 अंकों का नंबर',
    passPh: 'अपना पासवर्ड डालें',
    namePh: 'आपका नाम',
    companyPh: 'कंपनी का नाम',
    emailPh: 'ईमेल (वैकल्पिक)',
    loginBtn: 'लॉगिन करें',
    regBtn: 'रजिस्टर करें',
    processing: 'कृपया प्रतीक्षा करें...',
  } : {
    loginTitle: 'Contractor Login',
    registerTitle: 'Register Contractor',
    phoneSub: 'Access your enterprise dashboard',
    regSub: 'Enter your business details below',
    phonePh: '10-digit mobile number',
    passPh: 'Enter Password',
    namePh: 'Your Full Name',
    companyPh: 'Company Name',
    emailPh: 'Business Email',
    loginBtn: 'Login to Dashboard',
    regBtn: 'Create Account',
    processing: 'Authenticating...',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (phone.length < 10 || password.length < 6) {
      setError('Please enter valid phone (10 digits) and password (min 6 chars).');
      return;
    }
    if (mode === 'register' && (!name || !companyName)) {
      setError('Name and Company Name are required.');
      return;
    }
    
    setError('');
    setStep('loading');

    setTimeout(() => {
      onAuthSuccess({
        mode,
        phone,
        password,
        name,
        companyName,
        email,
      });
    }, 1000);
  };

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center z-50 animate-in">
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=2071&auto=format&fit=crop")' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40"></div>
        <div className="absolute inset-0 bg-blue-900/40 mix-blend-multiply"></div>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center h-full pt-20 pb-10 overflow-y-auto">
        
        <div className="hidden md:flex flex-col justify-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-500/50 mb-4">
            <span className="text-white font-black text-3xl" style={{ fontFamily: 'Outfit' }}>D</span>
          </div>
          <h1 className="text-6xl lg:text-8xl font-black text-white leading-[1.1]" style={{ fontFamily: 'Outfit' }}>
            Scale Your <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              Workforce.
            </span>
          </h1>
          <p className="text-xl text-white/70 font-medium max-w-md leading-relaxed mt-4">
            Hire verified workers instantly. Manage contracts, payments, and safety tracking on the DAKSH Enterprise network.
          </p>
        </div>

        <div className="w-full max-w-md mx-auto md:ml-auto md:mr-0">
          <div className="card-glass p-8 md:p-10 border border-blue-500/20 bg-black/40 backdrop-blur-2xl shadow-[0_0_50px_rgba(37,99,235,0.2)] rounded-[2rem]">
            
            {!mode && (
              <div className="space-y-8 text-center animate-in">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'Outfit' }}>Enterprise Access</h2>
                  <p className="text-blue-200/50 font-medium text-sm">Contractor Portal</p>
                </div>
                
                <div className="space-y-4 pt-4">
                  <button onClick={() => setMode('login')} className="w-full btn-primary bg-blue-600 hover:bg-blue-500 border-none text-lg py-4 shadow-[0_0_30px_rgba(37,99,235,0.3)]">
                    Login to Account
                  </button>
                  <button onClick={() => setMode('register')} className="w-full btn-primary btn-outline text-lg py-4 bg-white/5 border-white/20 hover:bg-white/10 hover:text-white">
                    Register New Enterprise
                  </button>
                </div>
                
                <div className="pt-4">
                  <button onClick={onBack} className="text-white/40 hover:text-white transition-colors font-bold tracking-widest text-xs uppercase">
                    ← Back to Home
                  </button>
                </div>
              </div>
            )}

            {mode && step === 'input' && (
              <div className="animate-in">
                <div className="text-center mb-8 space-y-2">
                  <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'Outfit' }}>
                    {mode === 'login' ? text.loginTitle : text.registerTitle}
                  </h2>
                  <p className="text-blue-200/60 font-medium text-sm">
                    {mode === 'login' ? text.phoneSub : text.regSub}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 animate-in">
                  {mode === 'register' && (
                    <>
                      <input
                        type="text" value={name} onChange={(e) => setName(e.target.value)}
                        className="w-full bg-blue-950/20 border border-blue-500/20 rounded-2xl px-5 py-4 text-white text-base font-bold placeholder-white/20 focus:outline-none focus:border-blue-500 focus:bg-blue-900/20 transition-all shadow-inner"
                        placeholder={text.namePh}
                      />
                      <input
                        type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                        className="w-full bg-blue-950/20 border border-blue-500/20 rounded-2xl px-5 py-4 text-white text-base font-bold placeholder-white/20 focus:outline-none focus:border-blue-500 focus:bg-blue-900/20 transition-all shadow-inner"
                        placeholder={text.companyPh}
                      />
                      <input
                        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-blue-950/20 border border-blue-500/20 rounded-2xl px-5 py-4 text-white text-base font-bold placeholder-white/20 focus:outline-none focus:border-blue-500 focus:bg-blue-900/20 transition-all shadow-inner"
                        placeholder={text.emailPh}
                      />
                    </>
                  )}

                  <input
                    type="tel" maxLength={10} value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-blue-950/20 border border-blue-500/20 rounded-2xl px-5 py-4 text-white text-lg font-bold placeholder-white/20 focus:outline-none focus:border-blue-500 focus:bg-blue-900/20 transition-all shadow-inner"
                    placeholder={text.phonePh} autoFocus={mode === 'login'}
                  />
                  <input
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-blue-950/20 border border-blue-500/20 rounded-2xl px-5 py-4 text-white text-lg font-bold placeholder-white/20 focus:outline-none focus:border-blue-500 focus:bg-blue-900/20 transition-all shadow-inner"
                    placeholder={text.passPh}
                  />

                  {error && <p className="text-red-400 font-bold text-sm text-center">{error}</p>}

                  <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold text-lg py-4 rounded-2xl transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] mt-2">
                    {mode === 'login' ? text.loginBtn : text.regBtn}
                  </button>
                </form>
              </div>
            )}

            {step === 'loading' && (
              <div className="py-12 flex flex-col items-center justify-center space-y-6 animate-in">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-white/10"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-sm font-bold text-white/50 uppercase tracking-widest animate-pulse">{text.processing}</p>
              </div>
            )}
            
            {step !== 'loading' && mode && (
              <div className="pt-8 text-center border-t border-white/10 mt-8">
                <button onClick={() => { setMode(null); setStep('input'); }} className="text-white/40 hover:text-white transition-colors font-bold tracking-widest text-xs uppercase">
                  ← Change Option
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
