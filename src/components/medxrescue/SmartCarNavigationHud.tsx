"use client";

import { useEffect, useRef, useState } from 'react';
import type { LiveVehicleItem, LiveIncidentItem, LiveFacilityItem } from '@/services/medxrescue.service';
import { Ambulance, Navigation, Siren, ShieldCheck, HeartPulse, Activity, Zap, Play, Pause, RotateCcw, Volume2, Gauge, MapPin, Building2, Phone, Compass } from 'lucide-react';

interface SmartCarNavigationHudProps {
  vehicles?: LiveVehicleItem[];
  incidents?: LiveIncidentItem[];
  facilities?: LiveFacilityItem[];
  selectedVehicleId?: string;
  selectedIncidentId?: string;
  className?: string;
  heightClass?: string;
}

export default function SmartCarNavigationHud({
  vehicles = [],
  incidents = [],
  facilities = [],
  selectedVehicleId,
  selectedIncidentId,
  className = '',
  heightClass = 'h-[680px]',
}: SmartCarNavigationHudProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);

  const [isClient, setIsClient] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Navigation Telemetry State
  const [speed, setSpeed] = useState(62); // km/h
  const [etaMinutes, setEtaMinutes] = useState(7);
  const [distanceKm, setDistanceKm] = useState(3.4);
  const [progressPercent, setProgressPercent] = useState(35);
  const [isDriving, setIsDriving] = useState(true);
  const [nextTurnInstruction, setNextTurnInstruction] = useState('Turn Right in 250m onto Independence Way');
  const [sirenActive, setSirenActive] = useState(true);

  // Selected or active vehicle & target
  const activeVehicle = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0] || {
    id: 'demo-amb-1',
    registrationNumber: 'AMB-001-LX',
    makeModel: 'Mercedes-Benz Sprinter ALS',
    vehicleClass: 'ADVANCED_LIFE_SUPPORT',
    status: 'EN_ROUTE',
    location: { type: 'Point', coordinates: [3.3792, 6.5244] },
    provider: { id: 'p1', displayName: 'MedXRescue Core Fleet' }
  };

  const activeIncident = incidents.find(i => i.id === selectedIncidentId) || incidents[0] || {
    id: 'demo-inc-1',
    reference: 'MRX-SOS-9921',
    priority: 'CRITICAL',
    chiefComplaint: 'Acute Chest Pain & Severe Difficulty Breathing',
    landmark: 'Ikeja City Mall, Alausa, Ikeja',
    location: { type: 'Point', coordinates: [3.3515, 6.6018] }
  };

  const activeFacility = facilities[0] || {
    id: 'demo-fac-1',
    name: 'Lagos State University Teaching Hospital (LASUTH)',
    facilityType: 'Tertiary Trauma Center',
    location: { type: 'Point', coordinates: [3.3450, 6.5910] }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Simulation loop for smart car speedometer and driving progress
  useEffect(() => {
    if (!isDriving) return;

    const interval = setInterval(() => {
      setSpeed(prev => Math.min(85, Math.max(35, prev + (Math.random() * 8 - 4))));
      setProgressPercent(prev => {
        if (prev >= 98) return 10;
        const next = prev + 0.8;
        const remainingKm = Math.max(0.2, (3.4 * (100 - next)) / 100);
        setDistanceKm(Math.round(remainingKm * 10) / 10);
        setEtaMinutes(Math.max(1, Math.round((remainingKm / 50) * 60)));
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isDriving]);

  // Leaflet Map Initialization with Crisp Light/White Voyager Street Tiles
  useEffect(() => {
    if (!isClient || !mapContainerRef.current) return;
    let mounted = true;

    async function initMap() {
      const L = (await import('leaflet')).default;
      if (!document.getElementById('leaflet-css-link')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css-link';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!mounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY || 'cb1_4vt5_1_bde6b70c331dc3f46a42ea0b';
        const map = L.map(mapContainerRef.current, {
          center: [6.5244, 3.3792],
          zoom: 15,
          maxZoom: 20,
          zoomControl: false,
          attributionControl: false,
        });

        // Crisp White CARTO Voyager High-DPI Tiles
        L.tileLayer(`https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png?key=${cartoKey}`, {
          maxZoom: 20,
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        }).addTo(map);

        const layerGroup = L.layerGroup().addTo(map);
        layerGroupRef.current = layerGroup;
        mapInstanceRef.current = map;
        setLeafletLoaded(true);
      }
    }

    void initMap();
    return () => { mounted = false; };
  }, [isClient]);

  // Render Smart Car Animated Route and Icons
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current || !layerGroupRef.current) return;
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    const L = (window as any).L;
    if (!L) return;

    // Origin (Hospital), Ambulance Current interpolated pos, and Destination (Emergency)
    const hospCoords: [number, number] = activeFacility.location?.coordinates
      ? [activeFacility.location.coordinates[1], activeFacility.location.coordinates[0]]
      : [6.5910, 3.3450];

    const emgCoords: [number, number] = activeIncident.location?.coordinates
      ? [activeIncident.location.coordinates[1], activeIncident.location.coordinates[0]]
      : [6.6018, 3.3515];

    // Interpolated Ambulance Position based on progressPercent
    const currentLat = hospCoords[0] + (emgCoords[0] - hospCoords[0]) * (progressPercent / 100);
    const currentLng = hospCoords[1] + (emgCoords[1] - hospCoords[1]) * (progressPercent / 100);

    // 1. Draw Destination Emergency SOS Target Marker
    const emgHtml = `
      <div class="relative flex flex-col items-center">
        <div class="absolute -inset-3 rounded-full bg-rose-500/30 animate-ping"></div>
        <div class="flex items-center gap-1.5 rounded-2xl border-2 border-rose-500 bg-white px-3 py-1.5 text-slate-900 shadow-2xl backdrop-blur-md">
          <span class="text-sm">🚨</span>
          <div class="flex flex-col text-left">
            <span class="text-[10px] font-black uppercase text-rose-600">EMERGENCY DESTINATION</span>
            <span class="text-xs font-black text-slate-900">${activeIncident.reference || 'SOS PIN'}</span>
          </div>
        </div>
        <div class="w-0.5 h-3 bg-rose-500"></div>
        <div class="w-2 h-2 rounded-full bg-rose-500"></div>
      </div>
    `;
    const emgIcon = L.divIcon({ html: emgHtml, className: 'hud-emg-marker', iconSize: [160, 50], iconAnchor: [80, 50] });
    L.marker(emgCoords, { icon: emgIcon }).addTo(layerGroup);

    // 2. Draw Origin Hospital Marker
    const hospHtml = `
      <div class="flex items-center gap-1.5 rounded-2xl border-2 border-[#1b7b68] bg-white px-3 py-1.5 text-slate-900 shadow-xl backdrop-blur-md">
        <span class="text-sm">🏥</span>
        <div class="flex flex-col text-left">
          <span class="text-[9px] font-bold uppercase text-[#1b7b68]">DISPATCH BASE</span>
          <span class="text-[11px] font-extrabold whitespace-nowrap text-slate-900">${activeFacility.name.split(' ')[0]}</span>
        </div>
      </div>
    `;
    const hospIcon = L.divIcon({ html: hospHtml, className: 'hud-hosp-marker', iconSize: [140, 40], iconAnchor: [70, 20] });
    L.marker(hospCoords, { icon: hospIcon }).addTo(layerGroup);

    // 3. Draw Smart-Car Route Polyline (MedXVerse Teal Glow)
    L.polyline([hospCoords, emgCoords], {
      color: '#1b7b68',
      weight: 6,
      opacity: 0.5,
    }).addTo(layerGroup);

    // Remaining Active Route (Glow Teal / Neon Red)
    L.polyline([[currentLat, currentLng], emgCoords], {
      color: sirenActive ? '#f43f5e' : '#1b7b68',
      weight: 7,
      dashArray: '10, 14',
      opacity: 0.95,
      lineCap: 'round',
    }).addTo(layerGroup);

    // 4. Draw Animated Smart Ambulance Car Icon
    const carHtml = `
      <div class="relative flex flex-col items-center">
        <div class="relative flex items-center gap-2 rounded-2xl border-2 ${sirenActive ? 'border-rose-500 bg-white ring-4 ring-rose-500/30' : 'border-teal-500 bg-white ring-4 ring-teal-500/30'} px-3.5 py-2 shadow-2xl text-slate-900">
          <span class="text-lg ${sirenActive ? 'animate-bounce' : ''}">🚑</span>
          <div class="flex flex-col text-left">
            <div class="flex items-center gap-1">
              <span class="text-xs font-black uppercase text-slate-900">${activeVehicle.registrationNumber || 'AMB-UNIT'}</span>
              <span class="rounded bg-rose-600 px-1 text-[8px] font-extrabold text-white">LIVE</span>
            </div>
            <span class="text-[10px] font-extrabold text-[#1b7b68]">${Math.round(speed)} km/h</span>
          </div>
        </div>
      </div>
    `;
    const carIcon = L.divIcon({ html: carHtml, className: 'hud-car-marker', iconSize: [150, 55], iconAnchor: [75, 27] });
    L.marker([currentLat, currentLng], { icon: carIcon }).addTo(layerGroup);

    // Center map smoothly on moving ambulance
    map.panTo([currentLat, currentLng], { animate: true, duration: 0.8 });

  }, [leafletLoaded, progressPercent, speed, sirenActive, activeVehicle, activeIncident, activeFacility]);

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-slate-200 bg-[#f5faf9] font-sans shadow-xl text-slate-900 ${className}`}>

      {/* Smart Car Top HUD Navigation Header */}
      <div className="absolute left-4 top-4 right-4 z-[1000] flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3.5 backdrop-blur-xl shadow-xl">

        {/* Next Maneuver / Turn Banner */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1b7b68] text-white shadow-md">
            <Navigation size={26} className="rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#1b7b68]">SMART NAVIGATION</span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black text-rose-700 border border-rose-200">
                {sirenActive ? 'SIREN ACTIVE' : 'STANDARD DRIVE'}
              </span>
            </div>
            <p className="mt-0.5 text-sm sm:text-base font-black text-slate-900 leading-tight">
              {nextTurnInstruction}
            </p>
          </div>
        </div>

        {/* Speedometer & ETA Display */}
        <div className="flex items-center gap-4 border-l border-slate-200 pl-4">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">ESTIMATED ARRIVAL</p>
            <p className="text-xl font-black text-emerald-700 tabular-nums">{etaMinutes} min <span className="text-xs font-normal text-slate-600">({distanceKm} km)</span></p>
          </div>

          <div className="flex h-12 w-16 flex-col items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 p-1">
            <span className="text-lg font-black text-[#1b7b68] leading-none">{Math.round(speed)}</span>
            <span className="text-[8px] font-extrabold text-[#1b7b68]">KM/H</span>
          </div>
        </div>
      </div>

      {/* Side HUD Telemetry Drawer */}
      <div className="absolute right-4 top-24 z-[1000] hidden sm:flex w-72 flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#1b7b68] flex items-center gap-1">
            <Activity size={12} /> VEHICLE TELEMETRY
          </span>
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Unit ID:</span>
            <span className="font-extrabold text-slate-900">{activeVehicle.registrationNumber || 'AMB-001'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Vehicle Class:</span>
            <span className="font-bold text-[#1b7b68]">{activeVehicle.vehicleClass?.replace(/_/g, ' ') || 'ALS Ambulance'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Emergency Case:</span>
            <span className="font-extrabold text-rose-600">{activeIncident.reference}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Emergency Type:</span>
            <span className="font-semibold text-slate-800 truncate max-w-[140px]">{activeIncident.chiefComplaint}</span>
          </div>
        </div>

        {/* Live Mission Progress Bar */}
        <div className="mt-2 border-t border-slate-100 pt-2">
          <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase">
            <span>Hospital Base</span>
            <span className="text-[#1b7b68]">{Math.round(progressPercent)}% Completed</span>
            <span>Emergency Scene</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1b7b68] to-rose-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Cockpit Actions */}
        <div className="mt-2 grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setSirenActive(!sirenActive)}
            className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${sirenActive ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
          >
            <Siren size={14} /> {sirenActive ? 'Siren ON' : 'Siren OFF'}
          </button>

          <button
            type="button"
            onClick={() => setIsDriving(!isDriving)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-[#1b7b68] hover:bg-teal-100 transition"
          >
            {isDriving ? <Pause size={14} /> : <Play size={14} />} {isDriving ? 'Pause' : 'Drive'}
          </button>
        </div>
      </div>

      {/* Map Display Container */}
      <div ref={mapContainerRef} className={`w-full ${heightClass}`} />

      {/* Bottom Smart Car Navigation Control Dock */}
      <div className="absolute bottom-4 left-4 right-4 z-[1000] flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1b7b68] text-white">
            <Gauge size={18} />
          </span>
          <div>
            <p className="text-xs font-extrabold text-slate-900">MedXVerse Smart Car Navigation</p>
            <p className="text-[10px] text-slate-500">Bright White High-Contrast Cockpit Stream</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setProgressPercent(5)}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            <RotateCcw size={13} /> Reset Trip
          </button>
        </div>
      </div>
    </div>
  );
}
