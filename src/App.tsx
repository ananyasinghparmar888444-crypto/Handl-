import { useEffect, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import {
  ActiveJob,
  ChatMessage,
  HouseholdTrustData,
  JobStep,
  RegisteredWorkerProfile,
  UserRole,
} from './types';
import { HomePage } from './components/HomePage';
import { LoginScreen } from './components/LoginScreen';
import { HouseholdFlow } from './components/HouseholdFlow';
import { WorkerFlow } from './components/WorkerFlow';
import { EASE_OUT_EXPO, ScreenBackdrop } from './components/TradeVisuals';

const INITIAL_HOUSEHOLD_TRUST: HouseholdTrustData = {
  otpVerified: true,
  pastBookings: 2,
  workerRatings: [5, 4.5],
};

export default function App() {
  const [showHome, setShowHome] = useState(true);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [registeredWorker, setRegisteredWorker] =
    useState<RegisteredWorkerProfile | null>(null);
  const [householdTrust, setHouseholdTrust] = useState<HouseholdTrustData>(
    INITIAL_HOUSEHOLD_TRUST
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  const [mapsApiKey, setMapsApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );

  useEffect(() => {
    const handleQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  useEffect(() => {
    if (mapsApiKey) return;
    let active = true;
    fetch('/api/maps-config')
      .then((r) => r.json())
      .then((data: { apiKey?: string }) => {
        if (active && data?.apiKey) {
          setMapsApiKey(data.apiKey);
        }
      })
      .catch(() => {
        // Handled by empty key fallback UI in KanpurMap
      });
    return () => {
      active = false;
    };
  }, [mapsApiKey]);

  const handleBookJob = (job: ActiveJob) => {
    setChatMessages([]);
    setActiveJob(job);
  };

  const handleUpdateJobStep = (
    step: JobStep,
    rating?: number,
    note?: string
  ) => {
    setActiveJob((prev) => {
      if (!prev) return null;
      if (step === 'done' && prev.step !== 'done') {
        setHouseholdTrust((t) => ({
          ...t,
          pastBookings: t.pastBookings + 1,
        }));
      }
      return {
        ...prev,
        step,
        ratingGiven: rating ?? prev.ratingGiven,
        ratingNote: note ?? prev.ratingNote,
      };
    });
  };

  const handleSendMessage = (text: string, sender: UserRole) => {
    const now = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    setChatMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender,
        text,
        timestamp: now,
      },
    ]);
  };

  const handleRateHousehold = (workerStarRating: number) => {
    setHouseholdTrust((prev) => ({
      ...prev,
      pastBookings: prev.pastBookings + 1,
      workerRatings: [...prev.workerRatings, workerStarRating],
    }));
  };

  const quotaBanner = mapsQuotaExceeded ? (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
      <span>
        Google Maps Platform quota reached. If you are the app owner, visit{' '}
        <a
          href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold text-amber-950 hover:text-amber-800"
        >
          maps developer site
        </a>{' '}
        for instructions to update your account.
      </span>
    </div>
  ) : null;

  if (!userPhone || !role) {
    return (
      <MotionConfig reducedMotion="user">
        {quotaBanner}
        <AnimatePresence mode="wait">
          {showHome ? (
            <HomePage key="home" onGetStarted={() => setShowHome(false)} />
          ) : (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <LoginScreen
                onAuthenticated={(phone, selectedRole) => {
                  setUserPhone(phone);
                  setRole(selectedRole);
                  setHouseholdTrust(INITIAL_HOUSEHOLD_TRUST);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen bg-gradient-to-b from-[#FFFFFF] via-[#F4F6FA] to-[#ECEFF5] text-slate-900 flex flex-col">
        <ScreenBackdrop />
        {quotaBanner}

        <header className="sticky top-0 z-30 h-14 bg-white/75 backdrop-blur-xl border-b border-slate-200/80">
          <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setActiveJob(null);
                setChatMessages([]);
              }}
              className="text-lg font-bold tracking-tight text-[#0F2347] whitespace-nowrap shrink-0"
              style={{ fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif' }}
            >
              Handl
            </motion.button>

            <nav className="flex items-center gap-6 text-xs sm:text-sm font-medium text-slate-600">
              <button
                type="button"
                onClick={() => setRole('household')}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  role === 'household'
                    ? 'border-[#EA580C] text-[#0F2347] font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                I need help
              </button>
              <button
                type="button"
                onClick={() => setRole('worker')}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  role === 'worker'
                    ? 'border-[#EA580C] text-[#0F2347] font-semibold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                I&apos;m a worker
              </button>
            </nav>

            <div className="shrink-0">
              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setUserPhone(null);
                  setRole(null);
                  setActiveJob(null);
                  setRegisteredWorker(null);
                  setChatMessages([]);
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:text-[#0F2347] border border-slate-200 hover:border-slate-300 rounded-lg bg-white/90 transition-colors whitespace-nowrap shrink-0"
              >
                Sign out
              </motion.button>
            </div>
          </div>
        </header>

        <main className="relative z-10 flex-1">
          <AnimatePresence mode="wait">
            {role === 'household' ? (
              <motion.div
                key="role-household"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
              >
                <HouseholdFlow
                  userPhone={userPhone}
                  mapsApiKey={mapsApiKey}
                  householdTrust={householdTrust}
                  activeJob={activeJob}
                  chatMessages={chatMessages}
                  onSendMessage={handleSendMessage}
                  onBookJob={handleBookJob}
                  onUpdateJobStep={handleUpdateJobStep}
                  onClearJob={() => {
                    setActiveJob(null);
                    setChatMessages([]);
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="role-worker"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: EASE_OUT_EXPO }}
              >
                <WorkerFlow
                  workerPhone={userPhone}
                  mapsApiKey={mapsApiKey}
                  registeredWorker={registeredWorker}
                  onSaveWorkerProfile={(profile) => setRegisteredWorker(profile)}
                  sharedJob={activeJob}
                  chatMessages={chatMessages}
                  onSendMessage={handleSendMessage}
                  onUpdateSharedJobStep={handleUpdateJobStep}
                  onRateHousehold={handleRateHousehold}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </MotionConfig>
  );
}
