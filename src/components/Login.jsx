import React, { useState, useEffect, useRef } from 'react';
import { auth, signInWithPopup, googleProvider } from '../firebase';

export default function Login({ role, language, onLoginSuccess, onBack }) {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'loading'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']); 
  const [error, setError] = useState('');
  
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const t = {
    hi: {
      title: 'लॉगिन करें',
      phoneSub: 'अपना मोबाइल नंबर दर्ज करें',
      phonePh: '10 अंकों का नंबर',
      sendOtp: 'OTP भेजें',
      otpTitle: 'OTP दर्ज करें',
      otpSub: `हमने +91 ${phone} पर OTP भेजा है`,
      verifyOtp: 'Verify करें',
      resend: 'OTP नहीं मिला? फिर से भेजें',
      wrongNum: 'नंबर गलत है?',
      errorPhone: 'कृपया सही 10 अंकों का नंबर डालें',
      errorOtp: 'कृपया सही 6 अंकों का OTP डालें',
      processing: 'वेरिफाई कर रहे हैं...',
      googleLogin: 'Google से लॉगिन करें'
    },
    en: {
      title: 'Login',
      phoneSub: 'Enter your mobile number',
      phonePh: '10-digit mobile number',
      sendOtp: 'Send OTP',
      otpTitle: 'Enter OTP',
      otpSub: `We sent an OTP to +91 ${phone}`,
      verifyOtp: 'Verify',
      resend: "Didn't receive OTP? Resend",
      wrongNum: 'Wrong number?',
      errorPhone: 'Please enter a valid 10-digit number',
      errorOtp: 'Please enter the correct 6-digit OTP',
      processing: 'Verifying...',
      googleLogin: 'Sign in with Google'
    }
  };

  const text = t[language] || t.en;

  // Removed reCAPTCHA init for demo bypass

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (phone.length < 10) {
      setError(text.errorPhone);
      return;
    }
    
    setError('');
    setStep('loading');

    // Bypass Firebase for demo — Fake sending OTP
    setTimeout(() => {
      setStep('otp');
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    }, 1000);
  };

  const handleGoogleLogin = async () => {
    try {
      setStep('loading');
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      // Google returns email/displayName. We use uid as mock phone for now to bypass routing logic
      // In a real app, you'd check if this Google UID exists in your database.
      onLoginSuccess(user.uid); 
    } catch (err) {
      console.error(err);
      setError('Google Login failed.');
      setStep('phone');
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs[index + 1].current.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current.focus();
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError(text.errorOtp);
      return;
    }

    setError('');
    setStep('loading');

    // Bypass Firebase for demo — Accept ANY 6 digit OTP
    setTimeout(() => {
      onLoginSuccess(phone);
    }, 1000);
  };

  return (
    <div className="w-full max-w-6xl mx-auto animate-in z-10 relative">
      
      <div className="grid md:grid-cols-2 gap-12 items-center">
        {/* Left Column - Expansive Typography */}
        <div className="text-left space-y-6 hidden md:block">
          <h2 className="text-6xl lg:text-7xl font-black text-white drop-shadow-2xl leading-tight" style={{ fontFamily: 'Outfit' }}>
            {step === 'otp' ? text.otpTitle : text.title}
          </h2>
          <p className="text-2xl text-white/80 font-semibold drop-shadow-md">
            {step === 'otp' ? text.otpSub : text.phoneSub}
          </p>
          <div className="pt-8">
             <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-white/60 text-lg">
                <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></span>
                Trusted by 50,000+ Workers
             </div>
          </div>
        </div>

        {/* Mobile Header (Hidden on Desktop) */}
        <div className="text-center space-y-4 md:hidden mb-8">
          <h2 className="text-5xl font-black text-white drop-shadow-xl" style={{ fontFamily: 'Outfit' }}>
            {step === 'otp' ? text.otpTitle : text.title}
          </h2>
          <p className="text-lg text-white/80 font-semibold drop-shadow-md">
            {step === 'otp' ? text.otpSub : text.phoneSub}
          </p>
        </div>

        {/* Right Column - Login Form */}
        <div className="w-full max-w-md mx-auto">
          <div className="card-glass p-8 space-y-6 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        
        {step === 'phone' && (
          <div className="space-y-6 animate-in">
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none border-r border-white/10 pr-3">
                  <span className="text-white/60 font-bold text-lg">+91</span>
                </div>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-black/40 border-2 border-white/10 rounded-2xl pl-20 pr-4 py-4 text-white text-xl font-bold placeholder-white/20 focus:outline-none focus:border-orange-500/50 focus:bg-black/60 transition-all shadow-inner"
                  placeholder={text.phonePh}
                  autoFocus
                />
              </div>

              {error && <p className="text-red-400 font-bold text-sm text-center">{error}</p>}

              <button type="submit" className="btn-primary btn-orange w-full text-xl py-4 shadow-[0_0_20px_rgba(249,115,22,0.3)]">
                {text.sendOtp}
              </button>
            </form>
            
            <div className="flex items-center gap-4">
              <div className="flex-1 border-t border-white/10"></div>
              <span className="text-white/30 text-xs font-bold uppercase">OR</span>
              <div className="flex-1 border-t border-white/10"></div>
            </div>

            <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-black text-lg font-bold py-3.5 rounded-2xl transition-all shadow-lg active:scale-95">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6" />
              {text.googleLogin}
            </button>
          </div>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerify} className="space-y-6 animate-in">
            <div className="flex justify-between gap-2 px-1">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={otpRefs[idx]}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-black bg-black/40 border-2 border-white/10 rounded-2xl text-white focus:outline-none focus:border-orange-500 focus:bg-black/60 transition-all shadow-inner"
                />
              ))}
            </div>

            {error && <p className="text-red-400 font-bold text-sm text-center">{error}</p>}

            <button type="submit" className="btn-primary btn-green w-full text-xl py-4 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              {text.verifyOtp}
            </button>

            <div className="flex flex-col items-center gap-3 pt-2">
              <button type="button" onClick={handlePhoneSubmit} className="text-white/50 text-sm font-semibold hover:text-white transition-colors">
                {text.resend}
              </button>
              <button type="button" onClick={() => setStep('phone')} className="text-orange-400/80 text-sm font-semibold hover:text-orange-400 transition-colors">
                {text.wrongNum}
              </button>
            </div>
          </form>
        )}

        {step === 'loading' && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4 animate-in">
            <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-orange-500 animate-spin"></div>
            <p className="text-xl font-bold text-white animate-pulse">{text.processing}</p>
          </div>
        )}
      </div>

        {step === 'phone' && (
          <div className="mt-8 text-center md:text-left">
            <button onClick={onBack} className="btn-primary btn-outline bg-black/40 backdrop-blur-md border-white/20 hover:bg-black/60 px-8">
              ← Back to Home
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
