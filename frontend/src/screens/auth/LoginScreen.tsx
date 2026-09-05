import { useState, useRef, useEffect } from 'react';
import { Phone, ArrowRight, CheckCircle2, ShieldCheck, RefreshCw, Code2, Briefcase, Users, AlertCircle, MessageSquare } from 'lucide-react';
import { useNav } from '@/lib/nav';
import { fetchStudentByPhone } from '@/lib/api';
import { useUser } from '@/lib/UserContext';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import aspireLogo from '@/assests/Aspire_logo.jpg';
import studentVideo from '@/assests/dc3f214ec330b1db0c493b4774adc815.mp4';

// OTP Length is 6 digits
const OTP_LENGTH = 6;

// Mask an email so the OTP screen never reveals the full address (A3).
function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return 'your email';
  const [name, domain] = email.split('@');
  const maskedName = name.length <= 2 ? `${name[0]}*` : `${name.slice(0, 2)}${'*'.repeat(Math.max(1, name.length - 2))}`;
  return `${maskedName}@${domain}`;
}

export function LoginScreen() {
  const { login } = useNav();
  const { refetchUser } = useUser();
  const [mobile, setMobile] = useState('');
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [otp, setOtp] = useState<string[]>(() => new Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');            // demo fallback code only
  const [emailHint, setEmailHint] = useState('');                  // masked email we sent to
  const [otpMode, setOtpMode] = useState<'both' | 'firebase' | 'email' | 'demo'>('both');

  // Firebase ConfirmationResult for SMS OTP verification
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Signed token from /api/send-otp (hashed code + expiry); checked by /api/verify-otp (email channel).
  const otpTokenRef = useRef<string>('');
  // Email of the validated student (for the masked hint + resend); never rendered raw.
  const studentEmailRef = useRef<string>('');
  // Resend cooldown in seconds (A2).
  const [resendIn, setResendIn] = useState(0);

  // Clears any existing invisible reCAPTCHA + confirmation so the next send starts fresh (A1).
  const clearRecaptcha = () => {
    if (recaptchaVerifierRef.current) {
      try { recaptchaVerifierRef.current.clear(); } catch (_) {}
      recaptchaVerifierRef.current = null;
    }
    confirmationResultRef.current = null;
  };

  // Cleanup recaptcha on unmount
  useEffect(() => {
    return () => { clearRecaptcha(); };
  }, []);

  // Resend cooldown ticker (A2).
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setMobile(value);
      if (error) setError('');
    }
  };

  // OTP delivery: fire SMS (Firebase) AND email (serverless) IN PARALLEL, always both. The two
  // channels carry two INDEPENDENT codes (Firebase owns/verifies its own; email uses our HMAC
  // token) — the student can use whichever arrives first and EITHER code verifies (see
  // handleOtpSubmit). If neither channel is available we fall back to a local demo code. Assumes
  // `mobile` is a validated, registered number and `studentEmailRef` holds the student's email.
  // Shared by the initial send and "Resend" so both go through the same fresh-verifier path.
  const requestOtp = async () => {
    setOtp(new Array(OTP_LENGTH).fill(''));
    // Always start from a clean verifier so a re-send / number change can't reuse a stale
    // invisible reCAPTCHA (which Firebase rejects with "reCAPTCHA has already been rendered") — A1.
    clearRecaptcha();
    otpTokenRef.current = '';
    setGeneratedOtp('');

    // Channel 1: real SMS OTP via Firebase Auth.
    const smsSend = (async (): Promise<boolean> => {
      if (!isFirebaseConfigured) return false;
      try {
        const auth = getFirebaseAuth();
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => { clearRecaptcha(); }
        });
        const formattedPhone = `+91${mobile}`;
        confirmationResultRef.current = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifierRef.current);
        return true;
      } catch (firebaseErr: any) {
        console.warn('Firebase SMS OTP failed:', firebaseErr);
        clearRecaptcha();
        return false;
      }
    })();

    // Channel 2: emailed OTP via the serverless function.
    const emailSend = (async (): Promise<boolean> => {
      try {
        const resp = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phone: mobile }),
        });
        if (resp.ok) {
          const data = await resp.json();
          otpTokenRef.current = data.token || '';
          // Never fall back to the raw, unmasked address (A3).
          setEmailHint(data.emailHint || maskEmail(studentEmailRef.current));
          return true;
        } else {
          const errorData = await resp.json().catch(() => ({}));
          console.warn('[LoginScreen] /api/send-otp failed:', resp.status, errorData);
        }
      } catch (apiErr) {
        console.warn('Email OTP unavailable:', apiErr);
      }
      return false;
    })();

    const [smsOk, emailOk] = await Promise.all([smsSend, emailSend]);

    if (smsOk && emailOk) setOtpMode('both');
    else if (smsOk) setOtpMode('firebase');
    else if (emailOk) setOtpMode('email');
    else {
      // Neither channel available (e.g. local dev / misconfig) → demo code.
      setGeneratedOtp(String(Math.floor(100000 + Math.random() * 900000)));
      setEmailHint(maskEmail(studentEmailRef.current));
      setOtpMode('demo');
    }
    setStep('otp');
    setResendIn(30);
  };

  const handleLoginClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      // 1. Gate on Supabase: only registered students get an OTP.
      const student = await fetchStudentByPhone(mobile);
      if (!student) {
        setError('Mobile number not registered. Please try another number.');
        return;
      }
      // Persist the mobile only AFTER OTP is verified (see completeLogin) — A4.
      studentEmailRef.current = student.email || '';
      await requestOtp();
    } catch (err) {
      console.error(err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend the code, only once the cooldown has elapsed (A2).
  const handleResend = async () => {
    if (resendIn > 0 || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await requestOtp();
    } catch (err) {
      console.error('Resend OTP failed:', err);
      setError('Could not resend the code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }
    const digit = cleanValue[cleanValue.length - 1];
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (index < otp.length - 1) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);

        const prevInput = document.getElementById(`otp-input-${index - 1}`);
        prevInput?.focus();
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, otp.length);
    if (pastedData.length > 0) {
      const newOtp = [...otp];
      for (let i = 0; i < otp.length; i++) {
        newOtp[i] = pastedData[i] || '';
      }
      setOtp(newOtp);
      const focusIndex = Math.min(pastedData.length - 1, otp.length - 1);
      const focusInput = document.getElementById(`otp-input-${focusIndex}`);
      focusInput?.focus();
    }
  };

  const completeLogin = () => {
    // Persist identity only now that the OTP is verified (A4).
    localStorage.setItem('aspire_logged_in_mobile', mobile);
    localStorage.setItem('aspire_logged_in', 'true');
    refetchUser().then(() => login());
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otp.join('');
    if (enteredOtp.length < OTP_LENGTH) {
      setError(`Please enter the ${OTP_LENGTH}-digit code`);
      return;
    }

    // Codes are delivered on two independent channels; accept EITHER. Try each channel that was
    // actually sent, in turn, and log in on the first that validates the entered code.
    setIsSubmitting(true);
    setError('');

    // Channel 1: Firebase SMS code.
    if (confirmationResultRef.current) {
      try {
        await confirmationResultRef.current.confirm(enteredOtp);
        setIsSubmitting(false);
        completeLogin();
        return;
      } catch (err: any) {
        // Not the SMS code (or expired) — fall through to try the emailed code before failing.
        if (err?.code !== 'auth/invalid-verification-code') {
          console.warn('Firebase SMS verify did not match:', err?.code);
        }
      }
    }

    // Channel 2: emailed code (verified server-side).
    if (otpTokenRef.current) {
      try {
        const resp = await fetch('/api/verify-otp', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: otpTokenRef.current, code: enteredOtp }),
        });
        const data = await resp.json().catch(() => ({ ok: false }));
        if (data.ok) {
          setIsSubmitting(false);
          completeLogin();
          return;
        }
      } catch (err) {
        console.warn('Email OTP verify failed:', err);
      }
    }

    // Channel 3: local demo code.
    if (otpMode === 'demo' && generatedOtp && enteredOtp === generatedOtp) {
      setIsSubmitting(false);
      completeLogin();
      return;
    }

    setIsSubmitting(false);
    setError('Invalid or expired code. Check the code sent to your phone or email, or tap Resend.');
  };

  return (
    <div 
      className="h-screen w-screen max-h-screen max-w-screen overflow-hidden flex items-center justify-center relative p-6 sm:p-10 lg:p-14 font-sans select-none"
      style={{ 
        // 3D Ambient Full-Screen Background in AspireNext Logo Colors (Midnight Navy & Logo Indigo)
        background: 'radial-gradient(ellipse at 25% 30%, #321d72 0%, #47269f 45%, #0c0f26 100%)',
      }}
    >
      {/* 3D Ambient Mesh Glow Orbs across Full Screen (Logo Midnight Navy, Royal Cobalt & Crimson Accent) */}
      <div 
        className="absolute top-[-10%] left-[-5%] w-[650px] h-[650px] rounded-full pointer-events-none opacity-40 blur-[160px] animate-[pulse_8s_infinite]"
        style={{ background: '#7540ff' }} 
      />
      <div 
        className="absolute bottom-[-10%] right-[-5%] w-[650px] h-[650px] rounded-full pointer-events-none opacity-35 blur-[170px] animate-[pulse_10s_infinite]"
        style={{ background: '#5f32d7' }} 
      />
      <div 
        className="absolute top-[40%] left-[30%] w-[450px] h-[450px] rounded-full pointer-events-none opacity-20 blur-[130px] animate-[float_8s_ease-in-out_infinite]"
        style={{ background: '#9364ff' }} 
      />

      {/* Full Width & Height Layout Container */}
      <div className="w-full h-full max-w-7xl mx-auto grid lg:grid-cols-12 gap-8 lg:gap-14 items-center justify-between relative z-10 my-auto py-2">

        {/* ════════════════ LEFT SIDE — FULL HEIGHT HERO BRAND & 3D STAGE ════════════════ */}
        <div className="lg:col-span-7 h-full flex flex-col justify-between items-center lg:items-start text-center lg:text-left text-white py-2 lg:py-4 pr-0 lg:pr-6 shrink-0">
          
          {/* Top Header */}
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-2 text-white">
              Welcome Back
            </h1>
            <p className="text-primary-100/90 text-sm sm:text-lg lg:text-xl font-medium tracking-wide">
              Build skills. Track growth. Succeed smarter.
            </p>
          </div>

          {/* Prominent Center 3D Character Stage */}
          <div className="relative w-full max-w-[280px] sm:max-w-md mx-auto lg:mx-0 mt-6 mb-4 flex items-center justify-center py-2">
            
            {/* Soft Ambient Radial Glow behind Stage */}
            <div 
              className="absolute inset-0 rounded-full blur-3xl opacity-60"
              style={{ background: 'radial-gradient(circle, #7540ff 0%, #5f32d7 70%)' }}
            />
            {/* 3D Floating Circular Stage */}
            <div className="relative w-[140px] h-[140px] sm:w-[250px] sm:h-[250px] lg:w-[310px] lg:h-[310px] rounded-full bg-white flex items-center justify-center shadow-[0_25px_65px_-10px_rgba(30,39,97,0.6)] border-3 sm:border-4 border-white overflow-hidden group shrink-0">
              {/* Horizontally flipped video to face directly towards the Login Card on the right */}
              <video
                src={studentVideo}
                autoPlay
                loop
                muted
                playsInline
                style={{ transform: 'scaleX(-1)' }}
                className="w-[115%] h-[115%] max-w-none object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            {/* ════════ FLOATING GLASS STAT BADGES (VISIBLE ON ALL MOBILE & DESKTOP SCREENS) ════════ */}
            
            {/* Label 1: Top-Left — Interactive Labs */}
            <div className="flex absolute -top-2 -left-5 sm:top-3 sm:-left-4 px-2 py-1 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-xl items-center gap-1 sm:gap-2 animate-[float_5s_ease-in-out_infinite] hover:scale-105 transition-transform z-20">
              <Code2 className="w-3 h-3 sm:w-4 sm:h-4 text-primary-200" />
              <span className="text-[9px] sm:text-xs font-semibold text-white">Interactive Labs</span>
            </div>

            {/* Label 2: Top-Right — 100% Placement Assistance */}
            <div className="flex absolute -top-2 -right-16 sm:top-3 sm:-right-24 px-2 py-1 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-xl items-center gap-1 sm:gap-2 animate-[float_6s_ease-in-out_infinite_1s] hover:scale-105 transition-transform z-20">
              <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 text-amber-300" />
              <span className="text-[9px] sm:text-xs font-semibold text-white">100% Placement Assistance</span>
            </div>

            {/* Label 3: Bottom-Right — Goal Driven */}
            <div className="flex absolute -bottom-2 -right-3 sm:bottom-3 sm:-right-4 px-2 py-1 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-xl items-center gap-1 sm:gap-2 animate-[float_5.5s_ease-in-out_infinite_0.5s] hover:scale-105 transition-transform z-20">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary-400 animate-ping" />
              <span className="text-[9px] sm:text-xs font-semibold text-white">Goal Driven</span>
            </div>

            {/* Label 4: Bottom-Left — WWH Model */}
            <div className="flex absolute -bottom-2 -left-3 sm:bottom-3 sm:-left-4 px-2 py-1 sm:px-3.5 sm:py-1.5 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-xl items-center gap-1 sm:gap-2 animate-[float_6.5s_ease-in-out_infinite_1.5s] hover:scale-105 transition-transform z-20">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 text-sky-200" />
              <span className="text-[9px] sm:text-xs font-semibold text-white">WWH Model</span>
            </div>

          </div>

          {/* Bottom Tagline */}
          <p className="text-primary-100/90 text-xs sm:text-base leading-relaxed max-w-lg font-normal text-center lg:text-left mt-2">
            Learn with purpose, grow with confidence, and build skills that move you forward every day.
          </p>
        </div>


        {/* ════════════════ RIGHT SIDE — PROPORTIONED LIGHT GREY/LAVENDER LOGIN CARD ════════════════ */}
        <div className="lg:col-span-5 h-full flex items-center justify-center lg:justify-end shrink-0">
          <div 
            className="w-full max-w-[340px] sm:max-w-md rounded-[2.2rem] p-7 sm:p-9 flex flex-col justify-between items-center relative overflow-hidden transition-all duration-300 border border-white/80 shadow-2xl"
            style={{ 
              background: 'linear-gradient(145deg, #dfe3f2 0%, #ebedf7 100%)',
              boxShadow: '0 30px 70px -15px rgba(2, 6, 23, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
            }}
          >
            {/* Ambient inner card glow */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary-500/10 blur-2xl pointer-events-none" />

            {/* Top Logo Badge Container */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-xl border-2 border-white/90 mb-3 hover:scale-105 transition-transform duration-300 shrink-0 bg-white">
                <img
                  src={aspireLogo}
                  alt="AspireLMS Logo"
                  loading="lazy"
                  className="w-full h-full object-cover scale-110"
                />
              </div>

              {/* AspireNext Signature Underline Accent Line */}
              <div 
                className="w-14 sm:w-16 h-1.5 rounded-full shadow-sm mb-6 sm:mb-8" 
                style={{ background: 'linear-gradient(90deg, #321d72 0%, #7540ff 60%, #9364ff 100%)' }} 
              />
            </div>
            {step === 'mobile' ? (
              <form onSubmit={handleLoginClick} className="w-full flex flex-col items-center my-auto pt-2 sm:pt-4">
                
                {/* Mobile Input Container with Exact Padding Alignment */}
                <div className="w-full relative mb-5 sm:mb-6 group">
                  {/* Left Icon & Country Code Container */}
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none text-slate-400 z-10">
                    <Phone className="w-4 h-4 text-primary-600 shrink-0 group-focus-within:text-primary-700 transition-colors" />
                    <span className="text-xs font-semibold text-slate-600 border-r border-slate-300 pr-2 leading-none">+91</span>
                  </div>

                  {/* Input field with compact left padding so ENTER MOBILE NUMBER fits 100% cleanly */}
                  <input
                    type="tel"
                    value={mobile}
                    onChange={handleMobileChange}
                    placeholder="ENTER MOBILE NUMBER"
                    maxLength={10}
                    autoFocus
                    style={{ paddingLeft: '84px' }}
                    className={`w-full bg-white rounded-xl py-3.5 sm:py-4 pr-9 text-xs sm:text-sm font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-semibold placeholder:tracking-widest border outline-none focus:bg-white shadow-sm tracking-widest transition-all ${
                      error 
                        ? 'border-red-500 focus:ring-2 focus:ring-red-500/30 focus:border-red-500' 
                        : 'border-slate-200/80 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-600'
                    }`}
                  />

                  {/* Validation Checkmark */}
                  {mobile.length === 10 && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary-600 z-10 animate-scale-in">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Error Message (In between input and button) */}
                {error && (
                  <p className="w-full text-left text-xs font-semibold text-red-600 mt-2.5 pl-1.5 flex items-center gap-1.5 animate-fade-in mb-5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {error}
                  </p>
                )}

                {/* LOGIN BUTTON WITH HIGH-END SHIMMER & LIFT ANIMATION */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full group relative text-white font-bold text-xs sm:text-sm py-3.5 sm:py-4 rounded-xl uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 transition-all duration-300 shadow-[0_10px_25px_-5px_rgba(30,39,97,0.45)] hover:shadow-[0_15px_30px_-5px_rgba(59,82,164,0.55)] hover:-translate-y-0.5 overflow-hidden"
                  style={{ 
                    background: 'linear-gradient(135deg, #47269f 0%, #7540ff 55%, #5f32d7 100%)',
                    backgroundSize: '200% 100%'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundPosition = '100% 0'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundPosition = '0 0'}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2.5 animate-fade-in">
                      <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white border-r-primary-300 animate-spin shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                      <span className="tracking-widest font-bold text-xs sm:text-xs animate-pulse text-primary-100">
                        SENDING OTP...
                      </span>
                    </div>
                  ) : (
                    <>
                      <span>LOGIN</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                    </>
                  )}
                </button>

                {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
                <div id="recaptcha-container"></div>

                <p className="text-[11px] text-slate-400 text-center mt-5 font-medium">
                  An OTP will be sent to your mobile number and registered email.
                </p>
              </form>
            ) : (
              /* STEP 2: OTP VERIFICATION FORM */
              <form onSubmit={handleOtpSubmit} className="w-full flex flex-col items-center my-auto animate-fade-in">
                <div className="text-center mb-5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-100/80 text-primary-900 text-xs font-medium mb-1.5">
                    <ShieldCheck className="w-4 h-4 text-primary-600" /> Verification Code
                  </div>
                  <p className="text-xs text-slate-500 font-normal">
                    {otpMode === 'both'
                      ? <>Code sent to <span className="font-semibold text-slate-700">+91 {mobile}</span>{emailHint ? <> and <span className="font-semibold text-slate-700">{emailHint}</span></> : null}</>
                      : otpMode === 'firebase'
                      ? <>SMS OTP sent to <span className="font-semibold text-slate-700">+91 {mobile}</span></>
                      : otpMode === 'email' && emailHint
                      ? <>Code sent to <span className="font-semibold text-slate-700">{emailHint}</span></>
                      : <>For <span className="font-semibold text-slate-700">+91 {mobile}</span>{emailHint ? <> (<span className="font-semibold text-slate-600">{emailHint}</span>)</> : null}</>}
                  </p>
                  {otpMode === 'both' ? (
                    <p className="text-[10px] text-primary-700 font-medium mt-2.5 flex items-center justify-center gap-1">
                      <MessageSquare className="w-3 h-3 text-[#7c3aed]" />
                      Enter the {OTP_LENGTH}-digit code from your SMS or email — either works.
                    </p>
                  ) : otpMode === 'firebase' ? (
                    <p className="text-[10px] text-primary-700 font-medium mt-2.5 flex items-center justify-center gap-1">
                      <MessageSquare className="w-3 h-3 text-[#7c3aed]" />
                      Enter the {OTP_LENGTH}-digit SMS code sent to your phone.
                    </p>
                  ) : otpMode === 'email' ? (
                    <p className="text-[10px] text-slate-500 font-medium mt-2.5">
                      Enter the {OTP_LENGTH}-digit code sent to your email.
                    </p>
                  ) : (
                    <div className="mt-2.5 flex flex-col items-center gap-1">
                      <p className="text-[10px] text-primary-700 font-bold flex items-center justify-center gap-1.5 bg-primary-50 px-3.5 py-1.5 rounded-xl mx-auto w-fit border border-primary-200/50 shadow-xs animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-600 animate-ping" />
                        Demo code: {generatedOtp}
                      </p>
                      <p className="text-[10px] text-amber-600 font-medium">
                        (Demo mode: SMTP credentials not active or in local dev)
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2.5 justify-center mb-6">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-input-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className={`w-10 h-12 bg-white rounded-lg border text-center font-bold text-lg text-slate-800 outline-none shadow-sm transition-all ${
                        error
                          ? 'border-red-500 focus:ring-2 focus:ring-red-500/30 focus:border-red-500'
                          : 'border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-600'
                      }`}
                    />
                  ))}
                </div>

                {/* Error Message (In between input and button) */}
                {error && (
                  <p className="w-full text-left text-xs font-semibold text-red-600 mt-2.5 pl-1.5 flex items-center gap-1.5 animate-fade-in mb-5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full text-white font-bold text-xs sm:text-sm py-3.5 sm:py-4 rounded-xl uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 transition-all duration-300 shadow-md"
                  style={{ background: 'linear-gradient(135deg, #47269f 0%, #7540ff 100%)' }}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2.5 animate-fade-in">
                      <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white border-r-primary-300 animate-spin shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                      <span className="tracking-widest font-bold text-xs sm:text-xs animate-pulse text-primary-100">
                        VERIFYING...
                      </span>
                    </div>
                  ) : (
                    'VERIFY & CONTINUE'
                  )}
                </button>

                {/* Resend OTP with cooldown (A2) */}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendIn > 0 || isSubmitting}
                  className="mt-4 text-xs font-semibold text-primary-700 hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                  {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend OTP'}
                </button>

                <button
                  type="button"
                  onClick={() => { setStep('mobile'); setError(''); setResendIn(0); clearRecaptcha(); }}
                  className="text-xs font-normal text-primary-700 hover:underline mt-2"
                >
                  Change Mobile Number
                </button>
              </form>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
