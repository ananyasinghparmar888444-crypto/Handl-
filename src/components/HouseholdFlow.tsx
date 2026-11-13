import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  BadgeCheck,
  Camera,
  Check,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  Mic,
  PhoneCall,
  ShieldCheck,
  Square,
  Star,
  Trash2,
} from 'lucide-react';
import {
  ActiveJob,
  ChatMessage,
  computeTrustScore,
  HouseholdLocation,
  HouseholdTrustData,
  ProblemAnalysis,
  WorkerProfile,
  WorkerTrade,
} from '../types';
import {
  KANPUR_HOUSEHOLD_LOCATIONS,
  KANPUR_WORKERS,
  TRADE_LABELS,
} from '../data/kanpurWorkers';
import { KanpurMap } from './KanpurMap';
import { JobChatDrawer } from './JobChatDrawer';
import {
  AnimatedTradeIcon,
  BookingConfirmationBanner,
  EASE_OUT_EXPO,
  GeminiShimmerLoader,
  PulsingLiveDot,
  TRADE_STYLES,
} from './TradeVisuals';

interface HouseholdFlowProps {
  userPhone: string;
  mapsApiKey: string;
  householdTrust: HouseholdTrustData;
  activeJob: ActiveJob | null;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string, sender: 'household' | 'worker') => void;
  onBookJob: (job: ActiveJob) => void;
  onUpdateJobStep: (step: ActiveJob['step'], rating?: number, note?: string) => void;
  onClearJob: () => void;
}

const SAMPLE_PROMPTS = [
  'Kitchen sink pipe is leaking water underneath',
  'Main room MCB trips when geyser turns on',
  'Bedroom wooden door lock is jammed',
  'Old newspapers (~10kg), copper wires, broken fan to sell',
];

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const HouseholdFlow: React.FC<HouseholdFlowProps> = ({
  userPhone,
  mapsApiKey,
  householdTrust,
  activeJob,
  chatMessages,
  onSendMessage,
  onBookJob,
  onUpdateJobStep,
  onClearJob,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const [householdLocation, setHouseholdLocation] = useState<HouseholdLocation>(
    KANPUR_HOUSEHOLD_LOCATIONS[0]
  );
  const [problemText, setProblemText] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMimeType, setPhotoMimeType] = useState<string>('image/jpeg');

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/webm');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ProblemAnalysis | null>(null);

  const [tradeFilter, setTradeFilter] = useState<WorkerTrade | 'all'>('all');
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(
    KANPUR_WORKERS[0].id
  );

  // Live pin animation state after booking
  const [tripProgress, setTripProgress] = useState(0);
  const [etaSecondsLeft, setEtaSecondsLeft] = useState(30);
  const [ratingDraft, setRatingDraft] = useState(5);
  const [ratingNote, setRatingNote] = useState('');
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false);

  // Chat, Cancel & SOS booking controls
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSosPanel, setShowSosPanel] = useState(false);
  const [sosDispatchedAt, setSosDispatchedAt] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  const trustSummary = useMemo(
    () => computeTrustScore(householdTrust),
    [householdTrust]
  );

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) {
        window.clearInterval(recordTimerRef.current);
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Show booking confirmation celebration briefly when a new booking starts
  useEffect(() => {
    if (!activeJob || activeJob.step !== 'on_the_way') {
      setShowBookingConfirmation(false);
      return;
    }
    setShowBookingConfirmation(true);
    const timer = window.setTimeout(() => {
      setShowBookingConfirmation(false);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [activeJob?.id]);

  // Live pin movement countdown when job is active
  useEffect(() => {
    if (!activeJob) {
      setTripProgress(0);
      setEtaSecondsLeft(30);
      setShowCancelConfirm(false);
      setShowSosPanel(false);
      setSosDispatchedAt(null);
      return;
    }

    if (
      activeJob.step === 'arrived' ||
      activeJob.step === 'done' ||
      activeJob.step === 'rated'
    ) {
      setTripProgress(1);
      setEtaSecondsLeft(0);
      return;
    }

    const totalDemoSeconds = 30;
    const tickMs = 250;
    const stepProgress = tickMs / (totalDemoSeconds * 1000);

    const interval = window.setInterval(() => {
      setTripProgress((prev) => {
        const next = Math.min(1, prev + stepProgress);
        const remaining = Math.max(0, Math.round((1 - next) * totalDemoSeconds));
        setEtaSecondsLeft(remaining);
        if (next >= 1) {
          onUpdateJobStep('arrived');
        }
        return next;
      });
    }, tickMs);

    return () => window.clearInterval(interval);
  }, [activeJob?.id, activeJob?.step]);

  const movingWorkerPos = useMemo(() => {
    if (!activeJob) return null;
    const startLat = activeJob.worker.lat;
    const startLng = activeJob.worker.lng;
    const endLat = activeJob.customerLocation.lat;
    const endLng = activeJob.customerLocation.lng;

    const curve = Math.sin(tripProgress * Math.PI) * 0.0022;
    return {
      lat: startLat + (endLat - startLat) * tripProgress + curve,
      lng: startLng + (endLng - startLng) * tripProgress - curve * 0.6,
    };
  }, [activeJob, tripProgress]);

  const filteredWorkers = useMemo(() => {
    if (tradeFilter === 'all') return KANPUR_WORKERS;
    return KANPUR_WORKERS.filter((w) => w.trade === tradeFilter);
  }, [tradeFilter]);

  const runAnalysis = async (overrides?: {
    text?: string;
    audioB64?: string;
    audioMime?: string;
  }) => {
    const textPayload = overrides?.text ?? problemText;
    const audioB64 = overrides?.audioB64 ?? audioBase64;
    const audioMime = overrides?.audioMime ?? audioMimeType;

    if (!textPayload.trim() && !photoBase64 && !audioB64) {
      setAnalysisError(
        'Type a description, speak into the microphone, or upload a photo.'
      );
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const resp = await fetch('/api/analyze-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textPayload,
          imageBase64: photoBase64,
          imageMimeType: photoMimeType,
          audioBase64: audioB64,
          audioMimeType: audioMime,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Could not analyze problem.');
      }

      const result = data as ProblemAnalysis;
      setAnalysis(result);
      if (result.transcript && !problemText.trim()) {
        setProblemText(result.transcript);
      }
      setTradeFilter(result.workerType);
      const firstMatch = KANPUR_WORKERS.find(
        (w) => w.trade === result.workerType
      );
      if (firstMatch) {
        setSelectedWorkerId(firstMatch.id);
      }
    } catch (err: unknown) {
      setAnalysisError(
        err instanceof Error ? err.message : 'Analysis failed. Try again.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalysisError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotoPreview(dataUrl);
      const commaIdx = dataUrl.indexOf(',');
      if (commaIdx !== -1) {
        setPhotoBase64(dataUrl.slice(commaIdx + 1));
        setPhotoMimeType(file.type || 'image/jpeg');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearPhoto = () => {
    setPhotoPreview(null);
    setPhotoBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleMicrophone = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (recordTimerRef.current) {
        window.clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      return;
    }

    setAnalysisError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(',')[1] || '';
          setAudioBase64(base64);
          setAudioMimeType(mimeType);
          void runAnalysis({ audioB64: base64, audioMime: mimeType });
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setAnalysisError(
        'Microphone access unavailable. Type your issue or upload a photo instead.'
      );
    }
  };

  const handleBookWorker = (worker: WorkerProfile) => {
    const newJob: ActiveJob = {
      id: `JOB-${Math.floor(1000 + Math.random() * 9000)}`,
      worker,
      customerPhone: userPhone,
      customerLocation: householdLocation,
      householdTrust,
      problemSummary:
        analysis?.summary ||
        problemText.trim() ||
        `${TRADE_LABELS[worker.trade]} requested in ${householdLocation.label}`,
      urgency: analysis?.urgency || 'Medium',
      estimatedPriceMinInr:
        analysis?.priceMinInr ?? (worker.priceInr || 250),
      estimatedPriceMaxInr:
        analysis?.priceMaxInr ?? (worker.priceInr ? worker.priceInr + 200 : 500),
      isScrap: analysis?.isScrap ?? worker.trade === 'kabadiwala',
      scrapItems: analysis?.scrapItems ?? [],
      step: 'on_the_way',
    };
    setTripProgress(0);
    setEtaSecondsLeft(30);
    onBookJob(newJob);
  };

  return (
    <AnimatePresence mode="wait">
      {activeJob ? (
        <motion.div
          key={`tracking-${activeJob.id}`}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
          className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6"
        >
          {(() => {
            const stepLabels: Array<{ key: ActiveJob['step']; label: string }> = [
              { key: 'on_the_way', label: 'On the way' },
              { key: 'arrived', label: 'Arrived' },
              { key: 'done', label: 'Done' },
            ];
            const currentIdx =
              activeJob.step === 'rated'
                ? 3
                : stepLabels.findIndex((s) => s.key === activeJob.step);

            const isOngoingBooking =
              activeJob.step === 'on_the_way' || activeJob.step === 'arrived';

            const workerTradeStyle = TRADE_STYLES[activeJob.worker.trade];

            return (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-5 space-y-4">
                    <AnimatePresence>
                      {showBookingConfirmation && (
                        <BookingConfirmationBanner
                          workerName={activeJob.worker.name}
                        />
                      )}
                    </AnimatePresence>

                    <div className="bg-white/85 backdrop-blur-xl border border-white/95 rounded-2xl p-5 sm:p-6 space-y-5 shadow-[0_20px_50px_-24px_rgba(15,35,71,0.2)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                            {activeJob.step === 'on_the_way' && <PulsingLiveDot />}
                            <span>
                              {activeJob.id} · {TRADE_LABELS[activeJob.worker.trade]}
                            </span>
                          </div>
                          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                            {activeJob.step === 'on_the_way' &&
                              'Specialist is on the way'}
                            {activeJob.step === 'arrived' &&
                              'Specialist has arrived'}
                            {activeJob.step === 'done' && 'Job completed'}
                            {activeJob.step === 'rated' && 'Thank you for rating'}
                          </h2>
                        </div>

                        {activeJob.step === 'on_the_way' && (
                          <div className="text-right shrink-0">
                            <div className="text-[11px] font-medium text-slate-500">
                              Arrival ETA
                            </div>
                            <div className="text-xl font-bold text-[#C2410C] tabular-nums">
                              {formatCountdown(etaSecondsLeft)}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Progress bar + teal completion indicators */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {stepLabels.map((item, idx) => {
                          const completed =
                            idx < currentIdx ||
                            activeJob.step === 'done' ||
                            activeJob.step === 'rated';
                          const active = idx === currentIdx;
                          return (
                            <div key={item.key} className="space-y-1.5">
                              <div
                                className={`h-1.5 rounded-full transition-colors ${
                                  completed
                                    ? 'bg-teal-600'
                                    : active
                                    ? 'bg-[#EA580C]'
                                    : 'bg-slate-200'
                                }`}
                              />
                              <div
                                className={`text-xs font-medium flex items-center gap-1 ${
                                  completed
                                    ? 'text-teal-800'
                                    : active
                                    ? 'text-slate-900'
                                    : 'text-slate-400'
                                }`}
                              >
                                {completed && (
                                  <Check className="w-3.5 h-3.5 text-teal-600" />
                                )}
                                <span>{item.label}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Worker summary with trade tint, Teal Verified tick, Amber Rating, Jobs Done */}
                      <div
                        className={`p-3.5 rounded-xl border border-slate-200/80 ${workerTradeStyle.cardBg} flex items-center justify-between gap-3`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-xl border ${workerTradeStyle.iconBg} flex items-center justify-center shrink-0`}
                          >
                            <AnimatedTradeIcon
                              trade={activeJob.worker.trade}
                              sizeClassName="w-5 h-5"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-sm font-semibold text-slate-900 truncate">
                                {activeJob.worker.name}
                              </span>
                              {activeJob.worker.verified && (
                                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-teal-700 shrink-0">
                                  <BadgeCheck className="w-3.5 h-3.5 text-teal-600" />
                                  <span>Verified</span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-600 tabular-nums flex items-center gap-1 flex-wrap">
                              <span className="inline-flex items-center gap-0.5 font-semibold text-amber-700">
                                {activeJob.worker.rating}
                                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                              </span>
                              <span>·</span>
                              <span>{activeJob.worker.jobsDone} jobs done</span>
                              <span>·</span>
                              <span>{activeJob.worker.neighborhood}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-slate-500">
                            {activeJob.isScrap ? 'Est. Payout' : 'Quote Range'}
                          </div>
                          <div className="text-sm font-semibold text-[#0F2347] tabular-nums">
                            ₹{activeJob.estimatedPriceMinInr}–₹
                            {activeJob.estimatedPriceMaxInr}
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
                        <span className="font-semibold text-slate-800">Task: </span>
                        {activeJob.problemSummary}
                      </div>

                      {/* Chat, Cancel, and SOS controls during an active booking */}
                      {isOngoingBooking && (
                        <div className="pt-1 space-y-2.5">
                          <div className="grid grid-cols-3 gap-2">
                            <motion.button
                              type="button"
                              whileHover={shouldReduceMotion ? undefined : { y: -1 }}
                              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                              onClick={() => setIsChatOpen(true)}
                              className="min-h-[44px] px-3 rounded-xl border border-slate-200 hover:border-[#0F2347] bg-[#F6F5FC] text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors tabular-nums"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-[#0F2347]" />
                              <span>
                                Chat
                                {chatMessages.length > 0
                                  ? ` (${chatMessages.length})`
                                  : ''}
                              </span>
                            </motion.button>

                            <motion.button
                              type="button"
                              whileHover={shouldReduceMotion ? undefined : { y: -1 }}
                              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                              onClick={() => {
                                setShowCancelConfirm((v) => !v);
                                setShowSosPanel(false);
                              }}
                              className="min-h-[44px] px-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold flex items-center justify-center transition-colors"
                            >
                              Cancel
                            </motion.button>

                            <motion.button
                              type="button"
                              whileHover={shouldReduceMotion ? undefined : { y: -1 }}
                              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                              onClick={() => {
                                setShowSosPanel((v) => !v);
                                setShowCancelConfirm(false);
                              }}
                              className="min-h-[44px] px-3 rounded-xl border border-amber-300 hover:bg-amber-50 bg-amber-50/70 text-amber-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                              <span>SOS</span>
                            </motion.button>
                          </div>

                          <AnimatePresence>
                            {showCancelConfirm && (
                              <motion.div
                                initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5"
                              >
                                <div className="text-xs font-medium text-slate-800">
                                  Cancel this booking with {activeJob.worker.name}?
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={onClearJob}
                                    className="flex-1 min-h-[40px] rounded-lg bg-[#0F2347] hover:bg-[#163161] text-white text-xs font-semibold transition-colors"
                                  >
                                    Confirm Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setShowCancelConfirm(false)}
                                    className="flex-1 min-h-[40px] rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                                  >
                                    Keep Booking
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <AnimatePresence>
                            {showSosPanel && (
                              <motion.div
                                initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="p-4 rounded-xl bg-amber-50/85 border border-amber-200 space-y-3"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="text-xs font-semibold text-amber-950">
                                      Emergency Safety Support
                                    </div>
                                    <div className="text-[11px] text-amber-900 mt-0.5 tabular-nums">
                                      {activeJob.id} ·{' '}
                                      {activeJob.customerLocation.label}, Kanpur
                                    </div>
                                  </div>
                                </div>

                                {sosDispatchedAt ? (
                                  <div className="p-2.5 rounded-lg bg-white border border-amber-200 text-xs text-slate-800">
                                    Safety alert sent to Handl Kanpur Desk at{' '}
                                    {sosDispatchedAt}. Your live coordinates and
                                    worker ID ({activeJob.worker.name}) are shared.
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSosDispatchedAt(
                                        new Date().toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      )
                                    }
                                    className="w-full min-h-[42px] rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold transition-colors"
                                  >
                                    Trigger Handl SOS Alert
                                  </button>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                  <a
                                    href="tel:112"
                                    className="min-h-[40px] px-3 rounded-lg bg-white border border-amber-200 text-red-800 text-xs font-semibold flex items-center justify-center gap-1.5"
                                  >
                                    <PhoneCall className="w-3.5 h-3.5" />
                                    <span>Call 112</span>
                                  </a>
                                  <a
                                    href="tel:100"
                                    className="min-h-[40px] px-3 rounded-lg bg-white border border-amber-200 text-red-800 text-xs font-semibold flex items-center justify-center gap-1.5"
                                  >
                                    <PhoneCall className="w-3.5 h-3.5" />
                                    <span>Police 100</span>
                                  </a>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {activeJob.step === 'on_the_way' && (
                        <motion.button
                          type="button"
                          whileHover={shouldReduceMotion ? undefined : { y: -1 }}
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                          onClick={() => {
                            setTripProgress(1);
                            setEtaSecondsLeft(0);
                            onUpdateJobStep('arrived');
                          }}
                          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#F6F5FC] hover:bg-slate-200/70 border border-slate-200 text-[#0F2347] text-xs font-semibold transition-colors"
                        >
                          Fast-forward arrival
                        </motion.button>
                      )}

                      {activeJob.step === 'arrived' && (
                        <motion.button
                          type="button"
                          whileHover={shouldReduceMotion ? undefined : { y: -1.5 }}
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                          onClick={() => onUpdateJobStep('done')}
                          className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors shadow-sm"
                        >
                          Mark Job Complete
                        </motion.button>
                      )}

                      {activeJob.step === 'done' && (
                        <div className="pt-4 border-t border-slate-100 space-y-4">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              Rate {activeJob.worker.name}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Tap 1 to 5 stars for service quality and punctuality.
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <motion.button
                                key={star}
                                type="button"
                                whileHover={shouldReduceMotion ? undefined : { scale: 1.08 }}
                                whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
                                onClick={() => setRatingDraft(star)}
                                aria-label={`Rate ${star} stars`}
                                className="min-w-[44px] min-h-[44px] rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:border-amber-400 transition-colors"
                              >
                                <Star
                                  className={`w-5 h-5 ${
                                    star <= ratingDraft
                                      ? 'fill-amber-400 text-amber-500'
                                      : 'text-slate-300'
                                  }`}
                                />
                              </motion.button>
                            ))}
                          </div>

                          <input
                            type="text"
                            value={ratingNote}
                            onChange={(e) => setRatingNote(e.target.value)}
                            placeholder="Optional feedback note..."
                            className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#0F2347]"
                          />

                          <motion.button
                            type="button"
                            whileHover={shouldReduceMotion ? undefined : { y: -1.5 }}
                            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                            onClick={() =>
                              onUpdateJobStep('rated', ratingDraft, ratingNote)
                            }
                            className="w-full min-h-[48px] bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                          >
                            Submit {ratingDraft}-Star Rating
                          </motion.button>
                        </div>
                      )}

                      {activeJob.step === 'rated' && (
                        <div className="pt-2 space-y-3">
                          <div className="p-3.5 rounded-xl bg-teal-50/90 border border-teal-200 text-xs text-teal-900 flex items-center justify-between">
                            <span className="font-medium">Rating submitted</span>
                            <span className="font-semibold text-amber-700 tabular-nums inline-flex items-center gap-1">
                              {activeJob.ratingGiven} / 5
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                            </span>
                          </div>
                          <motion.button
                            type="button"
                            whileHover={shouldReduceMotion ? undefined : { y: -1.5 }}
                            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                            onClick={onClearJob}
                            className="w-full min-h-[48px] bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                          >
                            Book Another Service
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-7">
                    <KanpurMap
                      apiKey={mapsApiKey}
                      workers={KANPUR_WORKERS}
                      highlightedTrade={activeJob.worker.trade}
                      selectedWorkerId={activeJob.worker.id}
                      householdLocation={activeJob.customerLocation}
                      activeBookedWorker={activeJob.worker}
                      movingWorkerPos={movingWorkerPos}
                      etaSecondsLeft={etaSecondsLeft}
                      heightClassName="h-[340px] sm:h-[420px] lg:h-[540px]"
                    />
                  </div>
                </div>

                <JobChatDrawer
                  isOpen={isChatOpen}
                  onClose={() => setIsChatOpen(false)}
                  currentUserRole="household"
                  peerName={activeJob.worker.name}
                  messages={chatMessages}
                  onSendMessage={(text) => onSendMessage(text, 'household')}
                />
              </>
            );
          })()}
        </motion.div>
      ) : (
        <motion.div
          key="household-intake"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
          className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Intake & AI Assessment */}
            <div className="lg:col-span-5 space-y-5">
              {/* Household Trust Score Card (Mint tint + Teal Verified Shield) */}
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                className="bg-[#F2FAF7]/90 backdrop-blur-xl border border-teal-200/75 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 shadow-[0_14px_35px_-22px_rgba(15,35,71,0.16)]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900">
                      Household Trust Score
                    </div>
                    <div className="text-[11px] text-slate-600 truncate tabular-nums">
                      OTP verified · {householdTrust.pastBookings} past bookings ·{' '}
                      {trustSummary.avgWorkerRating !== null
                        ? `${trustSummary.avgWorkerRating.toFixed(1)}★ worker rating`
                        : 'No ratings yet'}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-teal-800 tabular-nums">
                    {trustSummary.score}/100
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05, ease: EASE_OUT_EXPO }}
                className="bg-white/85 backdrop-blur-xl border border-white/95 rounded-2xl p-5 sm:p-6 space-y-5 shadow-[0_20px_50px_-24px_rgba(15,35,71,0.2)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                      Describe your issue
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Type, speak, or upload a photo for instant pricing
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-700 shrink-0 bg-[#F6F5FC] border border-slate-200 rounded-lg px-2.5 py-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#EA580C]" />
                    <select
                      aria-label="Select Kanpur neighborhood"
                      value={householdLocation.label}
                      onChange={(e) => {
                        const found = KANPUR_HOUSEHOLD_LOCATIONS.find(
                          (loc) => loc.label === e.target.value
                        );
                        if (found) setHouseholdLocation(found);
                      }}
                      className="bg-transparent font-medium text-slate-800 focus:outline-none cursor-pointer"
                    >
                      {KANPUR_HOUSEHOLD_LOCATIONS.map((loc) => (
                        <option key={loc.label} value={loc.label}>
                          {loc.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <textarea
                    rows={3}
                    value={problemText}
                    onChange={(e) => {
                      setProblemText(e.target.value);
                      setAnalysisError(null);
                    }}
                    placeholder="e.g., Kitchen sink pipe is leaking, or upload a photo of scrap items to sell..."
                    className="w-full p-3.5 text-sm text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#0F2347] focus:ring-1 focus:ring-[#0F2347] resize-none transition-all"
                  />

                  {/* Quick test prompts */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {SAMPLE_PROMPTS.map((sample) => (
                      <motion.button
                        key={sample}
                        type="button"
                        whileHover={shouldReduceMotion ? undefined : { y: -1 }}
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                        onClick={() => {
                          setProblemText(sample);
                          setAnalysisError(null);
                        }}
                        className="text-[11px] text-slate-600 hover:text-[#0F2347] bg-[#F6F5FC] hover:bg-orange-50/60 border border-slate-200 hover:border-orange-200 rounded-lg px-2.5 py-1.5 text-left transition-colors"
                      >
                        {sample}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {photoPreview && (
                  <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                    <img
                      src={photoPreview}
                      alt="Uploaded issue or scrap preview"
                      className="w-full h-40 object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleClearPhoto}
                      aria-label="Remove photo"
                      className="absolute top-2 right-2 min-w-[36px] min-h-[36px] rounded-lg bg-white/95 border border-slate-200 text-slate-700 hover:text-red-600 flex items-center justify-center shadow-xs"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {audioBase64 && !isRecording && (
                  <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-teal-50/80 border border-teal-200 text-xs text-teal-900">
                    <span>Voice recording attached</span>
                    <button
                      type="button"
                      onClick={() => setAudioBase64(null)}
                      className="text-teal-800 hover:text-slate-900 font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />

                {/* Voice + Photo + Analyze Actions */}
                <div className="flex items-center gap-2.5">
                  <motion.button
                    type="button"
                    whileHover={shouldReduceMotion ? undefined : { y: -1 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                    onClick={toggleMicrophone}
                    className={`min-h-[48px] px-3.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all shrink-0 ${
                      isRecording
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : 'bg-[#F6F5FC] border-slate-200 hover:border-[#0F2347] text-slate-800'
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span className="tabular-nums">
                          Stop ({recordingSeconds}s)
                        </span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4 text-[#0F2347]" />
                        <span>Speak</span>
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={shouldReduceMotion ? undefined : { y: -1 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[48px] px-3.5 rounded-xl border border-slate-200 hover:border-[#0F2347] bg-[#F6F5FC] text-slate-800 text-xs font-medium flex items-center justify-center gap-2 transition-colors shrink-0"
                  >
                    <Camera className="w-4 h-4 text-[#0F2347]" />
                    <span>Photo</span>
                  </motion.button>

                  <motion.button
                    type="button"
                    disabled={isAnalyzing}
                    whileHover={shouldReduceMotion ? undefined : { y: -1.5 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                    onClick={() => void runAnalysis()}
                    className="flex-1 min-h-[48px] px-4 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <span>Get Estimate</span>
                    )}
                  </motion.button>
                </div>

                {analysisError && (
                  <p className="text-xs font-medium text-red-600">
                    {analysisError}
                  </p>
                )}
              </motion.div>

              {/* Shimmer Loader while Gemini thinks */}
              <AnimatePresence mode="wait">
                {isAnalyzing && <GeminiShimmerLoader key="gemini-shimmer" />}

                {/* Gemini Triage Result */}
                {!isAnalyzing && analysis && (
                  <motion.div
                    key="gemini-result"
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                    className={`backdrop-blur-xl border border-white/95 rounded-2xl p-5 sm:p-6 space-y-4 shadow-[0_20px_50px_-24px_rgba(15,35,71,0.2)] ${
                      TRADE_STYLES[analysis.workerType].cardBg
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <AnimatedTradeIcon
                            trade={analysis.workerType}
                            sizeClassName="w-4 h-4"
                          />
                          <span className={TRADE_STYLES[analysis.workerType].chipText}>
                            {TRADE_LABELS[analysis.workerType]}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span
                            className={
                              analysis.urgency === 'High' ||
                              analysis.urgency === 'Emergency'
                                ? 'text-amber-800 font-semibold'
                                : 'text-slate-600'
                            }
                          >
                            {analysis.urgency} urgency
                          </span>
                        </div>
                        <div className="mt-1.5 text-2xl font-bold tracking-tight text-[#0F2347] tabular-nums">
                          {analysis.isScrap ? 'Est. Payout ' : ''}₹
                          {analysis.priceMinInr} – ₹{analysis.priceMaxInr}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed">
                      {analysis.summary}
                    </p>

                    <div className="pt-3 border-t border-slate-200/70 text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">
                        Next step:{' '}
                      </span>
                      {analysis.recommendedAction}
                    </div>

                    {analysis.isScrap && analysis.scrapItems.length > 0 && (
                      <div className="pt-3 border-t border-slate-200/70 space-y-2.5">
                        <div className="text-xs font-semibold text-slate-800">
                          Identified Scrap Items
                        </div>
                        <div className="divide-y divide-slate-100 border border-emerald-200/80 rounded-xl overflow-hidden bg-white/90">
                          {analysis.scrapItems.map((item, idx) => (
                            <div
                              key={`${item.item}-${idx}`}
                              className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0">
                                <div className="font-medium text-slate-900 truncate">
                                  {item.item}
                                </div>
                                <div className="text-slate-500 tabular-nums">
                                  {item.quantityOrWeight} · ₹
                                  {item.ratePerUnitInr}/unit
                                </div>
                              </div>
                              <div className="font-semibold text-teal-800 tabular-nums shrink-0">
                                ₹{item.estimatedValueInr}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column: Interactive Kanpur Google Map */}
            <div className="lg:col-span-7 space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <PulsingLiveDot />
                  <span>Kanpur Live Coverage</span>
                </div>
                <div className="text-xs font-medium text-slate-600 tabular-nums">
                  12 active workers nearby
                </div>
              </div>
              <KanpurMap
                apiKey={mapsApiKey}
                workers={KANPUR_WORKERS}
                highlightedTrade={tradeFilter}
                selectedWorkerId={selectedWorkerId}
                onSelectWorker={(id) => setSelectedWorkerId(id)}
                householdLocation={householdLocation}
                heightClassName="h-[300px] sm:h-[360px] lg:h-[520px]"
              />
            </div>
          </div>

          {/* Nearby Workers Side-by-Side Comparison Section */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                  Compare nearby workers
                </h2>
                <p className="text-xs text-slate-500">
                  Tap any card to locate on map, compare metrics side by side, and book
                </p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-white/85 backdrop-blur-md border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
                {(
                  [
                    'all',
                    'plumber',
                    'electrician',
                    'carpenter',
                    'kabadiwala',
                  ] as const
                ).map((tab) => {
                  const isActive = tradeFilter === tab;
                  return (
                    <motion.button
                      key={tab}
                      type="button"
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                      onClick={() => {
                        setTradeFilter(tab);
                        const first =
                          tab === 'all'
                            ? KANPUR_WORKERS[0]
                            : KANPUR_WORKERS.find((w) => w.trade === tab);
                        if (first) setSelectedWorkerId(first.id);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors min-h-[36px] flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-[#0F2347] text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab !== 'all' && !isActive && (
                        <AnimatedTradeIcon trade={tab} sizeClassName="w-3.5 h-3.5" />
                      )}
                      <span>
                        {tab === 'all' ? 'All (12)' : TRADE_LABELS[tab]}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Staggered Worker Cards with soft color per trade */}
            <div className="grid grid-flow-col auto-cols-[78%] sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-x-auto pb-2 snap-x">
              {filteredWorkers.map((worker, idx) => {
                const isSelected = worker.id === selectedWorkerId;
                const tradeStyle = TRADE_STYLES[worker.trade];

                return (
                  <motion.div
                    key={worker.id}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.35,
                      delay: Math.min(idx * 0.04, 0.28),
                      ease: EASE_OUT_EXPO,
                    }}
                    whileHover={
                      shouldReduceMotion
                        ? undefined
                        : { y: -3, transition: { duration: 0.16 } }
                    }
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                    onClick={() => setSelectedWorkerId(worker.id)}
                    className={`snap-start backdrop-blur-xl rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between shadow-[0_14px_35px_-22px_rgba(15,35,71,0.18)] ${
                      isSelected
                        ? `border-[#0F2347] ring-1 ring-[#0F2347] bg-white`
                        : `border-white/95 ${tradeStyle.cardBg} hover:border-slate-300`
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-semibold shrink-0 border ${
                              isSelected
                                ? 'bg-[#0F2347] text-white border-[#0F2347]'
                                : `${tradeStyle.iconBg}`
                            }`}
                          >
                            {isSelected ? (
                              worker.initials
                            ) : (
                              <AnimatedTradeIcon
                                trade={worker.trade}
                                sizeClassName="w-4 h-4"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h3 className="text-sm font-semibold text-slate-900 truncate">
                                {worker.name}
                              </h3>
                              {worker.verified && (
                                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-teal-700 shrink-0">
                                  <BadgeCheck className="w-3.5 h-3.5 text-teal-600" />
                                  <span>Verified</span>
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-xs truncate font-medium ${tradeStyle.chipText}`}
                            >
                              {TRADE_LABELS[worker.trade]} ·{' '}
                              <span className="text-slate-600 font-normal">
                                {worker.neighborhood}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Aligned Side-by-Side Comparison Metrics */}
                      <div className="divide-y divide-slate-200/60 border-t border-b border-slate-200/60 text-xs">
                        <div className="py-2 flex items-center justify-between">
                          <span className="text-slate-600">
                            {worker.trade === 'kabadiwala'
                              ? 'Pickup Fee'
                              : 'Visit Quote'}
                          </span>
                          <span className="font-semibold text-slate-900 tabular-nums">
                            {worker.trade === 'kabadiwala'
                              ? 'Free'
                              : `₹${worker.priceInr}`}
                          </span>
                        </div>
                        <div className="py-2 flex items-center justify-between">
                          <span className="text-slate-600">Arrival Time</span>
                          <span className="font-semibold text-[#C2410C] tabular-nums flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#EA580C]" />
                            {worker.arrivalMinutes} min
                          </span>
                        </div>
                        <div className="py-2 flex items-center justify-between">
                          <span className="text-slate-600">Experience</span>
                          <span className="font-semibold text-slate-900 tabular-nums">
                            {worker.experienceYears} yrs
                          </span>
                        </div>
                        <div className="py-2 flex items-center justify-between">
                          <span className="text-slate-600">Rating</span>
                          <span className="font-semibold text-amber-800 tabular-nums inline-flex items-center gap-1">
                            {worker.rating.toFixed(1)}
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                          </span>
                        </div>
                        <div className="py-2 flex items-center justify-between">
                          <span className="text-slate-600">Jobs Done</span>
                          <span className="font-semibold text-teal-800 tabular-nums">
                            {worker.jobsDone} jobs done
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-1">
                        {worker.specialty}
                      </p>
                    </div>

                    <motion.button
                      type="button"
                      whileHover={shouldReduceMotion ? undefined : { y: -1 }}
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookWorker(worker);
                      }}
                      className="mt-4 w-full min-h-[44px] rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-semibold transition-colors shadow-xs"
                    >
                      Book {worker.name.split(' ')[0]}
                    </motion.button>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
