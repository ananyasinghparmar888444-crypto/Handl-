import { useEffect, useState } from 'react';
import {
  ActiveJob,
  ChatMessage,
  HouseholdTrustData,
  JobStep,
  RegisteredWorkerProfile,
  UserRole,
} from './types';
import { LoginScreen } from './components/LoginScreen';
import { HouseholdFlow } from './components/HouseholdFlow';
import { WorkerFlow } from './components/WorkerFlow';

const INITIAL_HOUSEHOLD_TRUST: HouseholdTrustData = {
  otpVerified: true,
  pastBookings: 2,
  workerRatings: [5, 4.5],
};

export default function App() {
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
      <>
        {quotaBanner}
        <LoginScreen
          onAuthenticated={(phone, selectedRole) => {
            setUserPhone(phone);
            setRole(selectedRole);
            setHouseholdTrust(INITIAL_HOUSEHOLD_TRUST);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-slate-900 flex flex-col">
      {quotaBanner}

      <header className="sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => {
              setActiveJob(null);
              setChatMessages([]);
            }}
            className="text-lg font-bold tracking-tight text-[#0F2347] whitespace-nowrap shrink-0"
          >
            Handl
          </button>

          <nav className="flex items-center gap-6 text-xs sm:text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setRole('household')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                role === 'household'
                  ? 'border-[#0F2347] text-[#0F2347] font-semibold'
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
                  ? 'border-[#0F2347] text-[#0F2347] font-semibold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              I&apos;m a worker
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => {
                setUserPhone(null);
                setRole(null);
                setActiveJob(null);
                setRegisteredWorker(null);
                setChatMessages([]);
              }}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg bg-white transition-colors whitespace-nowrap shrink-0"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {role === 'household' ? (
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
        ) : (
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
        )}
      </main>
    </div>
  );
}
