export type WorkerTrade = 'plumber' | 'electrician' | 'carpenter' | 'kabadiwala';

export type UrgencyLevel = 'Low' | 'Medium' | 'High' | 'Emergency';

export type UserRole = 'household' | 'worker';

export type JobStep = 'new_job' | 'on_the_way' | 'arrived' | 'done' | 'rated';

export interface ScrapItem {
  item: string;
  quantityOrWeight: string;
  ratePerUnitInr: number;
  estimatedValueInr: number;
}

export interface ProblemAnalysis {
  transcript: string;
  workerType: WorkerTrade;
  urgency: UrgencyLevel;
  priceMinInr: number;
  priceMaxInr: number;
  summary: string;
  recommendedAction: string;
  isScrap: boolean;
  scrapItems: ScrapItem[];
}

export interface WorkerProfile {
  id: string;
  name: string;
  initials: string;
  trade: WorkerTrade;
  neighborhood: string;
  lat: number;
  lng: number;
  priceInr: number;
  arrivalMinutes: number;
  experienceYears: number;
  rating: number;
  jobsDone: number;
  verified: boolean;
  verifiedSince: string;
  specialty: string;
}

export interface HouseholdLocation {
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export interface HouseholdTrustData {
  otpVerified: boolean;
  pastBookings: number;
  workerRatings: number[];
}

export interface ChatMessage {
  id: string;
  sender: UserRole;
  text: string;
  timestamp: string;
}

export interface ActiveJob {
  id: string;
  worker: WorkerProfile;
  customerPhone: string;
  customerLocation: HouseholdLocation;
  householdTrust: HouseholdTrustData;
  problemSummary: string;
  urgency: UrgencyLevel;
  estimatedPriceMinInr: number;
  estimatedPriceMaxInr: number;
  isScrap: boolean;
  scrapItems: ScrapItem[];
  step: JobStep;
  ratingGiven?: number;
  ratingNote?: string;
}

export interface RegisteredWorkerProfile {
  name: string;
  skill: WorkerTrade;
  experienceYears: number;
  area: string;
  photoDataUrl?: string | null;
  phone: string;
  verified: boolean;
  jobsDone: number;
}

export function computeTrustScore(trust: HouseholdTrustData): {
  score: number;
  otpPoints: number;
  bookingPoints: number;
  ratingPoints: number;
  avgWorkerRating: number | null;
} {
  const otpPoints = trust.otpVerified ? 40 : 0;
  const bookingPoints = Math.min(30, trust.pastBookings * 6);
  const avgWorkerRating =
    trust.workerRatings.length > 0
      ? trust.workerRatings.reduce((sum, r) => sum + r, 0) /
        trust.workerRatings.length
      : null;
  const ratingPoints =
    avgWorkerRating !== null ? Math.round((avgWorkerRating / 5) * 30) : 0;

  return {
    score: Math.min(100, otpPoints + bookingPoints + ratingPoints),
    otpPoints,
    bookingPoints,
    ratingPoints,
    avgWorkerRating,
  };
}
