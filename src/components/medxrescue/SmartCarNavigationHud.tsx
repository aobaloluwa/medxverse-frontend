"use client";

import { useEffect, useRef, useState } from 'react';
import type { LiveVehicleItem, LiveIncidentItem, LiveFacilityItem } from '@/services/medxrescue.service';
import {
  CornerUpLeft, Crosshair, Shield, SlidersHorizontal, List, Siren, Play, Pause,
  RotateCcw, Search, Loader2, Navigation, Layers, Eye, ZoomIn, Maximize2, Building2, MapPin, Activity
} from 'lucide-react';

interface SmartCarNavigationHudProps {
  vehicles?: LiveVehicleItem[];
  incidents?: LiveIncidentItem[];
  facilities?: LiveFacilityItem[];
  selectedVehicleId?: string;
  selectedIncidentId?: string;
  className?: string;
  heightClass?: string;
}

const CITIES = [
  { name: 'Lagos (Central)', lat: 6.5244, lng: 3.3792 },
  { name: 'Lagos (Victoria Island)', lat: 6.4281, lng: 3.4219 },
  { name: 'Lagos (Lekki Phase 1)', lat: 6.4474, lng: 3.4723 },
  { name: 'Lagos (Ikeja)', lat: 6.6018, lng: 3.3515 },
  { name: 'Abuja (FCT)', lat: 9.0765, lng: 7.3986 },
  { name: 'Port Harcourt', lat: 4.8156, lng: 7.0498 },
  { name: 'Kano', lat: 12.0022, lng: 8.5920 },
  { name: 'Ibadan', lat: 7.3775, lng: 3.9470 },
  { name: 'Enugu', lat: 6.4584, lng: 7.5464 },
  { name: 'Benin City', lat: 6.3350, lng: 5.6037 },
  { name: 'Kaduna', lat: 10.5105, lng: 7.4165 },
  { name: 'Calabar', lat: 4.9757, lng: 8.3417 },
  { name: 'Asaba', lat: 6.1983, lng: 6.7275 },
];

export default function SmartCarNavigationHud({
  vehicles = [],
  incidents = [],
  facilities = [],
  selectedVehicleId,
  selectedIncidentId,
  className = '',
  heightClass = 'h-[720px]',
}: SmartCarNavigationHudProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const overlayGroupRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  // Persistent Marker References
  const ambMarkerRef = useRef<any>(null);

  const [isClient, setIsClient] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Map Tile & Navigation Telemetry State
  const [mapType, setMapType] = useState<'STREET' | 'AERIAL' | 'DARK'>('STREET');
  const [speed, setSpeed] = useState(62); // km/h
  const [etaMinutes, setEtaMinutes] = useState(7);
  const [distanceKm, setDistanceKm] = useState(3.4);
  const [progressPercent, setProgressPercent] = useState(35);
  const [isDriving, setIsDriving] = useState(true);
  const [nextTurnStreet, setNextTurnStreet] = useState('E Veterans Way');
  const [nextTurnDistance, setNextTurnDistance] = useState('250 m');
  const [sirenActive, setSirenActive] = useState(true);

  // Search & Geolocation State
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  const hasInitialCenterRef = useRef<boolean>(false);

  // Selected or active vehicle & target
  const activeVehicle = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0] || {
    id: 'demo-amb-1',
    registrationNumber: 'AMB-001-LX',
    makeModel: 'Mercedes-Benz Sprinter ALS',
    vehicleClass: 'ADVANCED_LIFE_SUPPORT',
    status: 'EN_ROUTE',
    location: { type: 'Point', coordinates: [3.3792, 6.5244] },
  };

  const activeIncident = incidents.find(i => i.id === selectedIncidentId) || incidents[0] || {
    id: 'demo-inc-1',
    reference: 'MRX-SOS-9921',
    priority: 'CRITICAL',
    chiefComplaint: 'Acute Chest Pain & Breathing Difficulty',
    landmark: 'Ikeja City Mall, Alausa, Ikeja',
    location: { type: 'Point', coordinates: [3.3515, 6.6018] }
  };

  const activeFacility = facilities[0] || {
    id: 'demo-fac-1',
    name: 'LASUTH Emergency Trauma Base',
    location: { type: 'Point', coordinates: [3.3450, 6.5910] }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Driving Simulation Loop
  useEffect(() => {
    if (!isDriving) return;

    const interval = setInterval(() => {
      setSpeed(prev => Math.min(85, Math.max(40, Math.round(prev + (Math.random() * 6 - 3)))));
      setProgressPercent(prev => {
        if (prev >= 98) return 10;
        const next = prev + 0.5;
        const remainingKm = Math.max(0.2, (3.4 * (100 - next)) / 100);
        setDistanceKm(Math.round(remainingKm * 10) / 10);
        setEtaMinutes(Math.max(1, Math.round((remainingKm / 50) * 60)));
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isDriving]);

  // Leaflet Map Initialization
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
          zoom: 16,
          maxZoom: 20,
          zoomControl: false,
          attributionControl: false,
        });

        const tileUrls = {
          STREET: `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png?key=${cartoKey}`,
          AERIAL: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          DARK: `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png?key=${cartoKey}`,
        };

        const tileLayer = L.tileLayer(tileUrls.STREET, {
          maxZoom: 20,
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        }).addTo(map);

        tileLayerRef.current = tileLayer;

        const overlayGroup = L.layerGroup().addTo(map);
        overlayGroupRef.current = overlayGroup;

        // Street Name Overlays for Satellite Mode
        const streetLabelsLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 20,
          opacity: 0.9,
        });
        const placeLabelsLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 20,
          opacity: 0.9,
        });
        streetLabelsLayer.addTo(overlayGroup);
        placeLabelsLayer.addTo(overlayGroup);

        const layerGroup = L.layerGroup().addTo(map);
        layerGroupRef.current = layerGroup;
        mapInstanceRef.current = map;
        setLeafletLoaded(true);
      }
    }

    void initMap();
    return () => { mounted = false; };
  }, [isClient]);

  // Switch Tile Layer when mapType changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY || 'cb1_4vt5_1_bde6b70c331dc3f46a42ea0b';

    const tileUrls = {
      STREET: `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png?key=${cartoKey}`,
      AERIAL: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      DARK: `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png?key=${cartoKey}`,
    };

    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    const newLayer = L.tileLayer(tileUrls[mapType], {
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap &copy; CARTO &copy; Esri',
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;

    if (overlayGroupRef.current) {
      if (mapType === 'AERIAL') {
        overlayGroupRef.current.addTo(mapInstanceRef.current);
      } else {
        mapInstanceRef.current.removeLayer(overlayGroupRef.current);
      }
    }
  }, [mapType]);

  // Initial Route & Static Markers Setup
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current || !layerGroupRef.current) return;
    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    const L = (window as any).L;
    if (!L) return;

    const hospCoords: [number, number] = activeFacility.location?.coordinates
      ? [activeFacility.location.coordinates[1], activeFacility.location.coordinates[0]]
      : [6.5910, 3.3450];

    const emgCoords: [number, number] = activeIncident.location?.coordinates
      ? [activeIncident.location.coordinates[1], activeIncident.location.coordinates[0]]
      : [6.6018, 3.3515];

    const midLat = hospCoords[0] + (emgCoords[0] - hospCoords[0]) * 0.5;
    const midLng = hospCoords[1] + (emgCoords[1] - hospCoords[1]) * 0.5;

    // 1. Static Route Outer Black Casing
    L.polyline([hospCoords, [midLat, midLng], emgCoords], {
      color: '#111827',
      weight: 12,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(layerGroup);

    // 2. Traffic Segments
    L.polyline([hospCoords, [midLat, midLng]], {
      color: '#ef4444',
      weight: 7,
      opacity: 1,
      lineCap: 'round',
    }).addTo(layerGroup);

    L.polyline([[midLat, midLng], emgCoords], {
      color: '#f59e0b',
      weight: 7,
      opacity: 1,
      lineCap: 'round',
    }).addTo(layerGroup);

    // 3. Green Destination Stop Pin
    const destHtml = `
      <div class="flex flex-col items-center">
        <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-2xl border-2 border-white">
          <div class="h-3 w-3 rounded-sm bg-white"></div>
        </div>
        <div class="h-2 w-1 bg-emerald-600"></div>
      </div>
    `;
    const destIcon = L.divIcon({ html: destHtml, className: 'uber-dest-pin', iconSize: [32, 40], iconAnchor: [16, 40] });
    L.marker(emgCoords, { icon: destIcon }).addTo(layerGroup);

    // 4. Initial Ambulance Marker Creation
    const ambHtml = `
      <div class="relative flex flex-col items-center group cursor-pointer transition-all duration-700">
        <div class="absolute -inset-2 rounded-full border-2 border-rose-500 bg-rose-500/20 ${sirenActive ? 'animate-ping' : ''}"></div>
        <div class="relative flex items-center gap-2 rounded-2xl border-2 border-[#1b7b68] bg-white px-3.5 py-1.5 shadow-2xl text-slate-900">
          <span class="flex h-7 w-7 items-center justify-center rounded-xl bg-[#1b7b68] text-white text-base shadow-md ${sirenActive ? 'animate-bounce' : ''}">🚑</span>
          <div class="flex flex-col text-left">
            <div class="flex items-center gap-1">
              <span class="text-xs font-black uppercase text-slate-900">${activeVehicle.registrationNumber || 'AMB-001'}</span>
              <span class="rounded bg-rose-600 px-1 text-[8px] font-extrabold text-white">LIVE</span>
            </div>
            <span class="text-[10px] font-extrabold text-[#1b7b68]">${Math.round(speed)} km/h</span>
          </div>
        </div>
        <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#1b7b68] shadow-md"></div>
      </div>
    `;
    const ambIcon = L.divIcon({ html: ambHtml, className: 'uber-amb-marker', iconSize: [150, 55], iconAnchor: [75, 52] });
    const ambMarker = L.marker(hospCoords, { icon: ambIcon }).addTo(layerGroup);
    ambMarkerRef.current = ambMarker;

    // Initial center on route mid-point ONCE ONLY
    if (mapInstanceRef.current && !hasInitialCenterRef.current) {
      mapInstanceRef.current.setView([midLat, midLng], 16);
      hasInitialCenterRef.current = true;
    }

  }, [leafletLoaded, activeFacility, activeIncident]);

  // Smooth Position Updates (Updates LatLng WITHOUT clearing layers or jumping the map!)
  useEffect(() => {
    if (!ambMarkerRef.current) return;

    const hospCoords: [number, number] = activeFacility.location?.coordinates
      ? [activeFacility.location.coordinates[1], activeFacility.location.coordinates[0]]
      : [6.5910, 3.3450];

    const emgCoords: [number, number] = activeIncident.location?.coordinates
      ? [activeIncident.location.coordinates[1], activeIncident.location.coordinates[0]]
      : [6.6018, 3.3515];

    const currentLat = hospCoords[0] + (emgCoords[0] - hospCoords[0]) * (progressPercent / 100);
    const currentLng = hospCoords[1] + (emgCoords[1] - hospCoords[1]) * (progressPercent / 100);

    // Smooth LatLng Glide (No map jumps!)
    ambMarkerRef.current.setLatLng([currentLat, currentLng]);

  }, [progressPercent, activeFacility, activeIncident]);

  // Fly to User GPS Location
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationStatus('GPS is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationStatus('Locating your street position…');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;
        const map = mapInstanceRef.current;
        const L = (window as any).L;

        if (map && L) {
          map.flyTo([latitude, longitude], 17, { duration: 1.5 });

          if (userMarkerRef.current) {
            map.removeLayer(userMarkerRef.current);
          }

          const userHtml = `
            <div class="relative flex items-center justify-center">
              <div class="absolute -inset-4 rounded-full bg-teal-500/40 animate-ping"></div>
              <div class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#1b7b68] text-white shadow-2xl font-black text-xs">
                📍
              </div>
            </div>
          `;
          const icon = L.divIcon({ html: userHtml, className: 'user-gps-marker', iconSize: [36, 36], iconAnchor: [18, 18] });
          const marker = L.marker([latitude, longitude], { icon }).addTo(map);
          marker.bindPopup('<b>Your Current Location</b>').openPopup();
          userMarkerRef.current = marker;

          setLocationStatus('Centered on your street location.');
          setTimeout(() => setLocationStatus(''), 4000);
        }
      },
      (err) => {
        setIsLocating(false);
        setLocationStatus('Could not retrieve GPS location.');
        setTimeout(() => setLocationStatus(''), 5000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Center Map on Moving Ambulance
  const handleCenterAmbulance = () => {
    if (mapInstanceRef.current && ambMarkerRef.current) {
      const pos = ambMarkerRef.current.getLatLng();
      mapInstanceRef.current.flyTo([pos.lat, pos.lng], 17, { duration: 1 });
      setLocationStatus('Centered on Ambulance Unit');
      setTimeout(() => setLocationStatus(''), 3000);
    }
  };

  // Fly to selected city
  const handleCitySelect = (lat: number, lng: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.5 });
      setLocationStatus('Shifted to selected city.');
      setTimeout(() => setLocationStatus(''), 3000);
    }
  };

  // Geocode Search
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setLocationStatus('Searching street address…');

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}&limit=1`);
      const data = await res.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lon], 17, { duration: 1.5 });
          setLocationStatus(`Found: ${data[0].display_name.split(',')[0]}`);
          setTimeout(() => setLocationStatus(''), 4000);
        }
      } else {
        setLocationStatus('Street location not found.');
        setTimeout(() => setLocationStatus(''), 4000);
      }
    } catch (err) {
      setLocationStatus('Search failed.');
      setTimeout(() => setLocationStatus(''), 4000);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className={`relative isolate z-0 overflow-hidden rounded-3xl border border-slate-300 bg-[#f3f4f6] font-sans shadow-2xl text-slate-900 ${className}`}>

      {/* 1. TOP-LEFT: Emergency Dispatch Navigation HUD Card (z-[2000] above Leaflet z-400..1000) */}
      <div className="absolute left-4 top-4 z-[2000] max-w-sm sm:max-w-md w-full rounded-2xl border border-slate-200 bg-white/95 p-4 text-slate-900 shadow-2xl backdrop-blur-xl space-y-3">
        {/* Mission Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1b7b68] text-white text-xs font-black shadow-sm">
              🚑
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-900">
              EMERGENCY NAVIGATION HUD
            </span>
          </div>
          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black text-rose-700 border border-rose-200 animate-pulse">
            {sirenActive ? 'SIREN ACTIVE' : 'STANDARD DRIVE'}
          </span>
        </div>

        {/* Turn Maneuver Header */}
        <div className="flex items-center gap-3 rounded-xl bg-black p-3 text-white shadow-md">
          <CornerUpLeft size={26} className="text-white shrink-0 stroke-[2.5]" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">NEXT MANEUVER ({nextTurnDistance})</p>
            <p className="text-sm sm:text-base font-black truncate">{nextTurnStreet}</p>
          </div>
        </div>

        {/* Origin Hospital ➔ Destination Patient SOS Route Details */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 rounded-lg bg-teal-50/80 p-2 border border-teal-100">
            <Building2 size={16} className="text-[#1b7b68] shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-black uppercase text-[#1b7b68]">FROM DISPATCH BASE</span>
              <p className="font-extrabold text-slate-900 truncate">{activeFacility.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-rose-50/80 p-2 border border-rose-100">
            <MapPin size={16} className="text-rose-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-black uppercase text-rose-600">TO PATIENT SCENE ({activeIncident.reference})</span>
              <p className="font-extrabold text-slate-900 truncate">{activeIncident.landmark || activeIncident.chiefComplaint}</p>
            </div>
          </div>
        </div>

        {/* Assumed Distance & Time of Reach Summary */}
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5">
          <div className="rounded-xl bg-slate-50 p-2.5 text-center border border-slate-200">
            <span className="text-[9px] font-black uppercase text-slate-500">ESTIMATED REACH TIME</span>
            <p className="text-lg font-black text-emerald-700 tabular-nums">{etaMinutes} MINS</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-2.5 text-center border border-slate-200">
            <span className="text-[9px] font-black uppercase text-slate-500">ROUTE DISTANCE</span>
            <p className="text-lg font-black text-[#1b7b68] tabular-nums">{distanceKm} KM</p>
          </div>
        </div>

        {/* Patient Condition Briefing */}
        <div className="rounded-xl bg-slate-100 p-2.5 text-xs border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-slate-500">TRIAGE ALERT</span>
            <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white">{activeIncident.priority}</span>
          </div>
          <p className="mt-1 font-bold text-slate-800 line-clamp-1">{activeIncident.chiefComplaint}</p>
        </div>
      </div>

      {/* 2. TOP-RIGHT: Navigation Toolbar (z-[2000] above Leaflet z-400..1000) */}
      <div className="absolute right-4 top-4 z-[2000] flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 text-slate-800 shadow-2xl backdrop-blur-md max-w-[90%] sm:max-w-md">

        {/* Center Vehicle Button */}
        <button
          type="button"
          onClick={handleCenterAmbulance}
          className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-[#1b7b68] hover:bg-teal-100 transition"
        >
          <Crosshair size={14} className="text-[#1b7b68]" /> Center Unit
        </button>

        {/* Locate GPS Button */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
        >
          {isLocating ? <Loader2 size={13} className="animate-spin" /> : 'Locate GPS'}
        </button>

        {/* City Dropdown Selector */}
        <select
          aria-label="Select city to jump to"
          onChange={(e) => {
            const val = e.target.value;
            if (val) {
              const [lat, lng] = val.split(',').map(Number);
              handleCitySelect(lat, lng);
            }
          }}
          className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-800 outline-none hover:border-[#1b7b68]"
        >
          <option value="">Jump City…</option>
          {CITIES.map((c) => (
            <option key={c.name} value={`${c.lat},${c.lng}`}>
              📍 {c.name}
            </option>
          ))}
        </select>

        {/* Street Search Form */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-1">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search street…"
              className="w-28 sm:w-32 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-2.5 pr-7 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-[#1b7b68]"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1b7b68]"
            >
              {isSearching ? <Loader2 size={12} className="animate-spin text-[#1b7b68]" /> : <Search size={12} />}
            </button>
          </div>
        </form>

        {/* Layer Mode Selector */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setMapType('STREET')}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition ${mapType === 'STREET' ? 'bg-[#1b7b68] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Navigation size={12} /> Street
          </button>
          <button
            type="button"
            onClick={() => setMapType('AERIAL')}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition ${mapType === 'AERIAL' ? 'bg-[#1b7b68] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Layers size={12} /> Satellite
          </button>
        </div>
      </div>

      {/* Geolocation Toast Notification */}
      {locationStatus && (
        <div className="absolute right-4 top-20 z-[2000] rounded-xl border border-teal-200 bg-white/95 px-3.5 py-2 text-xs font-bold text-[#1b7b68] shadow-lg backdrop-blur-md">
          {locationStatus}
        </div>
      )}

      {/* 3. Speed Limit Sign & Safety Shield (Bottom Left - z-[2000]) */}
      <div className="absolute left-4 bottom-20 z-[2000] flex items-center gap-3">
        <div className="flex h-14 w-12 flex-col items-center justify-center rounded-xl border-2 border-slate-900 bg-white p-1 shadow-2xl text-slate-900">
          <span className="text-lg font-black leading-none">{speed}</span>
          <span className="text-[8px] font-black uppercase tracking-tighter text-slate-700">LIMIT</span>
        </div>

        <button
          type="button"
          onClick={() => setSirenActive(!sirenActive)}
          className={`flex h-12 w-12 items-center justify-center rounded-full border shadow-xl transition ${sirenActive ? 'border-rose-500 bg-rose-500 text-white' : 'border-blue-200 bg-white text-blue-600'}`}
        >
          <Siren size={22} />
        </button>
      </div>

      {/* 4. Map Display Container */}
      <div ref={mapContainerRef} className={`w-full ${heightClass}`} />

      {/* 5. Bottom Navigation Summary Bar (z-[2000]) */}
      <div className="absolute bottom-0 left-0 right-0 z-[2000] flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3.5 shadow-2xl">
        <button
          type="button"
          onClick={() => setProgressPercent(5)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 hover:bg-slate-200 transition"
        >
          <SlidersHorizontal size={20} />
        </button>

        <div className="flex items-center gap-3 text-slate-900 font-black">
          <span className="text-2xl tracking-tight">{etaMinutes} MINS ETA</span>
          <span className="text-slate-400 font-normal">●</span>
          <span className="flex items-center gap-1 text-xl tracking-tight text-[#1b7b68]">
            <span className="text-xs">📍</span> {distanceKm} KM
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsDriving(!isDriving)}
          className="flex h-10 px-3 items-center justify-center gap-1 rounded-xl bg-[#1b7b68] text-white font-bold text-xs hover:bg-[#166657] transition"
        >
          {isDriving ? <Pause size={16} /> : <Play size={16} />} {isDriving ? 'Pause' : 'Resume'}
        </button>
      </div>
    </div>
  );
}
