"use client";

import { useEffect, useRef, useState } from 'react';
import type { LiveVehicleItem, LiveIncidentItem, LiveFacilityItem } from '@/services/medxrescue.service';
import { Ambulance, AlertTriangle, Building2, MapPin, RefreshCw, Eye, Navigation, Layers, CheckCircle2, Siren, Crosshair, Search, Loader2, Maximize2, ZoomIn } from 'lucide-react';

interface AerialLiveMapProps {
  vehicles?: LiveVehicleItem[];
  incidents?: LiveIncidentItem[];
  facilities?: LiveFacilityItem[];
  selectedVehicleId?: string;
  selectedIncidentId?: string;
  onSelectVehicle?: (id: string) => void;
  onSelectIncident?: (id: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
  heightClass?: string;
}

const CITIES = [
  { name: 'Ogbomoso (Takie Central)', lat: 8.1336, lng: 4.2401 },
  { name: 'Ogbomoso (LAUTECH LTH Base)', lat: 8.1580, lng: 4.2620 },
  { name: 'Ogbomoso (BUTH Area)', lat: 8.1290, lng: 4.2480 },
  { name: 'Ogbomoso (General Hospital)', lat: 8.1390, lng: 4.2510 },
  { name: 'Ogbomoso (Sabo Market)', lat: 8.1250, lng: 4.2380 },
  { name: 'Ogbomoso (Caretaker Area)', lat: 8.1420, lng: 4.2490 },
  { name: 'Ibadan (Oyo State Capital)', lat: 7.3775, lng: 3.9470 },
  { name: 'Oyo Town (Oyo State)', lat: 7.8430, lng: 3.9310 },
];

export default function AerialLiveMap({
  vehicles = [],
  incidents = [],
  facilities = [],
  selectedVehicleId,
  selectedIncidentId,
  onSelectVehicle,
  onSelectIncident,
  onRefresh,
  loading = false,
  className = '',
  heightClass = 'h-[600px]',
}: AerialLiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const overlayGroupRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const hasInitialFitRef = useRef<boolean>(false);
  const currentBoundsRef = useRef<[number, number][]>([]);

  const [mapType, setMapType] = useState<'STREET' | 'AERIAL' | 'DARK'>('STREET');
  const [isClient, setIsClient] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [activePopupInfo, setActivePopupInfo] = useState<{ type: 'vehicle' | 'incident' | 'facility'; item: any } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [movementTick, setMovementTick] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Live ambulance animation tick for smooth road gliding
  useEffect(() => {
    const interval = setInterval(() => {
      setMovementTick(prev => (prev + 1) % 360);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Leaflet map dynamically centered on Ogbomoso, Oyo State
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
        // High street detail default zoom level 16 centered on Ogbomoso, Oyo State
        const map = L.map(mapContainerRef.current, {
          center: [8.1336, 4.2401],
          zoom: 16,
          maxZoom: 20,
          zoomControl: false,
        });

        L.control.zoom({ position: 'topright' }).addTo(map);

        const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY || 'cb1_4vt5_1_bde6b70c331dc3f46a42ea0b';

        // High DPI retina street tiles
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

        // Add Street Name Overlays for Satellite Mode
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

    return () => {
      mounted = false;
    };
  }, [isClient]);

  // Switch Tile Layer
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

  // Fly to selected city
  const handleCitySelect = (lat: number, lng: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 16, { duration: 1.5 });
      setLocationStatus('Shifted to selected city.');
      setTimeout(() => setLocationStatus(''), 3000);
    }
  };

  // Zoom directly to street level (17x)
  const handleStreetZoom = () => {
    if (mapInstanceRef.current) {
      const currentCenter = mapInstanceRef.current.getCenter();
      mapInstanceRef.current.flyTo(currentCenter, 17, { duration: 1 });
      setLocationStatus('Zoomed in to Street-to-Street detail (Level 17)');
      setTimeout(() => setLocationStatus(''), 3000);
    }
  };

  // Fit Bounds to all units
  const handleFitAllUnits = () => {
    if (mapInstanceRef.current && currentBoundsRef.current.length > 0) {
      try {
        mapInstanceRef.current.fitBounds(currentBoundsRef.current, { padding: [60, 60], maxZoom: 16 });
        setLocationStatus('Fitting all active units & emergency pins.');
        setTimeout(() => setLocationStatus(''), 3000);
      } catch (e) {
        // ignore
      }
    }
  };

  // Geocode Search for any place name
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setLocationStatus('Searching street address…');

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim() + ', Ogbomoso, Oyo State, Nigeria')}&limit=1`);
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

  // Render Markers and Polylines with Live Moving Ambulances
  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current || !layerGroupRef.current) return;
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    const L = (window as any).L;
    if (!L) return;

    const bounds: [number, number][] = [];

    // Render Facilities
    facilities.forEach(facility => {
      const coords = facility.location?.coordinates;
      if (!coords || coords.length !== 2) return;
      const [lng, lat] = coords;
      bounds.push([lat, lng]);

      const html = `
        <div class="relative group cursor-pointer">
          <div class="flex items-center gap-1.5 rounded-full border-2 border-teal-500 bg-white px-3 py-1.5 text-slate-900 shadow-xl transition hover:scale-110">
            <span class="flex h-5 w-5 items-center justify-center rounded-full bg-[#1b7b68] text-white text-xs font-black">🏥</span>
            <span class="text-xs font-black whitespace-nowrap tracking-tight text-slate-900">${facility.name}</span>
          </div>
        </div>
      `;
      const icon = L.divIcon({ html, className: 'custom-facility-marker', iconSize: [140, 36], iconAnchor: [70, 18] });
      const marker = L.marker([lat, lng], { icon }).addTo(layerGroup);
      marker.on('click', () => {
        map.flyTo([lat, lng], 17, { duration: 1 });
        setActivePopupInfo({ type: 'facility', item: facility });
      });
    });

    // Render Active Incidents
    incidents.forEach(incident => {
      const coords = incident.location?.coordinates;
      if (!coords || coords.length !== 2) return;
      const [lng, lat] = coords;
      bounds.push([lat, lng]);

      const isSelected = selectedIncidentId === incident.id;
      const priorityColor = incident.priority === 'CRITICAL' ? 'bg-rose-600 border-rose-300 animate-bounce'
        : incident.priority === 'URGENT' ? 'bg-amber-500 border-amber-200'
        : 'bg-emerald-600 border-emerald-200';

      const html = `
        <div class="relative cursor-pointer flex flex-col items-center">
          <div class="flex items-center gap-1.5 rounded-2xl border-2 ${priorityColor} px-3 py-1.5 text-white shadow-2xl transition hover:scale-115 ${isSelected ? 'ring-4 ring-rose-400 scale-110' : ''}">
            <span class="text-sm">🚨</span>
            <span class="text-xs font-black uppercase tracking-wider">${incident.reference || 'SOS'}</span>
          </div>
          <div class="h-2 w-0.5 bg-rose-500 shadow"></div>
          <div class="h-2 w-2 rounded-full bg-rose-500 animate-ping"></div>
        </div>
      `;
      const icon = L.divIcon({ html, className: 'custom-incident-marker', iconSize: [120, 48], iconAnchor: [60, 44] });
      const marker = L.marker([lat, lng], { icon }).addTo(layerGroup);
      marker.on('click', () => {
        map.flyTo([lat, lng], 17, { duration: 1 });
        onSelectIncident?.(incident.id);
        setActivePopupInfo({ type: 'incident', item: incident });
      });
    });

    // Render Live Moving Ambulances Uber-Style
    vehicles.forEach(vehicle => {
      const coords = vehicle.location?.coordinates;
      if (!coords || coords.length !== 2) return;
      const [lng, lat] = coords;

      // Smooth Live Movement Simulation Offset along Ogbomoso Streets
      const charCode = (vehicle.registrationNumber || 'AMB').charCodeAt(0);
      const moveOffset = Math.sin((movementTick * 0.05) + charCode) * 0.0015;
      const currentLat = lat + moveOffset;
      const currentLng = lng + (moveOffset * 0.6);

      bounds.push([currentLat, currentLng]);

      const isSelected = selectedVehicleId === vehicle.id;
      const isDispatched = vehicle.status === 'DISPATCHED' || vehicle.activeIncident;
      const isAvailable = vehicle.status === 'AVAILABLE';

      const ringColor = isDispatched ? 'border-rose-500 bg-rose-500/20'
        : isAvailable ? 'border-emerald-500 bg-emerald-500/20'
        : 'border-slate-400 bg-slate-400/20';

      const badgeColor = isDispatched ? 'bg-rose-600 text-white border-rose-400'
        : isAvailable ? 'bg-[#1b7b68] text-white border-teal-400'
        : 'bg-slate-700 text-slate-200 border-slate-500';

      const html = `
        <div class="relative cursor-pointer flex flex-col items-center group transition-all duration-700">
          <!-- Pulse Ring -->
          <div class="absolute -inset-2 rounded-full border-2 ${ringColor} ${isDispatched ? 'animate-ping' : ''}"></div>

          <!-- Vehicle Badge Uber Style -->
          <div class="relative flex items-center gap-2 rounded-2xl border-2 ${badgeColor} px-3 py-1.5 shadow-2xl transition-all duration-300 hover:scale-115 ${isSelected ? 'scale-110 ring-4 ring-amber-300' : ''}">
            <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-black/30 text-xs ${isDispatched ? 'animate-bounce' : ''}">🚑</span>
            <div class="flex flex-col text-left">
              <span class="text-xs font-black uppercase tracking-wide leading-none">${vehicle.registrationNumber}</span>
              <span class="text-[9px] font-bold opacity-90 leading-tight">${vehicle.vehicleClass?.replace(/_/g, ' ') || 'Ambulance'}</span>
            </div>
            ${isDispatched ? '<span class="h-2 w-2 rounded-full bg-white animate-pulse"></span>' : ''}
          </div>

          <!-- Pin Pointer -->
          <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] ${isDispatched ? 'border-t-rose-600' : isAvailable ? 'border-t-[#1b7b68]' : 'border-t-slate-700'} shadow-md"></div>
        </div>
      `;

      const icon = L.divIcon({ html, className: 'custom-ambulance-marker', iconSize: [140, 50], iconAnchor: [70, 48] });
      const marker = L.marker([currentLat, currentLng], { icon }).addTo(layerGroup);

      marker.on('click', () => {
        map.flyTo([currentLat, currentLng], 17, { duration: 1 });
        onSelectVehicle?.(vehicle.id);
        setActivePopupInfo({ type: 'vehicle', item: vehicle });
      });

      // Draw Polyline connecting assigned ambulance to its active incident
      if (vehicle.activeIncident?.location?.coordinates) {
        const [incLng, incLat] = vehicle.activeIncident.location.coordinates;
        L.polyline([[currentLat, currentLng], [incLat, incLng]], {
          color: '#f43f5e',
          weight: 5,
          dashArray: '8, 12',
          lineCap: 'round',
          opacity: 0.95,
        }).addTo(layerGroup);
      }
    });

    currentBoundsRef.current = bounds;

    // Auto fit bounds ONLY ON INITIAL FIRST LOAD
    if (!hasInitialFitRef.current && bounds.length > 0 && mapInstanceRef.current) {
      try {
        mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
        hasInitialFitRef.current = true;
      } catch (e) {
        // Ignore fitBounds errors
      }
    }
  }, [leafletLoaded, vehicles, incidents, facilities, selectedVehicleId, selectedIncidentId, onSelectVehicle, onSelectIncident, movementTick]);

  return (
    <div className={`relative isolate z-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl ${className}`}>
      {/* Top White Map Control Bar (z-[2000] above Leaflet z-400..1000) */}
      <div className="absolute left-4 top-4 z-[2000] flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 text-slate-800 shadow-xl backdrop-blur-md max-w-[95%]">

        {/* Quick GPS "My Location" Button */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-[#1b7b68] hover:bg-teal-100 transition disabled:opacity-50"
        >
          {isLocating ? <Loader2 size={14} className="animate-spin text-[#1b7b68]" /> : <Crosshair size={14} className="text-[#1b7b68]" />}
          {isLocating ? 'Locating…' : 'Locate Me'}
        </button>

        <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

        {/* City Dropdown Selector */}
        <select
          aria-label="Select Ogbomoso area hub"
          onChange={(e) => {
            const val = e.target.value;
            if (val) {
              const [lat, lng] = val.split(',').map(Number);
              handleCitySelect(lat, lng);
            }
          }}
          className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none hover:border-[#1b7b68] focus:border-[#1b7b68]"
        >
          <option value="">Jump Ogbomoso Hub…</option>
          {CITIES.map((c) => (
            <option key={c.name} value={`${c.lat},${c.lng}`}>
              📍 {c.name}
            </option>
          ))}
        </select>

        {/* Search Place Form */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-1">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Ogbomoso address…"
              className="w-32 sm:w-44 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-7 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none focus:border-[#1b7b68]"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1b7b68]"
            >
              {isSearching ? <Loader2 size={13} className="animate-spin text-[#1b7b68]" /> : <Search size={13} />}
            </button>
          </div>
        </form>

        <div className="h-4 w-px bg-slate-200 hidden md:block"></div>

        {/* Zoom to High-Detail Street Level Button */}
        <button
          type="button"
          onClick={handleStreetZoom}
          title="Zoom directly to street-to-street view (17x)"
          className="flex items-center gap-1 rounded-xl border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-extrabold text-[#1b7b68] hover:bg-teal-100 transition"
        >
          <ZoomIn size={13} /> Street Zoom (17x)
        </button>

        {/* Fit All Units Button */}
        <button
          type="button"
          onClick={handleFitAllUnits}
          title="Zoom out to show all fleet units"
          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
        >
          <Maximize2 size={13} /> Fit All
        </button>

        {/* Layer Mode Selector */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setMapType('STREET')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${mapType === 'STREET' ? 'bg-[#1b7b68] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Navigation size={13} /> Street Detail
          </button>
          <button
            type="button"
            onClick={() => setMapType('AERIAL')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${mapType === 'AERIAL' ? 'bg-[#1b7b68] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Layers size={13} /> Satellite + Streets
          </button>
          <button
            type="button"
            onClick={() => setMapType('DARK')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition ${mapType === 'DARK' ? 'bg-[#1b7b68] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <Eye size={13} /> Dark Ops
          </button>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* Geolocation Toast Notification */}
      {locationStatus && (
        <div className="absolute left-4 top-20 z-[2000] rounded-xl border border-teal-200 bg-white/95 px-3.5 py-2 text-xs font-bold text-[#1b7b68] shadow-lg backdrop-blur-md">
          {locationStatus}
        </div>
      )}

      {/* White Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[2000] flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-2.5 text-xs text-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#1b7b68] shadow-sm"></span>
          <span className="font-bold text-slate-800">Available Ambulance ({vehicles.filter(v => v.status === 'AVAILABLE').length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-500 shadow-sm animate-pulse"></span>
          <span className="font-bold text-slate-800">Dispatched ({vehicles.filter(v => v.status === 'DISPATCHED' || v.activeIncident).length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-500 shadow-sm"></span>
          <span className="font-bold text-slate-800">Emergency Pin ({incidents.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base">🏥</span>
          <span className="font-bold text-slate-800">Facility ({facilities.length})</span>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className={`w-full ${heightClass}`} />

      {/* Floating Active Info Drawer */}
      {activePopupInfo && (
        <div className="absolute right-4 top-4 z-[2000] max-w-sm rounded-3xl border border-slate-200 bg-white/95 p-5 text-slate-800 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#1b7b68]">
                {activePopupInfo.type === 'vehicle' ? 'Ambulance Unit' : activePopupInfo.type === 'incident' ? 'Emergency SOS' : 'Receiving Facility'}
              </span>
              <h3 className="mt-1 text-lg font-black text-slate-900">
                {activePopupInfo.type === 'vehicle' ? activePopupInfo.item.registrationNumber
                  : activePopupInfo.type === 'incident' ? activePopupInfo.item.reference
                  : activePopupInfo.item.name}
              </h3>
            </div>
            <button
              onClick={() => setActivePopupInfo(null)}
              className="rounded-full bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-700">
            {activePopupInfo.type === 'vehicle' && (
              <>
                <p><strong>Make / Class:</strong> {activePopupInfo.item.makeModel} ({activePopupInfo.item.vehicleClass})</p>
                <p><strong>Status:</strong> <span className={`font-bold ${activePopupInfo.item.status === 'DISPATCHED' ? 'text-rose-600' : 'text-[#1b7b68]'}`}>{activePopupInfo.item.status}</span></p>
                {activePopupInfo.item.provider?.displayName && <p><strong>Provider:</strong> {activePopupInfo.item.provider.displayName}</p>}
                {activePopupInfo.item.activeIncident && (
                  <div className="mt-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-rose-900">
                    <p className="font-bold">Assigned Emergency: {activePopupInfo.item.activeIncident.reference}</p>
                    <p className="mt-0.5 line-clamp-2">{activePopupInfo.item.activeIncident.chiefComplaint}</p>
                  </div>
                )}
              </>
            )}

            {activePopupInfo.type === 'incident' && (
              <>
                <p><strong>Priority:</strong> <span className="font-extrabold text-rose-600">{activePopupInfo.item.priority}</span></p>
                <p><strong>Emergency:</strong> {activePopupInfo.item.chiefComplaint}</p>
                <p><strong>Landmark:</strong> {activePopupInfo.item.landmark || 'Location reported on map'}</p>
                <p><strong>Status:</strong> {activePopupInfo.item.status}</p>
              </>
            )}

            {activePopupInfo.type === 'facility' && (
              <>
                <p><strong>Type:</strong> {activePopupInfo.item.facilityType}</p>
                <p><strong>Address:</strong> {activePopupInfo.item.address}</p>
                {activePopupInfo.item.capabilities?.length > 0 && (
                  <p><strong>Capabilities:</strong> {activePopupInfo.item.capabilities.join(', ')}</p>
                )}
                {activePopupInfo.item.phone && <p><strong>Contact:</strong> {activePopupInfo.item.phone}</p>}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
