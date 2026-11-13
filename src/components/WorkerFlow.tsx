import React, { useRef, useState } from 'react';
import {
  BadgeCheck,
  Camera,
  Check,
  Edit3,
  MapPin,
  MessageSquare,
  Navigation,
  ShieldCheck,
  Star,
  Trash2,
  User,
} from 'lucide-react';
import {
  ActiveJob,
  ChatMessage,
  computeTrustScore,
  JobStep,
  RegisteredWorkerProfile,
  WorkerProfile,
  WorkerTrade,
} from '../types';
import {
  DEFAULT_INCOMING_WORKER_JOBS,
  KANPUR_CENTER,
  KANPUR_HOUSEHOLD_LOCATIONS,
  KANPUR_WORKERS,
  TRADE_LABELS,
} from '../data/kanpurWorkers';
import { KanpurMap } from './KanpurMap';
import { JobChatDrawer } from './JobChatDrawer';

interface WorkerFlowProps {
  workerPhone: string;
  mapsApiKey: string;
  registeredWorker: RegisteredWorkerProfile | null;
  onSaveWorkerProfile: (profile: RegisteredWorkerProfile) => void;
  sharedJob: ActiveJob | null;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string, sender: 'household' | 'worker') => void;
  onUpdateSharedJobStep: (step: JobStep, rating?: number, note?: string) => void;
  onRateHousehold: (rating: number) => void;
}

const SKILLS: WorkerTrade[] = [
  'plumber',
  'electrician',
  'carpenter',
  'kabadiwala',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'W';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function resolveKanpurCoords(area: string): { lat: number; lng: number } {
  const normalized = area.toLowerCase();
  const match = KANPUR_HOUSEHOLD_LOCATIONS.find((loc) =>
    normalized.includes(loc.label.toLowerCase())
  );
  if (match) {
    return { lat: match.lat + 0.004, lng: match.lng - 0.004 };
  }
  const workerMatch = KANPUR_WORKERS.find((w) =>
    normalized.includes(w.neighborhood.toLowerCase())
  );
  if (workerMatch) {
    return { lat: workerMatch.lat, lng: workerMatch.lng };
  }
  return { lat: KANPUR_CENTER.lat + 0.006, lng: KANPUR_CENTER.lng - 0.005 };
}

export const WorkerFlow: React.FC<WorkerFlowProps> = ({
  workerPhone,
  mapsApiKey,
  registeredWorker,
  onSaveWorkerProfile,
  sharedJob,
  chatMessages,
  onSendMessage,
  onUpdateSharedJobStep,
  onRateHousehold,
}) => {
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Empty form state — nothing pre-filled
  const [nameInput, setNameInput] = useState(registeredWorker?.name ?? '');
  const [skillInput, setSkillInput] = useState<WorkerTrade | ''>(
    registeredWorker?.skill ?? ''
  );
  const [experienceInput, setExperienceInput] = useState(
    registeredWorker ? String(registeredWorker.experienceYears) : ''
  );
  const [areaInput, setAreaInput] = useState(registeredWorker?.area ?? '');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(
    registeredWorker?.photoDataUrl ?? null
  );
  const [formError, setFormError] = useState('');

  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // Job queue, chat & completion state
  const [queueIndex, setQueueIndex] = useState(0);
  const [localStep, setLocalStep] = useState<JobStep>('new_job');
  const [rating, setRating] = useState(5);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [completedCount, setCompletedCount] = useState(
    registeredWorker?.jobsDone ?? 0
  );
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!skillInput) {
      setFormError('Please select your primary skill.');
      return;
    }
    const years = Number(experienceInput);
    if (
      experienceInput.trim() === '' ||
      Number.isNaN(years) ||
      years < 0 ||
      years > 60
    ) {
      setFormError('Please enter valid years of experience.');
      return;
    }
    if (!areaInput.trim()) {
      setFormError('Please enter your service area in Kanpur.');
      return;
    }

    setFormError('');
    onSaveWorkerProfile({
      name: nameInput.trim(),
      skill: skillInput,
      experienceYears: Math.round(years),
      area: areaInput.trim(),
      photoDataUrl,
      phone: workerPhone,
      verified: true,
      jobsDone: completedCount,
    });
    setIsEditingProfile(false);
  };

  const openEditProfile = () => {
    if (registeredWorker) {
      setNameInput(registeredWorker.name);
      setSkillInput(registeredWorker.skill);
      setExperienceInput(String(registeredWorker.experienceYears));
      setAreaInput(registeredWorker.area);
      setPhotoDataUrl(registeredWorker.photoDataUrl ?? null);
    }
    setFormError('');
    setIsEditingProfile(true);
  };

  // Show empty onboarding form until profile is saved (or while editing)
  if (!registeredWorker || isEditingProfile) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {registeredWorker
                ? 'Update worker profile'
                : 'Create your worker profile'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Fill in your details to start receiving service requests in Kanpur.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            {/* Optional photo */}
            <div className="flex items-center gap-4">
              {photoDataUrl ? (
                <div className="relative w-16 h-16 shrink-0">
                  <img
                    src={photoDataUrl}
                    alt="Worker profile preview"
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoDataUrl(null);
                      if (photoInputRef.current) photoInputRef.current.value = '';
                    }}
                    aria-label="Remove photo"
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-600 hover:text-red-600 flex items-center justify-center shadow-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                  <User className="w-6 h-6" />
                </div>
              )}

              <div className="space-y-1">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 inline-flex items-center gap-2 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {photoDataUrl ? 'Change photo' : 'Upload photo (optional)'}
                  </span>
                </button>
                <p className="text-[11px] text-slate-400">
                  Clear headshot helps households verify arrival
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="worker-name"
                className="block text-xs font-medium text-slate-600 mb-1.5"
              >
                Full name
              </label>
              <input
                id="worker-name"
                type="text"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  setFormError('');
                }}
                placeholder="Enter your full name"
                className="w-full px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2347] focus:ring-1 focus:ring-[#0F2347]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Skill
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SKILLS.map((skill) => {
                  const selected = skillInput === skill;
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => {
                        setSkillInput(skill);
                        setFormError('');
                      }}
                      className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                        selected
                          ? 'bg-[#0F2347] text-white border-[#0F2347]'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {TRADE_LABELS[skill]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="worker-exp"
                  className="block text-xs font-medium text-slate-600 mb-1.5"
                >
                  Years of experience
                </label>
                <input
                  id="worker-exp"
                  type="number"
                  min={0}
                  max={60}
                  inputMode="numeric"
                  value={experienceInput}
                  onChange={(e) => {
                    setExperienceInput(e.target.value);
                    setFormError('');
                  }}
                  placeholder="e.g., 5"
                  className="w-full px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2347] focus:ring-1 focus:ring-[#0F2347] tabular-nums"
                />
              </div>

              <div>
                <label
                  htmlFor="worker-area"
                  className="block text-xs font-medium text-slate-600 mb-1.5"
                >
                  Service area (Kanpur)
                </label>
                <input
                  id="worker-area"
                  type="text"
                  value={areaInput}
                  onChange={(e) => {
                    setAreaInput(e.target.value);
                    setFormError('');
                  }}
                  placeholder="e.g., Swaroop Nagar"
                  className="w-full px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2347] focus:ring-1 focus:ring-[#0F2347]"
                />
              </div>
            </div>

            {formError && (
              <p className="text-xs font-medium text-red-600">{formError}</p>
            )}

            <div className="flex items-center gap-2.5 pt-1">
              {registeredWorker && (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="min-h-[48px] px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="flex-1 min-h-[48px] bg-[#0F2347] hover:bg-[#163161] active:scale-[0.99] text-white text-sm font-semibold rounded-xl transition-all"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Build partner profile from saved worker details
  const coords = resolveKanpurCoords(registeredWorker.area);
  const partnerProfile: WorkerProfile = {
    id: 'registered-worker',
    name: registeredWorker.name,
    initials: getInitials(registeredWorker.name),
    trade: registeredWorker.skill,
    neighborhood: registeredWorker.area,
    lat: coords.lat,
    lng: coords.lng,
    priceInr: registeredWorker.skill === 'kabadiwala' ? 0 : 249,
    arrivalMinutes: 10,
    experienceYears: registeredWorker.experienceYears,
    rating: 5.0,
    jobsDone: completedCount,
    verified: registeredWorker.verified,
    verifiedSince: '2026',
    specialty: `${TRADE_LABELS[registeredWorker.skill]} specialist`,
  };

  const matchingJobs = DEFAULT_INCOMING_WORKER_JOBS.filter(
    (j) => j.worker.trade === registeredWorker.skill
  );
  const jobPool =
    matchingJobs.length > 0 ? matchingJobs : DEFAULT_INCOMING_WORKER_JOBS;
  const demoTemplate = jobPool[queueIndex % jobPool.length];

  const currentJob: ActiveJob = sharedJob
    ? sharedJob
    : {
        ...demoTemplate,
        worker: partnerProfile,
        step: localStep,
      };

  const effectiveStep: JobStep = sharedJob ? sharedJob.step : localStep;
  const trustStats = computeTrustScore(currentJob.householdTrust);

  const advanceStep = (next: JobStep) => {
    if (sharedJob) {
      onUpdateSharedJobStep(next);
    } else {
      setLocalStep(next);
    }
  };

  const handleSubmitRating = () => {
    setCompletedCount((c) => c + 1);
    onRateHousehold(rating);
    if (sharedJob) {
      onUpdateSharedJobStep('rated', rating, feedbackNote);
    } else {
      setLocalStep('rated');
    }
  };

  const handleNextJob = () => {
    setFeedbackNote('');
    setRating(5);
    setLocalStep('new_job');
    setQueueIndex((i) => i + 1);
  };

  const statusSteps: Array<{ key: JobStep; label: string; desc: string }> = [
    {
      key: 'on_the_way',
      label: 'On the way',
      desc: 'Heading to customer doorstep in Kanpur',
    },
    {
      key: 'arrived',
      label: 'Arrived',
      desc: 'Reached customer address and inspecting work',
    },
    {
      key: 'done',
      label: 'Done',
      desc: 'Work completed & payment settled',
    },
  ];

  const currentStepIdx = statusSteps.findIndex((s) => s.key === effectiveStep);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Saved Worker Profile Card with Verified tick & Jobs Done count */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {registeredWorker.photoDataUrl ? (
            <img
              src={registeredWorker.photoDataUrl}
              alt={registeredWorker.name}
              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-[#0F2347] text-white flex items-center justify-center text-sm font-semibold shrink-0">
              {partnerProfile.initials}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-base font-semibold text-slate-900 truncate">
                {registeredWorker.name}
              </span>
              {registeredWorker.verified && (
                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-[#0F2347] shrink-0">
                  <BadgeCheck className="w-4 h-4 text-[#0F2347]" />
                  <span>Verified</span>
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 tabular-nums truncate">
              {TRADE_LABELS[registeredWorker.skill]} ·{' '}
              {registeredWorker.experienceYears} yrs exp · {registeredWorker.area}{' '}
              · {registeredWorker.phone}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <div>
            <div className="text-slate-500">Rating</div>
            <div className="font-semibold text-slate-900 tabular-nums mt-0.5">
              {partnerProfile.rating.toFixed(1)} ★
            </div>
          </div>
          <div>
            <div className="text-slate-500">Jobs Done</div>
            <div className="font-semibold text-slate-900 tabular-nums mt-0.5">
              {completedCount} jobs done
            </div>
          </div>
          <button
            type="button"
            onClick={openEditProfile}
            className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-700 font-medium inline-flex items-center gap-1.5 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit profile</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
            {effectiveStep === 'new_job' && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium text-slate-500">
                      New Job Request · {currentJob.id}
                    </div>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                      {currentJob.customerLocation.label}, Kanpur
                    </h2>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-500">
                      {currentJob.isScrap ? 'Scrap Value' : 'Est. Pay'}
                    </div>
                    <div className="text-lg font-bold text-[#0F2347] tabular-nums">
                      ₹{currentJob.estimatedPriceMinInr}–₹
                      {currentJob.estimatedPriceMaxInr}
                    </div>
                  </div>
                </div>

                {/* Household Trust Score (0-100) shown before worker accepts */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                      <ShieldCheck className="w-4 h-4 text-[#0F2347]" />
                      <span>Household Trust Score</span>
                    </div>
                    <span className="text-base font-bold text-[#0F2347] tabular-nums">
                      {trustStats.score} / 100
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-[#0F2347] rounded-full transition-all"
                      style={{ width: `${trustStats.score}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 tabular-nums">
                    {currentJob.householdTrust.otpVerified
                      ? 'OTP verified'
                      : 'OTP pending'}{' '}
                    · {currentJob.householdTrust.pastBookings} past bookings ·{' '}
                    {trustStats.avgWorkerRating !== null
                      ? `${trustStats.avgWorkerRating.toFixed(1)}★ from workers`
                      : 'New household'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                  <div className="flex items-start gap-2 text-slate-700">
                    <MapPin className="w-4 h-4 text-[#0F2347] shrink-0 mt-0.5" />
                    <span>{currentJob.customerLocation.address}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 text-slate-600 leading-relaxed">
                    <span className="font-semibold text-slate-800">
                      {currentJob.urgency} Urgency ·{' '}
                    </span>
                    {currentJob.problemSummary}
                  </div>
                </div>

                {currentJob.isScrap && currentJob.scrapItems.length > 0 && (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                    {currentJob.scrapItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="px-3.5 py-2.5 flex items-center justify-between"
                      >
                        <span className="text-slate-800 font-medium">
                          {item.item} ({item.quantityOrWeight})
                        </span>
                        <span className="font-semibold text-slate-900 tabular-nums">
                          ₹{item.estimatedValueInr}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleNextJob}
                    className="min-h-[48px] px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => advanceStep('on_the_way')}
                    className="flex-1 min-h-[48px] rounded-xl bg-[#0F2347] hover:bg-[#163161] active:scale-[0.99] text-white text-sm font-semibold transition-all"
                  >
                    Accept Job
                  </button>
                </div>
              </>
            )}

            {(effectiveStep === 'on_the_way' ||
              effectiveStep === 'arrived' ||
              effectiveStep === 'done') && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium text-slate-500">
                      Active Job · {currentJob.id}
                    </div>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                      {currentJob.customerLocation.label}, Kanpur
                    </h2>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-500">Quote</div>
                    <div className="text-base font-bold text-slate-900 tabular-nums">
                      ₹{currentJob.estimatedPriceMinInr}–₹
                      {currentJob.estimatedPriceMaxInr}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                  <div className="font-medium text-slate-900">
                    {currentJob.customerLocation.address}
                  </div>
                  <div>{currentJob.problemSummary}</div>
                  <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                    <span>Household Trust Score</span>
                    <span className="font-semibold text-[#0F2347]">
                      {trustStats.score}/100
                    </span>
                  </div>
                </div>

                {/* Chat button with household */}
                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="w-full min-h-[44px] px-4 rounded-xl border border-slate-200 hover:border-[#0F2347] bg-white text-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors tabular-nums"
                >
                  <MessageSquare className="w-4 h-4 text-[#0F2347]" />
                  <span>
                    Chat with Household
                    {chatMessages.length > 0 ? ` (${chatMessages.length})` : ''}
                  </span>
                </button>

                {/* Status Steps: On the way -> Arrived -> Done */}
                <div className="space-y-2.5 pt-1">
                  {statusSteps.map((st, idx) => {
                    const isDone = idx < currentStepIdx;
                    const isCurrent = idx === currentStepIdx;
                    const isNext = idx === currentStepIdx + 1;

                    return (
                      <div
                        key={st.key}
                        className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'border-[#0F2347] bg-[#0F2347]/[0.03]'
                            : isDone
                            ? 'border-slate-200 bg-slate-50/70'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                              isDone || isCurrent
                                ? 'bg-[#0F2347] text-white'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900">
                              {st.label}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                              {st.desc}
                            </div>
                          </div>
                        </div>

                        {isNext && (
                          <button
                            type="button"
                            onClick={() => advanceStep(st.key)}
                            className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#0F2347] hover:bg-[#163161] text-white text-xs font-semibold whitespace-nowrap shrink-0 transition-colors"
                          >
                            Mark {st.label}
                          </button>
                        )}

                        {isCurrent && st.key !== 'done' && (
                          <span className="text-xs font-semibold text-[#0F2347] shrink-0 flex items-center gap-1">
                            <Navigation className="w-3.5 h-3.5" />
                            Active
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Rating Step after Done */}
                {effectiveStep === 'done' && (
                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        Rate Household Experience
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Your 1–5 star rating updates the household&apos;s Trust Score.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          aria-label={`Rate ${star} stars`}
                          className="min-w-[44px] min-h-[44px] rounded-xl border border-slate-200 flex items-center justify-center hover:border-[#0F2347] transition-colors"
                        >
                          <Star
                            className={`w-5 h-5 ${
                              star <= rating
                                ? 'fill-[#0F2347] text-[#0F2347]'
                                : 'text-slate-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={feedbackNote}
                      onChange={(e) => setFeedbackNote(e.target.value)}
                      placeholder="Optional note about job or payment..."
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2347]"
                    />

                    <button
                      type="button"
                      onClick={handleSubmitRating}
                      className="w-full min-h-[48px] bg-[#0F2347] hover:bg-[#163161] text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      Submit {rating}-Star Rating & Complete
                    </button>
                  </div>
                )}
              </>
            )}

            {effectiveStep === 'rated' && (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-slate-500">
                    Completed · {currentJob.id}
                  </div>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">
                    Job finalized & rated {rating}/5 ★
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Your Kanpur completion log and the household&apos;s Trust Score have been updated.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleNextJob}
                  className="w-full min-h-[48px] bg-[#0F2347] hover:bg-[#163161] text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Load Next Kanpur Job
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="text-sm font-semibold text-slate-900">
              Customer Dispatch Map · Kanpur
            </div>
            <div className="text-xs text-slate-500">
              {currentJob.customerLocation.label}
            </div>
          </div>
          <KanpurMap
            apiKey={mapsApiKey}
            workers={[...KANPUR_WORKERS, partnerProfile]}
            highlightedTrade={partnerProfile.trade}
            selectedWorkerId={partnerProfile.id}
            householdLocation={currentJob.customerLocation}
            activeBookedWorker={
              effectiveStep === 'on_the_way' ? partnerProfile : null
            }
            movingWorkerPos={
              effectiveStep === 'on_the_way'
                ? { lat: partnerProfile.lat, lng: partnerProfile.lng }
                : null
            }
            heightClassName="h-[320px] sm:h-[400px] lg:h-[520px]"
          />
        </div>
      </div>

      <JobChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentUserRole="worker"
        peerName={`Household (${currentJob.customerLocation.label})`}
        messages={chatMessages}
        onSendMessage={(text) => onSendMessage(text, 'worker')}
      />
    </div>
  );
};
