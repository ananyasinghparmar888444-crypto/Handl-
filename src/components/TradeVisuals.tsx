import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Droplets, Hammer, Recycle, Zap } from 'lucide-react';
import { WorkerTrade } from '../types';

export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export interface TradeVisualStyle {
  label: string;
  cardBg: string;
  chipBg: string;
  chipBorder: string;
  chipText: string;
  iconBg: string;
  iconText: string;
  pinBg: string;
  pinBorder: string;
  pinText: string;
  dotColor: string;
}

export const TRADE_STYLES: Record<WorkerTrade, TradeVisualStyle> = {
  plumber: {
    label: 'Plumber',
    cardBg: 'bg-sky-50/45',
    chipBg: 'bg-sky-50',
    chipBorder: 'border-sky-200',
    chipText: 'text-sky-900',
    iconBg: 'bg-sky-100/90 border-sky-200',
    iconText: 'text-sky-700',
    pinBg: 'bg-sky-50',
    pinBorder: 'border-sky-300',
    pinText: 'text-sky-950',
    dotColor: 'bg-sky-500',
  },
  electrician: {
    label: 'Electrician',
    cardBg: 'bg-amber-50/45',
    chipBg: 'bg-amber-50',
    chipBorder: 'border-amber-200',
    chipText: 'text-amber-900',
    iconBg: 'bg-amber-100/90 border-amber-200',
    iconText: 'text-amber-700',
    pinBg: 'bg-amber-50',
    pinBorder: 'border-amber-300',
    pinText: 'text-amber-950',
    dotColor: 'bg-amber-500',
  },
  carpenter: {
    label: 'Carpenter',
    cardBg: 'bg-orange-50/45',
    chipBg: 'bg-orange-50',
    chipBorder: 'border-orange-200',
    chipText: 'text-orange-900',
    iconBg: 'bg-orange-100/90 border-orange-200',
    iconText: 'text-orange-700',
    pinBg: 'bg-orange-50',
    pinBorder: 'border-orange-300',
    pinText: 'text-orange-950',
    dotColor: 'bg-orange-500',
  },
  kabadiwala: {
    label: 'Kabadiwala',
    cardBg: 'bg-emerald-50/45',
    chipBg: 'bg-emerald-50',
    chipBorder: 'border-emerald-200',
    chipText: 'text-emerald-900',
    iconBg: 'bg-emerald-100/90 border-emerald-200',
    iconText: 'text-emerald-700',
    pinBg: 'bg-emerald-50',
    pinBorder: 'border-emerald-300',
    pinText: 'text-emerald-950',
    dotColor: 'bg-emerald-500',
  },
};

export const AnimatedTradeIcon: React.FC<{
  trade: WorkerTrade;
  sizeClassName?: string;
}> = ({ trade, sizeClassName = 'w-4 h-4' }) => {
  const shouldReduceMotion = useReducedMotion();
  const style = TRADE_STYLES[trade];

  if (trade === 'plumber') {
    return (
      <motion.span
        animate={shouldReduceMotion ? undefined : { y: [0, -1.5, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        className={`inline-flex items-center justify-center ${style.iconText}`}
      >
        <Droplets className={sizeClassName} />
      </motion.span>
    );
  }

  if (trade === 'electrician') {
    return (
      <motion.span
        animate={shouldReduceMotion ? undefined : { scale: [1, 1.12, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className={`inline-flex items-center justify-center ${style.iconText}`}
      >
        <Zap className={sizeClassName} />
      </motion.span>
    );
  }

  if (trade === 'carpenter') {
    return (
      <motion.span
        animate={shouldReduceMotion ? undefined : { rotate: [0, -10, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        className={`inline-flex items-center justify-center ${style.iconText}`}
      >
        <Hammer className={sizeClassName} />
      </motion.span>
    );
  }

  return (
    <motion.span
      animate={shouldReduceMotion ? undefined : { rotate: [0, 18, 0] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      className={`inline-flex items-center justify-center ${style.iconText}`}
    >
      <Recycle className={sizeClassName} />
    </motion.span>
  );
};

export const ScreenBackdrop: React.FC<{ showWatermark?: boolean }> = ({
  showWatermark = false,
}) => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-0"
    >
      {/* Subtle architectural grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,35,71,0.032)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,35,71,0.032)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_top,black_35%,transparent_90%)]" />
      {/* Soft gradient glows: navy, warm orange, lavender/mint */}
      <div className="absolute -top-24 left-1/4 w-[520px] h-[340px] rounded-full bg-[radial-gradient(circle_at_center,rgba(15,35,71,0.07),transparent_70%)] blur-3xl" />
      <div className="absolute top-24 -right-20 w-[420px] h-[360px] rounded-full bg-[radial-gradient(circle_at_center,rgba(234,88,12,0.08),transparent_70%)] blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[460px] h-[340px] rounded-full bg-[radial-gradient(circle_at_center,rgba(13,148,136,0.07),transparent_70%)] blur-3xl" />
      {showWatermark && (
        <div className="absolute inset-x-0 top-12 flex justify-center">
          <span
            className="text-[20vw] sm:text-[180px] font-extrabold tracking-tighter leading-none text-[#0F2347]/[0.028] select-none"
            style={{ fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif' }}
          >
            Handl
          </span>
        </div>
      )}
    </div>
  );
};

export const PulsingLiveDot: React.FC<{
  colorClass?: string;
  ringClass?: string;
}> = ({ colorClass = 'bg-teal-600', ringClass = 'bg-teal-400' }) => {
  const shouldReduceMotion = useReducedMotion();
  return (
    <span className="relative inline-flex w-2.5 h-2.5 items-center justify-center shrink-0">
      {!shouldReduceMotion && (
        <motion.span
          animate={{ scale: [1, 2.1, 1], opacity: [0.65, 0, 0.65] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          className={`absolute inset-0 rounded-full ${ringClass}`}
        />
      )}
      <span className={`relative w-2 h-2 rounded-full ${colorClass}`} />
    </span>
  );
};

export const GeminiShimmerLoader: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  const ShimmerBar: React.FC<{ className: string }> = ({ className }) => (
    <div
      className={`relative overflow-hidden rounded-lg bg-[#EDEAF8]/80 ${className}`}
    >
      {!shouldReduceMotion && (
        <motion.div
          animate={{ x: ['-100%', '180%'] }}
          transition={{ duration: 1.35, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent"
        />
      )}
    </div>
  );

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
      className="bg-[#F8F6FC]/95 backdrop-blur-xl border border-indigo-200/70 rounded-2xl p-5 sm:p-6 space-y-4 shadow-[0_14px_35px_-20px_rgba(15,35,71,0.18)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <PulsingLiveDot colorClass="bg-[#EA580C]" ringClass="bg-orange-400" />
          <span className="text-xs font-semibold text-[#0F2347]">
            Estimating trade &amp; Kanpur market range...
          </span>
        </div>
        <ShimmerBar className="h-5 w-20" />
      </div>

      <ShimmerBar className="h-8 w-44" />
      <div className="space-y-2">
        <ShimmerBar className="h-3.5 w-full" />
        <ShimmerBar className="h-3.5 w-4/5" />
      </div>
      <div className="pt-2 border-t border-indigo-100">
        <ShimmerBar className="h-3 w-3/5" />
      </div>
    </motion.div>
  );
};

const CONFETTI_PARTICLES = [
  { x: -58, y: -34, color: 'bg-[#EA580C]', delay: 0 },
  { x: -34, y: -48, color: 'bg-teal-500', delay: 0.04 },
  { x: -12, y: -52, color: 'bg-amber-400', delay: 0.02 },
  { x: 14, y: -50, color: 'bg-[#0F2347]', delay: 0.05 },
  { x: 38, y: -44, color: 'bg-teal-500', delay: 0.03 },
  { x: 60, y: -28, color: 'bg-[#EA580C]', delay: 0.06 },
  { x: -48, y: 12, color: 'bg-amber-400', delay: 0.05 },
  { x: 48, y: 14, color: 'bg-sky-500', delay: 0.04 },
];

export const BookingConfirmationBanner: React.FC<{
  workerName: string;
}> = ({ workerName }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
      className="relative overflow-hidden rounded-xl bg-teal-50/95 border border-teal-200 px-4 py-3 flex items-center gap-3"
    >
      {/* Animated checkmark circle + burst confetti */}
      <div className="relative w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
        {!shouldReduceMotion &&
          CONFETTI_PARTICLES.map((p, idx) => (
            <motion.span
              key={idx}
              initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
              animate={{ x: p.x, y: p.y, scale: 1, opacity: 0 }}
              transition={{ duration: 0.9, delay: p.delay, ease: EASE_OUT_EXPO }}
              className={`pointer-events-none absolute w-1.5 h-1.5 rounded-full ${p.color}`}
            />
          ))}

        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 fill-none stroke-current stroke-[2.6]"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <motion.path
            d="M5 13l4 4L19 7"
            initial={shouldReduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, delay: 0.08, ease: EASE_OUT_EXPO }}
          />
        </svg>
      </div>

      <div className="min-w-0">
        <div className="text-xs font-semibold text-teal-950">
          Booking confirmed with {workerName}
        </div>
        <div className="text-[11px] text-teal-800">
          Live GPS tracking and arrival countdown started.
        </div>
      </div>
    </motion.div>
  );
};
