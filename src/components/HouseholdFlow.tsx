import React, { useEffect, useMemo, useRef, useState } from 'react';
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

  // Active Booking / Live Arrival Tracking View
  if (activeJob) {
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

    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-slate-500">
                    {activeJob.id} · {TRADE_LABELS[activeJob.worker.trade]}
                  </div>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                    {activeJob.step === 'on_the_way' && 'Specialist is on the way'}
                    {activeJob.step === 'arrived' && 'Specialist has arrived'}
                    {activeJob.step === 'done' && 'Job completed'}
                    {activeJob.step === 'rated' && 'Thank you for rating'}
                  </h2>
                </div>

                {activeJob.step === 'on_the_way' && (
                  <div className="text-right shrink-0">
                    <div className="text-[11px] font-medium text-slate-500">
                      Arrival ETA
                    </div>
                    <div className="text-xl font-bold text-[#0F2347] tabular-nums">
                      {formatCountdown(etaSecondsLeft)}
                    </div>
                  </div>
                )}
              </div>

              {/* Clean progress bar + step indicators */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {stepLabels.map((item, idx) => {
                  const completed = idx < currentIdx || activeJob.step === 'rated';
                  const active = idx === currentIdx;
                  return (
                    <div key={item.key} className="space-y-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-colors ${
                          completed || active ? 'bg-[#0F2347]' : 'bg-slate-200'
                        }`}
                      />
                      <div
                        className={`text-xs font-medium flex items-center gap-1 ${
                          completed || active ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {completed && <Check className="w-3.5 h-3.5 text-[#0F2347]" />}
                        <span>{item.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Worker summary with Verified tick and Jobs Done count */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-semibold text-[#0F2347] shrink-0">
                    {activeJob.worker.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {activeJob.worker.name}
                      </span>
                      {activeJob.worker.verified && (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#0F2347] shrink-0">
                          <BadgeCheck className="w-3.5 h-3.5 text-[#0F2347]" />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 tabular-nums">
                      {activeJob.worker.rating} ★ · {activeJob.worker.jobsDone} jobs done ·{' '}
                      {activeJob.worker.neighborhood}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-500">
                    {activeJob.isScrap ? 'Est. Payout' : 'Quote Range'}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 tabular-nums">
                    ₹{activeJob.estimatedPriceMinInr}–₹{activeJob.estimatedPriceMaxInr}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
                <span className="font-medium text-slate-800">Task: </span>
                {activeJob.problemSummary}
              </div>

              {/* Chat, Cancel, and SOS controls during an active booking */}
              {isOngoingBooking && (
                <div className="pt-2 space-y-2.5">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsChatOpen(true)}
                      className="min-h-[44px] px-3 rounded-xl border border-slate-200 hover:border-[#0F2347] bg-white text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors tabular-nums"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[#0F2347]" />
                      <span>
                        Chat{chatMessages.length > 0 ? ` (${chatMessages.length})` : ''}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCancelConfirm((v) => !v);
                        setShowSosPanel(false);
                      }}
                      className="min-h-[44px] px-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold flex items-center justify-center transition-colors"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowSosPanel((v) => !v);
                        setShowCancelConfirm(false);
                      }}
                      className="min-h-[44px] px-3 rounded-xl border border-red-200 hover:bg-red-50 bg-white text-red-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>SOS</span>
                    </button>
                  </div>

                  {showCancelConfirm && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="text-xs font-medium text-slate-800">
                        Cancel this booking with {activeJob.worker.name}?
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={onClearJob}
                          className="flex-1 min-h-[40px] rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
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
                    </div>
                  )}

                  {showSosPanel && (
                    <div className="p-4 rounded-xl bg-red-50/70 border border-red-200 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-semibold text-red-900">
                            Emergency Safety Support
                          </div>
                          <div className="text-[11px] text-red-700 mt-0.5 tabular-nums">
                            {activeJob.id} · {activeJob.customerLocation.label}, Kanpur
                          </div>
                        </div>
                      </div>

                      {sosDispatchedAt ? (
                        <div className="p-2.5 rounded-lg bg-white border border-red-200 text-xs text-red-900">
                          Safety alert sent to Handl Kanpur Desk at {sosDispatchedAt}. Your live coordinates and worker ID ({activeJob.worker.name}) are shared.
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
                          className="min-h-[40px] px-3 rounded-lg bg-white border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-center gap-1.5"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Call 112</span>
                        </a>
                        <a
                          href="tel:100"
                          className="min-h-[40px] px-3 rounded-lg bg-white border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-center gap-1.5"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Police 100</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeJob.step === 'on_the_way' && (
                <button
                  type="button"
                  onClick={() => {
                    setTripProgress(1);
                    setEtaSecondsLeft(0);
                    onUpdateJobStep('arrived');
                  }}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                >
                  Fast-forward arrival
                </button>
              )}

              {activeJob.step === 'arrived' && (
                <button
                  type="button"
                  onClick={() => onUpdateJobStep('done')}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-[#0F2347] hover:bg-[#163161] text-white text-sm font-semibold transition-colors"
                >
                  Mark Job Complete
                </button>
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
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingDraft(star)}
                        aria-label={`Rate ${star} stars`}
                        className="min-w-[44px] min-h-[44px] rounded-xl border border-slate-200 flex items-center justify-center hover:border-[#0F2347] transition-colors"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= ratingDraft
                              ? 'fill-[#0F2347] text-[#0F2347]'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={ratingNote}
                    onChange={(e) => setRatingNote(e.target.value)}
                    placeholder="Optional feedback note..."
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F2347]"
                  />

                  <button
                    type="button"
                    onClick={() => onUpdateJobStep('rated', ratingDraft, ratingNote)}
                    className="w-full min-h-[48px] bg-[#0F2347] hover:bg-[#163161] text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    Submit {ratingDraft}-Star Rating
                  </button>
                </div>
              )}

              {activeJob.step === 'rated' && (
                <div className="pt-2 space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                    <span>Rating submitted</span>
                    <span className="font-semibold text-[#0F2347] tabular-nums">
                      {activeJob.ratingGiven} / 5 ★
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onClearJob}
                    className="w-full min-h-[48px] bg-[#0F2347] hover:bg-[#163161] text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    Book Another Service
                  </button>
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
      </div>
    );
  }

  // Default Household Intake + AI Triage + Comparable Worker Cards + Kanpur Map
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Intake & AI Assessment */}
        <div className="lg:col-span-5 space-y-5">
          {/* Household Trust Score Card */}
          <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-[#0F2347] shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900">
                  Household Trust Score
                </div>
                <div className="text-[11px] text-slate-500 truncate tabular-nums">
                  OTP verified · {householdTrust.pastBookings} past bookings ·{' '}
                  {trustSummary.avgWorkerRating !== null
                    ? `${trustSummary.avgWorkerRating.toFixed(1)}★ worker rating`
                    : 'No ratings yet'}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-bold text-[#0F2347] tabular-nums">
                {trustSummary.score}/100
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-slate-900">
                  Describe your issue
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Type, speak, or upload a photo for instant pricing
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 shrink-0">
                <MapPin className="w-3.5 h-3.5 text-[#0F2347]" />
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
                  <button
                    key={sample}
                    type="button"
                    onClick={() => {
                      setProblemText(sample);
                      setAnalysisError(null);
                    }}
                    className="text-[11px] text-slate-600 hover:text-[#0F2347] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-left transition-colors"
                  >
                    {sample}
                  </button>
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
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <span>Voice recording attached</span>
                <button
                  type="button"
                  onClick={() => setAudioBase64(null)}
                  className="text-slate-500 hover:text-slate-900 font-medium"
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
              <button
                type="button"
                onClick={toggleMicrophone}
                className={`min-h-[48px] px-3.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all shrink-0 ${
                  isRecording
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span className="tabular-nums">Stop ({recordingSeconds}s)</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 text-slate-600" />
                    <span>Speak</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[48px] px-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-colors shrink-0"
              >
                <Camera className="w-4 h-4 text-slate-600" />
                <span>Photo</span>
              </button>

              <button
                type="button"
                disabled={isAnalyzing}
                onClick={() => void runAnalysis()}
                className="flex-1 min-h-[48px] px-4 rounded-xl bg-[#0F2347] hover:bg-[#163161] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <span>Get Estimate</span>
                )}
              </button>
            </div>

            {analysisError && (
              <p className="text-xs font-medium text-red-600">{analysisError}</p>
            )}
          </div>

          {/* Gemini Triage Result */}
          {analysis && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500">
                    {TRADE_LABELS[analysis.workerType]} · {analysis.urgency} urgency
                  </div>
                  <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {analysis.isScrap ? 'Est. Payout ' : ''}₹{analysis.priceMinInr} – ₹
                    {analysis.priceMaxInr}
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed">
                {analysis.summary}
              </p>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span className="font-medium text-slate-700">Next step: </span>
                {analysis.recommendedAction}
              </div>

              {analysis.isScrap && analysis.scrapItems.length > 0 && (
                <div className="pt-3 border-t border-slate-100 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-800">
                    Identified Scrap Items
                  </div>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {analysis.scrapItems.map((item, idx) => (
                      <div
                        key={`${item.item}-${idx}`}
                        className="px-3.5 py-2.5 bg-white flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 truncate">
                            {item.item}
                          </div>
                          <div className="text-slate-500 tabular-nums">
                            {item.quantityOrWeight} · ₹{item.ratePerUnitInr}/unit
                          </div>
                        </div>
                        <div className="font-semibold text-slate-900 tabular-nums shrink-0">
                          ₹{item.estimatedValueInr}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Interactive Kanpur Google Map */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="text-sm font-semibold text-slate-900">
              Kanpur Live Coverage
            </div>
            <div className="text-xs text-slate-500 tabular-nums">
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

          <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl overflow-x-auto">
            {(
              ['all', 'plumber', 'electrician', 'carpenter', 'kabadiwala'] as const
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setTradeFilter(tab);
                  const first =
                    tab === 'all'
                      ? KANPUR_WORKERS[0]
                      : KANPUR_WORKERS.find((w) => w.trade === tab);
                  if (first) setSelectedWorkerId(first.id);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors min-h-[36px] ${
                  tradeFilter === tab
                    ? 'bg-[#0F2347] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'all' ? 'All (12)' : TRADE_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal snap comparison on mobile, crisp 3-column grid on desktop */}
        <div className="grid grid-flow-col auto-cols-[78%] sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-x-auto pb-2 snap-x">
          {filteredWorkers.map((worker) => {
            const isSelected = worker.id === selectedWorkerId;
            return (
              <div
                key={worker.id}
                onClick={() => setSelectedWorkerId(worker.id)}
                className={`snap-start bg-white rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#0F2347] ring-1 ring-[#0F2347]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-semibold shrink-0 border ${
                          isSelected
                            ? 'bg-[#0F2347] text-white border-[#0F2347]'
                            : 'bg-slate-50 text-[#0F2347] border-slate-200'
                        }`}
                      >
                        {worker.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900 truncate">
                            {worker.name}
                          </h3>
                          {worker.verified && (
                            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#0F2347] shrink-0">
                              <BadgeCheck className="w-3.5 h-3.5 text-[#0F2347]" />
                              <span>Verified</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {TRADE_LABELS[worker.trade]} · {worker.neighborhood}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Aligned Side-by-Side Comparison Metrics */}
                  <div className="divide-y divide-slate-100 border-t border-b border-slate-100 text-xs">
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">
                        {worker.trade === 'kabadiwala' ? 'Pickup Fee' : 'Visit Quote'}
                      </span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {worker.trade === 'kabadiwala'
                          ? 'Free'
                          : `₹${worker.priceInr}`}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Arrival Time</span>
                      <span className="font-semibold text-slate-900 tabular-nums flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {worker.arrivalMinutes} min
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Experience</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {worker.experienceYears} yrs
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Rating</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {worker.rating.toFixed(1)} ★
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between">
                      <span className="text-slate-500">Jobs Done</span>
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {worker.jobsDone} jobs done
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-1">
                    {worker.specialty}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBookWorker(worker);
                  }}
                  className="mt-4 w-full min-h-[44px] rounded-xl bg-[#0F2347] hover:bg-[#163161] active:scale-[0.99] text-white text-xs font-semibold transition-all"
                >
                  Book {worker.name.split(' ')[0]}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
