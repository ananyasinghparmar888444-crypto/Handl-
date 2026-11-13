import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, Home, ShieldCheck, Wrench } from 'lucide-react';
import { UserRole } from '../types';

interface LoginScreenProps {
  onAuthenticated: (phone: string, role: UserRole) => void;
}

const DEMO_OTP = '123456';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onAuthenticated }) => {
  const [step, setStep] = useState<'phone' | 'otp' | 'role'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendSeconds, setResendSeconds] = useState(30);
  const [error, setError] = useState('');

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const formattedPhone = `+91 ${phoneInput.replace(/\D/g, '').slice(0, 10)}`;

  useEffect(() => {
    if (step !== 'otp' || resendSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setResendSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [step, resendSeconds]);

  useEffect(() => {
    if (step === 'otp') {
      inputRefs.current[0]?.focus();
    }
  }, [step]);

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setError('');
    setOtpDigits(['', '', '', '', '', '']);
    setResendSeconds(30);
    setStep('otp');
  };

  const handleOtpDigitChange = (index: number, rawValue: string) => {
    const cleaned = rawValue.replace(/\D/g, '');
    setError('');

    // Handle multi-digit paste or autofill into a single box
    if (cleaned.length > 1) {
      const next = ['', '', '', '', '', ''];
      const chars = cleaned.slice(0, 6).split('');
      chars.forEach((ch, idx) => {
        next[idx] = ch;
      });
      setOtpDigits(next);
      const focusIdx = Math.min(chars.length, 5);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    const next = [...otpDigits];
    next[index] = cleaned;
    setOtpDigits(next);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Backspace') {
      if (otpDigits[index]) {
        const next = [...otpDigits];
        next[index] = '';
        setOtpDigits(next);
        setError('');
      } else if (index > 0) {
        const next = [...otpDigits];
        next[index - 1] = '';
        setOtpDigits(next);
        setError('');
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((ch, idx) => {
      next[idx] = ch;
    });
    setOtpDigits(next);
    setError('');
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length < 6) {
      setError('Enter the complete 6-digit OTP.');
      return;
    }
    if (code !== DEMO_OTP) {
      setError('Incorrect OTP. Please enter 123456.');
      return;
    }
    setError('');
    setStep('role');
  };

  const handleResendOtp = () => {
    if (resendSeconds > 0) return;
    setOtpDigits(['', '', '', '', '', '']);
    setError('');
    setResendSeconds(30);
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col justify-between px-4 py-8 sm:px-6">
      <div className="w-full max-w-md mx-auto pt-4 sm:pt-12">
        <div className="mb-8">
          <div className="text-2xl font-bold tracking-tight text-[#0F2347]">
            Handl
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Kanpur · Home repairs & scrap pickup
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-6">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                  Sign in with mobile
                </h1>
                <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                  Enter your 10-digit phone number to receive a one-time verification code.
                </p>
              </div>

              <div>
                <label
                  htmlFor="phone-input"
                  className="block text-xs font-medium text-slate-600 mb-2"
                >
                  Mobile number
                </label>
                <div className="flex items-center border border-slate-200 rounded-xl bg-white focus-within:border-[#0F2347] focus-within:ring-1 focus-within:ring-[#0F2347] transition-all overflow-hidden">
                  <span className="pl-3.5 pr-2.5 py-3 text-sm font-medium text-slate-500 border-r border-slate-200 bg-slate-50 select-none">
                    +91
                  </span>
                  <input
                    id="phone-input"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    autoFocus
                    value={phoneInput}
                    onChange={(e) => {
                      setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10));
                      setError('');
                    }}
                    placeholder="Enter 10-digit number"
                    className="w-full px-3.5 py-3 text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none tabular-nums"
                  />
                </div>
                {error && (
                  <p className="mt-2 text-xs font-medium text-red-600">{error}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] bg-[#0F2347] hover:bg-[#163161] active:scale-[0.99] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <span>Send OTP</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Secure OTP verification</span>
              </div>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setOtpDigits(['', '', '', '', '', '']);
                    setError('');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 mb-4 min-h-[32px]"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Change number</span>
                </button>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                  Verify your number
                </h1>
                <p className="mt-1.5 text-sm text-slate-500">
                  Enter the 6-digit code sent to{' '}
                  <span className="font-medium text-slate-800 tabular-nums">
                    {formattedPhone}
                  </span>
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-600">
                    6-digit OTP
                  </label>
                  <span className="text-xs font-medium text-slate-500 tabular-nums">
                    Demo OTP: 123456
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      maxLength={6}
                      aria-label={`OTP digit ${index + 1}`}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      className={`h-12 sm:h-13 w-full text-center text-lg font-semibold text-slate-900 border rounded-xl bg-white focus:outline-none focus:border-[#0F2347] focus:ring-1 focus:ring-[#0F2347] transition-all tabular-nums ${
                        error ? 'border-red-300' : 'border-slate-200'
                      }`}
                    />
                  ))}
                </div>

                {error && (
                  <p className="mt-2.5 text-xs font-medium text-red-600">{error}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] bg-[#0F2347] hover:bg-[#163161] active:scale-[0.99] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <span>Verify & Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Didn&apos;t receive the code?</span>
                {resendSeconds > 0 ? (
                  <span className="font-medium text-slate-500 tabular-nums">
                    Resend in {resendSeconds}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="font-semibold text-[#0F2347] hover:underline min-h-[32px]"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
            </form>
          )}

          {step === 'role' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                  How are you using Handl?
                </h1>
                <p className="mt-1.5 text-sm text-slate-500">
                  Signed in as{' '}
                  <span className="font-medium text-slate-800 tabular-nums">
                    {formattedPhone}
                  </span>
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => onAuthenticated(formattedPhone, 'household')}
                  className="w-full text-left p-4 sm:p-5 rounded-xl border border-slate-200 hover:border-[#0F2347] hover:bg-slate-50/70 transition-all group flex items-start gap-4 min-h-[84px]"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#0F2347]/6 border border-slate-200 flex items-center justify-center shrink-0 text-[#0F2347] group-hover:bg-[#0F2347] group-hover:text-white transition-colors">
                    <Home className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-semibold text-slate-900">
                        I need help
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#0F2347] transition-colors shrink-0" />
                    </div>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      Plumber, electrician, carpenter, or kabadiwala · Instant AI quote & live Kanpur tracking
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onAuthenticated(formattedPhone, 'worker')}
                  className="w-full text-left p-4 sm:p-5 rounded-xl border border-slate-200 hover:border-[#0F2347] hover:bg-slate-50/70 transition-all group flex items-start gap-4 min-h-[84px]"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#0F2347]/6 border border-slate-200 flex items-center justify-center shrink-0 text-[#0F2347] group-hover:bg-[#0F2347] group-hover:text-white transition-colors">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-semibold text-slate-900">
                        I&apos;m a worker
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#0F2347] transition-colors shrink-0" />
                    </div>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                      Create your Kanpur worker profile, accept jobs, and track completions
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="w-full max-w-md mx-auto pt-6 text-center text-xs text-slate-400">
        Handl Services · Kanpur Operations
      </footer>
    </div>
  );
};
