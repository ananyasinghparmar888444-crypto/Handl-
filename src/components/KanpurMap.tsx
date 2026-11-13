/// <reference types="google.maps" />
import React, { useEffect, useRef } from 'react';
import {
  AdvancedMarker,
  APIProvider,
  APILoadingStatus,
  Map as GoogleMap,
  useApiLoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps';
import { motion, useReducedMotion } from 'motion/react';
import { Home, Navigation } from 'lucide-react';
import { HouseholdLocation, WorkerProfile, WorkerTrade } from '../types';
import { KANPUR_CENTER, TRADE_LABELS } from '../data/kanpurWorkers';
import {
  AnimatedTradeIcon,
  PulsingLiveDot,
  TRADE_STYLES,
} from './TradeVisuals';

interface KanpurMapProps {
  apiKey: string;
  workers: WorkerProfile[];
  highlightedTrade: WorkerTrade | 'all';
  selectedWorkerId: string | null;
  onSelectWorker?: (workerId: string) => void;
  householdLocation: HouseholdLocation;
  activeBookedWorker?: WorkerProfile | null;
  movingWorkerPos?: { lat: number; lng: number } | null;
  etaSecondsLeft?: number | null;
  heightClassName?: string;
}

const RoutePolyline: React.FC<{
  path: google.maps.LatLngLiteral[];
}> = ({ path }) => {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || path.length < 2) {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      return;
    }

    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#0F2347',
        strokeOpacity: 0.85,
        strokeWeight: 4,
      });
      polylineRef.current.setMap(map);
    } else {
      polylineRef.current.setPath(path);
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, path]);

  return null;
};

const CameraBoundsManager: React.FC<{
  householdLocation: HouseholdLocation;
  activeBookedWorker?: WorkerProfile | null;
  movingWorkerPos?: { lat: number; lng: number } | null;
}> = ({ householdLocation, activeBookedWorker, movingWorkerPos }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (activeBookedWorker && movingWorkerPos) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: householdLocation.lat, lng: householdLocation.lng });
      bounds.extend({ lat: movingWorkerPos.lat, lng: movingWorkerPos.lng });
      map.fitBounds(bounds, { top: 56, bottom: 56, left: 48, right: 48 });
    }
  }, [map, activeBookedWorker?.id, householdLocation.lat, householdLocation.lng]);

  return null;
};

const MapLoadingGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const status = useApiLoadingStatus();

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#F6F5FC] border border-slate-200 rounded-2xl p-6 text-center">
        <p className="text-sm font-medium text-slate-800">
          Map tiles could not load
        </p>
        <p className="mt-1 text-xs text-slate-500 max-w-xs">
          Check your Google Maps API key or quota settings. Worker cards remain interactive below.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

function formatShortEta(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const KanpurMap: React.FC<KanpurMapProps> = ({
  apiKey,
  workers,
  highlightedTrade,
  selectedWorkerId,
  onSelectWorker,
  householdLocation,
  activeBookedWorker,
  movingWorkerPos,
  etaSecondsLeft,
  heightClassName = 'h-[310px] sm:h-[360px] lg:h-[540px]',
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (!apiKey) {
    return (
      <div
        className={`${heightClassName} w-full rounded-2xl border border-white/90 bg-white/80 backdrop-blur-xl shadow-[0_18px_45px_-22px_rgba(15,35,71,0.18)] flex flex-col items-center justify-center p-6 text-center`}
      >
        <p className="text-sm font-medium text-slate-700">
          Initializing Kanpur Map...
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Connecting to Google Maps Platform
        </p>
      </div>
    );
  }

  const isTracking = Boolean(activeBookedWorker && movingWorkerPos);

  return (
    <div
      className={`${heightClassName} w-full rounded-2xl border border-white/95 overflow-hidden bg-slate-100 relative shadow-[0_20px_48px_-22px_rgba(15,35,71,0.22)]`}
    >
      <APIProvider
        apiKey={apiKey}
        libraries={['marker']}
        language="en"
        region="IN"
      >
        <MapLoadingGuard>
          <GoogleMap
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            defaultCenter={KANPUR_CENTER}
            defaultZoom={12.4}
            gestureHandling="greedy"
            disableDefaultUI={true}
            zoomControl={true}
            className="w-full h-full"
          >
            <CameraBoundsManager
              householdLocation={householdLocation}
              activeBookedWorker={activeBookedWorker}
              movingWorkerPos={movingWorkerPos}
            />

            {/* Household Pin */}
            <AdvancedMarker
              position={{ lat: householdLocation.lat, lng: householdLocation.lng }}
              title={`House: ${householdLocation.label}`}
              zIndex={40}
            >
              <div className="flex flex-col items-center">
                <div className="px-2.5 py-1 rounded-lg bg-[#0F2347] text-white text-[11px] font-semibold shadow-md border border-white flex items-center gap-1.5 whitespace-nowrap">
                  <Home className="w-3 h-3 text-orange-400" />
                  <span>{householdLocation.label}</span>
                </div>
                <div className="w-2.5 h-2.5 bg-[#0F2347] rotate-45 -mt-1.5 border-r border-b border-white" />
              </div>
            </AdvancedMarker>

            {/* All 12 Kanpur workers with soft color per worker type */}
            {!isTracking &&
              workers.map((worker) => {
                const isSelected = worker.id === selectedWorkerId;
                const isHighlighted =
                  highlightedTrade === 'all' || worker.trade === highlightedTrade;
                const tradeStyle = TRADE_STYLES[worker.trade];

                return (
                  <AdvancedMarker
                    key={worker.id}
                    position={{ lat: worker.lat, lng: worker.lng }}
                    title={`${worker.name} · ${TRADE_LABELS[worker.trade]} (${worker.neighborhood})`}
                    zIndex={isSelected ? 50 : isHighlighted ? 25 : 10}
                    onClick={() => onSelectWorker?.(worker.id)}
                  >
                    <motion.button
                      type="button"
                      whileHover={shouldReduceMotion ? undefined : { scale: 1.07 }}
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                      onClick={() => onSelectWorker?.(worker.id)}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all shadow-sm whitespace-nowrap tabular-nums flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#0F2347] text-white border-[#EA580C] scale-110 ring-2 ring-[#EA580C]/35'
                          : isHighlighted
                          ? `${tradeStyle.pinBg} ${tradeStyle.pinText} ${tradeStyle.pinBorder} hover:border-[#0F2347]`
                          : 'bg-white/80 text-slate-400 border-slate-200'
                      }`}
                    >
                      {!isSelected && isHighlighted && (
                        <AnimatedTradeIcon
                          trade={worker.trade}
                          sizeClassName="w-3 h-3"
                        />
                      )}
                      <span>
                        {worker.trade === 'kabadiwala'
                          ? `${worker.initials} · Free`
                          : `${worker.initials} · ₹${worker.priceInr}`}
                      </span>
                    </motion.button>
                  </AdvancedMarker>
                );
              })}

            {/* Live moving worker pin + pulsing dot + route polyline after booking */}
            {isTracking && activeBookedWorker && movingWorkerPos && (
              <>
                <RoutePolyline
                  path={[
                    movingWorkerPos,
                    { lat: householdLocation.lat, lng: householdLocation.lng },
                  ]}
                />
                <AdvancedMarker
                  position={movingWorkerPos}
                  title={`${activeBookedWorker.name} en route`}
                  zIndex={60}
                >
                  <motion.div
                    initial={shouldReduceMotion ? false : { scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col items-center relative"
                  >
                    {!shouldReduceMotion && (
                      <motion.div
                        animate={{ scale: [1, 1.35, 1], opacity: [0.35, 0, 0.35] }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                        className="absolute -inset-1.5 rounded-xl bg-teal-400/35 pointer-events-none"
                      />
                    )}
                    <div className="relative px-2.5 py-1.5 rounded-xl bg-white text-[#0F2347] border-2 border-teal-600 shadow-lg text-[11px] font-semibold flex items-center gap-1.5 whitespace-nowrap tabular-nums">
                      <PulsingLiveDot />
                      <Navigation className="w-3 h-3 fill-teal-600 text-teal-600" />
                      <span>{activeBookedWorker.name.split(' ')[0]}</span>
                      {typeof etaSecondsLeft === 'number' && etaSecondsLeft > 0 && (
                        <span className="text-[#C2410C] font-semibold">
                          · {formatShortEta(etaSecondsLeft)}
                        </span>
                      )}
                    </div>
                  </motion.div>
                </AdvancedMarker>
              </>
            )}
          </GoogleMap>
        </MapLoadingGuard>
      </APIProvider>
    </div>
  );
};
