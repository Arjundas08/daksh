import React, { useState } from 'react';
import { auth, signInWithPopup, googleProvider } from '../firebase';

export default function WorkerAuth({ language, onAuthSuccess, onBack }) {
  const [mode, setMode] = useState(null); // 'login' | 'register'
  const [step, setStep] = useState('input'); // 'input' | 'loading'
  
  // Form fields
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  
  const [error, setError] = useState('');

  const text = language === 'hi' ? {
    loginTitle: 'लॉगिन करें',
    registerTitle: 'नया अकाउंट बनाएं',
    phoneSub: 'अपने अकाउंट में लॉगिन करें',
    regSub: 'अपना विवरण दर्ज करें',
    phonePh: '10 अंकों का नंबर',
    passPh: 'अपना पासवर्ड डालें',
    userPh: 'पूरा नाम',
    emailPh: 'ईमेल (वैकल्पिक)',
    loginBtn: 'लॉगिन करें',
    regBtn: 'रजिस्टर करें',
    errorPhone: 'कृपया सही 10 अंकों का नंबर डालें',
    errorPass: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए',
    errorUser: 'कृपया अपना नाम दर्ज करें',
    processing: 'कृपया प्रतीक्षा करें...',
    googleBtn: 'Google से जारी रखें'
  } : {
    loginTitle: 'Login to DAKSH',
    registerTitle: 'Register New Account',
    phoneSub: 'Access your account',
    regSub: 'Enter your details below',
    phonePh: '10-digit mobile number',
    passPh: 'Enter Password',
    userPh: 'Full Name',
    emailPh: 'Email Address (Optional)',
    loginBtn: 'Login',
    regBtn: 'Register',
    errorPhone: 'Please enter a valid 10-digit number',
    errorPass: 'Password must be at least 6 characters',
    errorUser: 'Please enter your full name',
    processing: 'Authenticating...',
    googleBtn: 'Continue with Google'
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (phone.length < 10) {
      setError(text.errorPhone);
      return;
    }
    if (password.length < 6) {
      setError(text.errorPass);
      return;
    }
    if (mode === 'register' && username.trim() === '') {
      setError(text.errorUser);
      return;
    }
    
    setError('');
    setStep('loading');

    // Simulate small network delay for smooth UI
    setTimeout(() => {
      onAuthSuccess({
        mode,
        phone,
        password,
        username,
        email,
      });
    }, 1000);
  };

  const handleGoogleAuth = async () => {
    try {
      setStep('loading');
      const result = await signInWithPopup(auth, googleProvider);
      onAuthSuccess({
        mode,
        phone: result.user.uid, // Using UID as fallback identifier
        password: '',
        username: result.user.displayName || '',
        email: result.user.email || ''
      });
    } catch (err) {
      console.error(err);
      setError('Google Auth failed.');
      setStep('input');
    }
  };

  // Full Screen Background Container
  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center z-50 animate-in">
      
      {/* Cinematic Background Image */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1541888086425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop")' }}
      >
        {/* Dark gradient overlay so the text pops */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40"></div>
        <div className="absolute inset-0 bg-blue-900/20 mix-blend-multiply"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center h-full pt-20 pb-10 overflow-y-auto">
        
        {/* Left Side: Typography & Branding */}
        <div className="hidden md:flex flex-col justify-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center shadow-2xl shadow-orange-500/50 mb-4">
            <span className="text-white font-black text-3xl" style={{ fontFamily: 'Outfit' }}>D</span>
          </div>
          <h1 className="text-6xl lg:text-8xl font-black text-white leading-[1.1]" style={{ fontFamily: 'Outfit' }}>
            Empowering <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-300">
              Bharat's
            </span> <br/>
            Workforce.
          </h1>
          <p className="text-xl text-white/70 font-medium max-w-md leading-relaxed mt-4">
            Join 50,000+ workers securing verified jobs, daily payouts, and digital identity.
          </p>
        </div>

        {/* Right Side: Glassmorphic Auth Panel */}
        <div className="w-full max-w-md mx-auto md:ml-auto md:mr-0">
          
          {/* Mobile Branding (hidden on desktop) */}
          <div className="md:hidden text-center mb-8 space-y-2">
            <div className="w-12 h-12 mx-auto rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/50 mb-4">
              <span className="text-white font-black text-xl" style={{ fontFamily: 'Outfit' }}>D</span>
            </div>
            <h1 className="text-4xl font-black text-white" style={{ fontFamily: 'Outfit' }}>DAKSH</h1>
            <p className="text-white/70">Empowering Bharat's Workforce</p>
          </div>

          <div className="card-glass p-8 md:p-10 border border-white/20 bg-black/40 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[2rem]">
            
            {/* 1. Selection Screen */}
            {!mode && (
              <div className="space-y-8 text-center animate-in">
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'Outfit' }}>Welcome</h2>
                  <p className="text-white/50 font-medium text-sm">Choose how you want to continue</p>
                </div>
                
                <div className="space-y-4 pt-4">
                  <button onClick={() => setMode('login')} className="w-full btn-primary btn-orange text-lg py-4 shadow-[0_0_30px_rgba(249,115,22,0.3)]">
                    Login to Account
                  </button>
                  <button onClick={() => setMode('register')} className="w-full btn-primary btn-outline text-lg py-4 bg-white/5 border-white/20 hover:bg-white/10 hover:text-white">
                    Register New Account
                  </button>
                </div>
                
                <div className="pt-4">
                  <button onClick={onBack} className="text-white/40 hover:text-white transition-colors font-bold tracking-widest text-xs uppercase">
                    ← Back to Home
                  </button>
                </div>
              </div>
            )}

            {/* 2. Input Screen */}
            {mode && step === 'input' && (
              <div className="animate-in">
                <div className="text-center mb-8 space-y-2">
                  <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'Outfit' }}>
                    {mode === 'login' ? text.loginTitle : text.registerTitle}
                  </h2>
                  <p className="text-white/60 font-medium text-sm">
                    {mode === 'login' ? text.phoneSub : text.regSub}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5 animate-in">
                  
                  {/* Registration extra fields */}
                  {mode === 'register' && (
                    <>
                      <div className="relative">
                        <input
                          type="text" value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-base font-bold placeholder-white/20 focus:outline-none focus:border-orange-500 focus:bg-white/10 transition-all shadow-inner"
                          placeholder={text.userPh}
                        />
                      </div>
                      <div className="relative">
                        <input
                          type="email" value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-base font-bold placeholder-white/20 focus:outline-none focus:border-orange-500 focus:bg-white/10 transition-all shadow-inner"
                          placeholder={text.emailPh}
                        />
                      </div>
                    </>
                  )}

                  {/* Phone Field */}
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none pr-3">
                      <span className="text-white/50 font-bold text-lg">+91</span>
                      <div className="h-6 w-[1px] bg-white/20 ml-3"></div>
                    </div>
                    <input
                      type="tel" maxLength={10} value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-[4.5rem] pr-4 py-4 text-white text-lg font-bold placeholder-white/20 focus:outline-none focus:border-orange-500 focus:bg-white/10 transition-all shadow-inner"
                      placeholder={text.phonePh} autoFocus={mode === 'login'}
                    />
                  </div>

                  {/* Password Field */}
                  <div className="relative">
                    <input
                      type="password" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-lg font-bold placeholder-white/20 focus:outline-none focus:border-orange-500 focus:bg-white/10 transition-all shadow-inner"
                      placeholder={text.passPh}
                    />
                  </div>

                  {error && <p className="text-red-400 font-bold text-sm text-center">{error}</p>}

                  <button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold text-lg py-4 rounded-2xl transition-all shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:shadow-[0_0_40px_rgba(249,115,22,0.5)] transform active:scale-[0.98] mt-2">
                    {mode === 'login' ? text.loginBtn : text.regBtn}
                  </button>
                  
                  <div className="flex items-center gap-4 pt-4">
                    <div className="flex-1 border-t border-white/10"></div>
                    <span className="text-white/30 text-[10px] font-black tracking-widest uppercase">Or</span>
                    <div className="flex-1 border-t border-white/10"></div>
                  </div>

                  <button type="button" onClick={handleGoogleAuth} className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black text-sm font-bold py-3.5 rounded-2xl transition-all shadow-lg active:scale-[0.98]">
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                    {text.googleBtn}
                  </button>
                </form>
              </div>
            )}

            {step === 'loading' && (
              <div className="py-12 flex flex-col items-center justify-center space-y-6 animate-in">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-white/10"></div>
                  <div className="absolute inset-0 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"></div>
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
