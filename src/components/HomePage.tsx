import React, { useEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  Clock,
  Droplets,
  IndianRupee,
  MapPin,
  MessageSquare,
  Mic,
  Navigation,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react';
import { EASE_OUT_EXPO, PulsingLiveDot } from './TradeVisuals';

interface HomePageProps {
  onGetStarted: () => void;
}

interface AnimatedCounterProps {
  to: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  to,
  decimals = 0,
  prefix = '',
  suffix = '',
}) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const shouldReduceMotion = useReducedMotion();
  const [display, setDisplay] = useState<string>(
    shouldReduceMotion ? to.toFixed(decimals) : (0).toFixed(decimals)
  );

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplay(to.toFixed(decimals));
      return;
    }
    if (!inView) return;

    const controls = animate(0, to, {
      duration: 1.25,
      ease: EASE_OUT_EXPO,
      onUpdate: (latest) => {
        setDisplay(latest.toFixed(decimals));
      },
    });

    return () => controls.stop();
  }, [inView, to, decimals, shouldReduceMotion]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {display}
      {suffix}
    </span>
  );
};

const FEATURES = [
  {
    title: 'Type, speak or photo requests',
    description:
      'Describe a repair or scrap pickup by typing, recording a voice note, or uploading a photo.',
    icon: MessageSquare,
    accentIcon: Mic,
    secondaryIcon: Camera,
    kind: 'multimodal' as const,
  },
  {
    title: 'Fair price upfront',
    description:
      'See an estimated rupee price range or itemized scrap valuation before you confirm a booking.',
    icon: IndianRupee,
    accentIcon: ShieldCheck,
    secondaryIcon: IndianRupee,
    kind: 'pricing' as const,
  },
  {
    title: 'Compare nearby workers',
    description:
      'Evaluate verified plumbers, electricians, carpenters, and kabadiwalas side by side by rate, ETA, and jobs done.',
    icon: Users,
    accentIcon: BadgeCheck,
    secondaryIcon: Star,
    kind: 'compare' as const,
  },
  {
    title: 'Live tracking and trust score',
    description:
      'Follow your worker’s live route on the Kanpur map with an arrival countdown and mutual trust score.',
    icon: MapPin,
    accentIcon: Navigation,
    secondaryIcon: ShieldCheck,
    kind: 'tracking' as const,
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Describe the problem',
    description:
      'Share what needs fixing or recycling via text, voice, or photo to get the right trade and price estimate.',
  },
  {
    number: '02',
    title: 'Compare and book',
    description:
      'Browse nearby verified workers on the map, compare upfront prices and arrival times, and book in one tap.',
  },
  {
    number: '03',
    title: 'Track and rate',
    description:
      'Track live arrival progress, coordinate via quick chat, and leave a rating after the job is done.',
  },
];

const METRICS = [
  {
    value: 12,
    suffix: '+',
    decimals: 0,
    label: 'Verified Kanpur workers ready on map',
  },
  {
    value: 4.9,
    suffix: '★',
    decimals: 1,
    label: 'Average completed service rating',
  },
  {
    value: 10,
    suffix: ' min',
    decimals: 0,
    label: 'Typical arrival window across localities',
  },
  {
    value: 94,
    suffix: '/100',
    decimals: 0,
    label: 'Average mutual household trust score',
  },
];

export const HomePage: React.FC<HomePageProps> = ({ onGetStarted }) => {
  const shouldReduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 26,
    mass: 0.35,
  });

  // Different parallax speeds for the watermark and each floating glass card
  const watermarkY = useTransform(smoothProgress, [0, 1], [0, 95]);
  const watermarkScale = useTransform(smoothProgress, [0, 1], [1, 1.07]);

  const workerCardY = useTransform(smoothProgress, [0, 1], [0, -72]);
  const priceCardY = useTransform(smoothProgress, [0, 1], [0, -34]);
  const trackingCardY = useTransform(smoothProgress, [0, 1], [0, -108]);

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
      transition={{ duration: 0.32, ease: EASE_OUT_EXPO }}
      className="min-h-screen bg-gradient-to-b from-[#FFFFFF] via-[#F4F6FA] to-[#ECEFF5] text-slate-900 flex flex-col"
    >
      {/* Sticky blurred navigation bar */}
      <header className="sticky top-0 z-40 h-14 bg-white/75 backdrop-blur-xl border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-8">
          <span
            className="text-lg font-bold tracking-tight text-[#0F2347] whitespace-nowrap shrink-0"
            style={{ fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif' }}
          >
            Handl
          </span>

          <nav className="hidden sm:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#features"
              className="hover:text-[#0F2347] transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-[#0F2347] transition-colors whitespace-nowrap shrink-0"
            >
              How it works
            </a>
          </nav>

          <div className="shrink-0">
            <motion.button
              type="button"
              onClick={onGetStarted}
              whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              transition={{ duration: 0.16, ease: EASE_OUT_EXPO }}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#EA580C] hover:bg-[#C2410C] rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              Get started
            </motion.button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-clip">
        {/* Cinematic Hero with Giant Faint Watermark + Parallax Floating Glass Cards */}
        <section
          ref={heroRef}
          className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-16 sm:pt-20 sm:pb-24"
        >
          {/* Ambient CSS geometric gradient orbs (no stock photos) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-[680px] h-[380px] rounded-full bg-[radial-gradient(circle_at_center,rgba(15,35,71,0.065),transparent_68%)] blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-24 right-0 w-[360px] h-[360px] rounded-full bg-[radial-gradient(circle_at_center,rgba(234,88,12,0.09),transparent_70%)] blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-4 left-0 w-[320px] h-[320px] rounded-full bg-[radial-gradient(circle_at_center,rgba(13,148,136,0.08),transparent_70%)] blur-2xl"
          />

          {/* Giant faint "Handl" watermark behind the headline */}
          <motion.div
            aria-hidden="true"
            style={
              shouldReduceMotion
                ? undefined
                : { y: watermarkY, scale: watermarkScale }
            }
            className="pointer-events-none select-none absolute inset-x-0 top-6 sm:top-4 flex justify-center overflow-hidden will-change-transform"
          >
            <span
              className="text-[24vw] sm:text-[175px] md:text-[220px] lg:text-[260px] font-extrabold tracking-tighter leading-none text-[#0F2347]/[0.04]"
              style={{ fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif' }}
            >
              Handl
            </span>
          </motion.div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Editorial Headline Column */}
            <div className="lg:col-span-6 text-left">
              <motion.p
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
                className="text-xs font-medium text-slate-500"
              >
                Handl · Kanpur Home Services &amp; Scrap Pickup
              </motion.p>

              <motion.h1
                initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.06, ease: EASE_OUT_EXPO }}
                className="mt-4 text-[2.65rem] sm:text-6xl lg:text-[4.15rem] font-extrabold tracking-tight text-slate-950 leading-[1.04] text-balance"
                style={{ fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif' }}
              >
                Got a problem?{' '}
                <span className="block sm:inline mt-1 sm:mt-0">
                  <span
                    className="italic font-normal text-[#0F2347] pr-1"
                    style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                  >
                    Handl
                  </span>{' '}
                  it.
                </span>
              </motion.h1>

              <motion.p
                initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.14, ease: EASE_OUT_EXPO }}
                className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl"
              >
                Book verified plumbers, electricians, carpenters, and scrap collectors in Kanpur with instant upfront pricing, live map tracking, and mutual trust scores.
              </motion.p>

              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.22, ease: EASE_OUT_EXPO }}
                className="mt-8 flex flex-wrap items-center gap-4"
              >
                <motion.button
                  type="button"
                  onClick={onGetStarted}
                  whileHover={
                    shouldReduceMotion
                      ? undefined
                      : { y: -2, boxShadow: '0 14px 30px -10px rgba(234, 88, 12, 0.42)' }
                  }
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                  transition={{ duration: 0.18, ease: EASE_OUT_EXPO }}
                  className="min-h-[50px] px-7 py-3.5 bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-2.5 transition-colors whitespace-nowrap shrink-0 shadow-sm"
                >
                  <span>Get started</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>

                <a
                  href="#how-it-works"
                  className="min-h-[50px] px-4 py-3 text-sm font-medium text-slate-600 hover:text-[#0F2347] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>See how it works</span>
                </a>
              </motion.div>
            </div>

            {/* Parallax Floating Glass Cards Stage */}
            <div className="lg:col-span-6 relative">
              {/* Subtle architectural grid backdrop made purely of CSS */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-4 rounded-3xl border border-slate-200/70 bg-[linear-gradient(to_right,rgba(15,35,71,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,35,71,0.035)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_100%)]"
              />

              <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4 py-2 sm:py-4">
                {/* Floating Glass Card 1: Worker Card with Rating (Plumber Blue + Teal Verified) */}
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.16, ease: EASE_OUT_EXPO }}
                  style={shouldReduceMotion ? undefined : { y: workerCardY }}
                  whileHover={
                    shouldReduceMotion
                      ? undefined
                      : { y: -4, transition: { duration: 0.2 } }
                  }
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                  className="bg-[#F6F5FC]/85 backdrop-blur-xl border border-white/95 rounded-2xl p-5 shadow-[0_18px_45px_-20px_rgba(15,35,71,0.2)] will-change-transform cursor-default"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold flex items-center justify-center shrink-0">
                        <Droplets className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-slate-900 truncate">
                            Rajesh Verma
                          </span>
                          <BadgeCheck className="w-4 h-4 text-teal-600 shrink-0" />
                        </div>
                        <p className="text-xs text-sky-900/80 font-medium">
                          Plumber · Swaroop Nagar
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-200/70 flex items-center justify-between text-xs tabular-nums">
                    <div className="flex items-center gap-1 font-semibold text-slate-900">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span>4.9</span>
                      <span className="font-normal text-slate-400">·</span>
                      <span className="font-medium text-slate-600">142 jobs</span>
                    </div>
                    <span className="font-semibold text-[#C2410C]">8 min away</span>
                  </div>
                </motion.div>

                {/* Floating Glass Card 2: Price Estimate Card (Lavender/White + Orange Accent) */}
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.24, ease: EASE_OUT_EXPO }}
                  style={shouldReduceMotion ? undefined : { y: priceCardY }}
                  whileHover={
                    shouldReduceMotion
                      ? undefined
                      : { y: -4, transition: { duration: 0.2 } }
                  }
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                  className="bg-white/85 backdrop-blur-xl border border-white/95 rounded-2xl p-5 shadow-[0_18px_45px_-20px_rgba(15,35,71,0.2)] sm:mt-6 will-change-transform cursor-default"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium">Fair price estimate</span>
                    <IndianRupee className="w-3.5 h-3.5 text-[#EA580C]" />
                  </div>
                  <div className="mt-2.5 text-2xl font-bold tracking-tight text-[#0F2347] tabular-nums">
                    ₹350 – ₹550
                  </div>
                  <p className="mt-1 text-xs text-amber-800 font-medium">
                    Kitchen sink leak · Medium urgency
                  </p>
                  {/* CSS range visualization */}
                  <div className="mt-4 h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
                    <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-[#0F2347] to-[#EA580C]" />
                  </div>
                </motion.div>

                {/* Floating Glass Card 3: Live Tracking Card (Mint Tint + Teal Pulsing Dot) */}
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 32 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.32, ease: EASE_OUT_EXPO }}
                  style={shouldReduceMotion ? undefined : { y: trackingCardY }}
                  whileHover={
                    shouldReduceMotion
                      ? undefined
                      : { y: -4, transition: { duration: 0.2 } }
                  }
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                  className="sm:col-span-2 bg-[#F2FAF7]/90 backdrop-blur-xl border border-teal-200/70 rounded-2xl p-5 shadow-[0_22px_50px_-22px_rgba(15,35,71,0.22)] will-change-transform cursor-default"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-800">
                        <Navigation className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            Live arrival tracking
                          </p>
                          <PulsingLiveDot />
                        </div>
                        <p className="text-xs text-slate-600">
                          En route to Kakadeo · Trust Score{' '}
                          <span className="font-semibold text-teal-800">94/100</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C2410C] tabular-nums">
                      <Clock className="w-3.5 h-3.5" />
                      <span>06:40 ETA</span>
                    </div>
                  </div>

                  {/* Pure CSS route schematic */}
                  <div className="mt-4 pt-3.5 border-t border-teal-200/60">
                    <div className="relative flex items-center justify-between">
                      <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full w-2/3 bg-gradient-to-r from-[#0F2347] to-teal-600 rounded-full" />
                      </div>
                      <div className="absolute left-0 w-2.5 h-2.5 rounded-full bg-white border-2 border-[#0F2347]" />
                      <div className="absolute left-2/3 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-teal-600 ring-4 ring-teal-500/20" />
                      <div className="absolute right-0 w-2.5 h-2.5 rounded-full bg-[#EA580C]" />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] font-medium text-slate-600">
                      <span>Swaroop Nagar</span>
                      <span className="text-teal-800 font-semibold">1.2 km away</span>
                      <span>Your home</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Animated Number Counters Strip */}
        <motion.section
          initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
          className="max-w-6xl mx-auto px-4 sm:px-6 pb-14 sm:pb-20"
        >
          <div className="bg-white/80 backdrop-blur-md border border-slate-200/90 rounded-2xl p-6 sm:p-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
            {METRICS.map((metric) => (
              <div key={metric.label} className="space-y-1">
                <div
                  className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0F2347]"
                  style={{ fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif' }}
                >
                  <AnimatedCounter
                    to={metric.value}
                    decimals={metric.decimals}
                    suffix={metric.suffix}
                  />
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-snug">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* 4 Feature Cards with Scroll Slide-In + Illustrated Icons & CSS Shapes */}
        <section
          id="features"
          className="max-w-6xl mx-auto px-4 sm:px-6 pb-14 sm:pb-20"
        >
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
            className="max-w-xl mb-8"
          >
            <p className="text-xs font-medium text-slate-500">
              Built for everyday home repairs &amp; recycling
            </p>
            <h2
              className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-950"
              style={{ fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif' }}
            >
              Everything needed before a worker knocks.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {FEATURES.map((feature, idx) => {
              const Icon = feature.icon;
              const AccentIcon = feature.accentIcon;
              const SecondaryIcon = feature.secondaryIcon;

              return (
                <motion.div
                  key={feature.title}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    duration: 0.5,
                    delay: idx * 0.06,
                    ease: EASE_OUT_EXPO,
                  }}
                  whileHover={
                    shouldReduceMotion
                      ? undefined
                      : { y: -4, transition: { duration: 0.18, ease: EASE_OUT_EXPO } }
                  }
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                  className="bg-white/85 backdrop-blur-md border border-slate-200 rounded-2xl p-6 transition-colors hover:border-slate-300 shadow-xs"
                >
                  {/* Illustrated Icon + CSS Shape Composition */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#0F2347] text-white flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>

                    {feature.kind === 'multimodal' && (
                      <div
                        aria-hidden="true"
                        className="flex items-center gap-2 text-slate-400"
                      >
                        <div className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                          <AccentIcon className="w-3.5 h-3.5 text-[#0F2347]" />
                        </div>
                        <div className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                          <SecondaryIcon className="w-3.5 h-3.5 text-[#0F2347]" />
                        </div>
                      </div>
                    )}

                    {feature.kind === 'pricing' && (
                      <div
                        aria-hidden="true"
                        className="flex items-center gap-1.5"
                      >
                        <span className="h-1.5 w-8 rounded-full bg-slate-200" />
                        <span className="h-1.5 w-12 rounded-full bg-[#0F2347]" />
                        <span className="h-1.5 w-4 rounded-full bg-slate-200" />
                      </div>
                    )}

                    {feature.kind === 'compare' && (
                      <div
                        aria-hidden="true"
                        className="flex items-center -space-x-2"
                      >
                        <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-[#0F2347] flex items-center justify-center">
                          AK
                        </div>
                        <div className="w-7 h-7 rounded-full border-2 border-white bg-[#0F2347] text-[10px] font-bold text-white flex items-center justify-center">
                          RV
                        </div>
                        <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-200 text-[10px] font-bold text-slate-700 flex items-center justify-center">
                          MS
                        </div>
                      </div>
                    )}

                    {feature.kind === 'tracking' && (
                      <div
                        aria-hidden="true"
                        className="flex items-center gap-1.5 text-[#0F2347]"
                      >
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                        <span className="w-6 h-0.5 bg-[#0F2347]/40" />
                        <AccentIcon className="w-3.5 h-3.5" />
                        <span className="w-6 h-0.5 bg-slate-200" />
                        <SecondaryIcon className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    )}
                  </div>

                  <h3 className="mt-5 text-base font-semibold tracking-tight text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* How It Works (3 Steps) */}
        <section
          id="how-it-works"
          className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24"
        >
          <div className="border-t border-slate-200/90 pt-14">
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
            >
              <h2
                className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950"
                style={{ fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif' }}
              >
                How it works
              </h2>
            </motion.div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {STEPS.map((step, idx) => (
                <motion.div
                  key={step.number}
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{
                    duration: 0.5,
                    delay: idx * 0.08,
                    ease: EASE_OUT_EXPO,
                  }}
                  whileHover={
                    shouldReduceMotion
                      ? undefined
                      : { y: -4, transition: { duration: 0.18, ease: EASE_OUT_EXPO } }
                  }
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                  className="bg-white/85 backdrop-blur-md border border-slate-200 rounded-2xl p-6 shadow-xs transition-colors hover:border-slate-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#0F2347] tabular-nums">
                      {step.number}
                    </span>
                    <span
                      aria-hidden="true"
                      className="h-px w-10 bg-slate-200"
                    />
                  </div>
                  <h3 className="mt-4 text-base font-semibold tracking-tight text-slate-900">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Closing CTA Card */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
              className="mt-10 bg-[#0F2347] text-white rounded-2xl p-7 sm:p-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative overflow-hidden"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-12 -top-12 w-56 h-56 rounded-full border border-white/10"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-4 -top-4 w-36 h-36 rounded-full border border-white/10"
              />

              <div className="relative z-10 max-w-lg">
                <h3
                  className="text-xl sm:text-2xl font-bold tracking-tight text-balance"
                  style={{ fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif' }}
                >
                  Need a repair or scrap pickup in Kanpur?
                </h3>
                <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                  Verify with OTP in seconds and choose whether you need help or want to accept jobs as a worker.
                </p>
              </div>

              <motion.button
                type="button"
                onClick={onGetStarted}
                whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
                transition={{ duration: 0.16, ease: EASE_OUT_EXPO }}
                className="relative z-10 min-h-[48px] px-6 py-3 bg-[#EA580C] hover:bg-[#C2410C] text-white text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 shadow-sm"
              >
                <span>Get started</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-center text-xs font-medium text-slate-500">
          Team Catalyst, IDEATHON 2026
        </div>
      </footer>
    </motion.div>
  );
};
