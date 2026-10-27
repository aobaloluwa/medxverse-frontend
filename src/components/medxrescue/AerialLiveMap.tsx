"use client";

import { useEffect, useRef, useState } from 'react';
import type { LiveVehicleItem, LiveIncidentItem, LiveFacilityItem } from '@/services/medxrescue.service';
import { Ambulance, AlertTriangle, Building2, MapPin, RefreshCw, Eye, Navigation, Layers, CheckCircle2, Siren } from 'lucide-react';

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
  const tileLayerRef = useRef<any>(null);
  const [mapType, setMapType] = useState<'AERIAL' | 'STREET' | 'DARK'>('AERIAL');
  const [isClient, setIsClient] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [activePopupInfo, setActivePopupInfo] = useState<{ type: 'vehicle' | 'incident' | 'facility'; item: any } | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Initialize Leaflet map dynamically
  useEffect(() => {
    if (!isClient || !mapContainerRef.current) return;

    let mounted = true;

    async function initMap() {
      const L = (await import('leaflet')).default;
      // Import Leaflet CSS dynamically into head if not present
      if (!document.getElementById('leaflet-css-link')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css-link';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!mounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        // Default center on Lagos / Nigeria region or first available coordinate
        const defaultLat = 6.5244;
        const defaultLng = 3.3792;
        const map = L.map(mapContainerRef.current, {
          center: [defaultLat, defaultLng],
          zoom: 12,
          zoomControl: false,
        });

        L.control.zoom({ position: 'topright' }).addTo(map);

        const tileUrls = {
          AERIAL: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          STREET: 'https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png',
          DARK: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{y}/{x}{r}.png',
        };

        const attribution = {
          AERIAL: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          STREET: '&copy; OpenStreetMap contributors',
          DARK: '&copy; OpenStreetMap &copy; CARTO',
        };

        const tileLayer = L.tileLayer(tileUrls.AERIAL, {
          maxZoom: 19,
          attribution: attribution.AERIAL,
        }).addTo(map);

        tileLayerRef.current = tileLayer;

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

  // Switch Tile Layer when mapType changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const tileUrls = {
      AERIAL: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      STREET: 'https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png',
      DARK: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{y}/{x}{r}.png',
    };

    const attributions = {
      AERIAL: 'Imagery &copy; Esri',
      STREET: '&copy; OpenStreetMap',
      DARK: '&copy; CARTO',
    };

    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    const newLayer = L.tileLayer(tileUrls[mapType], {
      maxZoom: 19,
      attribution: attributions[mapType],
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
  }, [mapType]);

  // Render Markers and Polylines
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
          <div class="flex items-center gap-1.5 rounded-full border border-blue-400 bg-blue-950/90 px-2.5 py-1 text-white shadow-lg backdrop-blur-md transition hover:scale-105">
            <span class="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-bold">🏥</span>
            <span class="text-[11px] font-extrabold whitespace-nowrap tracking-tight">${facility.name}</span>
          </div>
        </div>
      `;
      const icon = L.divIcon({ html, className: 'custom-facility-marker', iconSize: [120, 32], iconAnchor: [60, 16] });
      const marker = L.marker([lat, lng], { icon }).addTo(layerGroup);
      marker.on('click', () => setActivePopupInfo({ type: 'facility', item: facility }));
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
          <div class="flex items-center gap-1.5 rounded-full border-2 ${priorityColor} px-3 py-1 text-white shadow-2xl backdrop-blur-md transition hover:scale-110 ${isSelected ? 'ring-4 ring-rose-400' : ''}">
            <span class="text-xs">🚨</span>
            <span class="text-[11px] font-black uppercase tracking-wider">${incident.reference || 'SOS'}</span>
          </div>
          <div class="h-2 w-0.5 bg-rose-500 shadow"></div>
          <div class="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping"></div>
        </div>
      `;
      const icon = L.divIcon({ html, className: 'custom-incident-marker', iconSize: [110, 42], iconAnchor: [55, 38] });
      const marker = L.marker([lat, lng], { icon }).addTo(layerGroup);
      marker.on('click', () => {
        onSelectIncident?.(incident.id);
        setActivePopupInfo({ type: 'incident', item: incident });
      });
    });

    // Render Vehicles (Ambulances) Uber-Style
    vehicles.forEach(vehicle => {
      const coords = vehicle.location?.coordinates;
      if (!coords || coords.length !== 2) return;
      const [lng, lat] = coords;
      bounds.push([lat, lng]);

      const isSelected = selectedVehicleId === vehicle.id;
      const isDispatched = vehicle.status === 'DISPATCHED' || vehicle.activeIncident;
      const isAvailable = vehicle.status === 'AVAILABLE';

      const ringColor = isDispatched ? 'border-rose-500 bg-rose-500/20'
        : isAvailable ? 'border-emerald-500 bg-emerald-500/20'
        : 'border-slate-400 bg-slate-400/20';

      const badgeColor = isDispatched ? 'bg-rose-600 text-white border-rose-400'
        : isAvailable ? 'bg-emerald-600 text-white border-emerald-400'
        : 'bg-slate-700 text-slate-200 border-slate-500';

      const html = `
        <div class="relative cursor-pointer flex flex-col items-center group">
          <!-- Pulse Ring -->
          <div class="absolute -inset-2 rounded-full border-2 ${ringColor} ${isDispatched ? 'animate-ping' : ''}"></div>

          <!-- Vehicle Badge Uber Style -->
          <div class="relative flex items-center gap-2 rounded-xl border-2 ${badgeColor} px-3 py-1.5 shadow-2xl transition-all duration-300 hover:scale-115 ${isSelected ? 'scale-110 ring-4 ring-amber-300' : ''}">
            <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-black/30 text-xs">🚑</span>
            <div class="flex flex-col text-left">
              <span class="text-[11px] font-black uppercase tracking-wide leading-none">${vehicle.registrationNumber}</span>
              <span class="text-[9px] font-semibold opacity-90 leading-tight">${vehicle.vehicleClass?.replace(/_/g, ' ') || 'Ambulance'}</span>
            </div>
            ${isDispatched ? '<span class="h-2 w-2 rounded-full bg-white animate-pulse"></span>' : ''}
          </div>

          <!-- Pin Pointer -->
          <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] ${isDispatched ? 'border-t-rose-600' : isAvailable ? 'border-t-emerald-600' : 'border-t-slate-700'} shadow-md"></div>
        </div>
      `;

      const icon = L.divIcon({ html, className: 'custom-ambulance-marker', iconSize: [140, 50], iconAnchor: [70, 48] });
      const marker = L.marker([lat, lng], { icon }).addTo(layerGroup);

      marker.on('click', () => {
        onSelectVehicle?.(vehicle.id);
        setActivePopupInfo({ type: 'vehicle', item: vehicle });
      });

      // Draw Polyline connecting assigned ambulance to its active incident
      if (vehicle.activeIncident?.location?.coordinates) {
        const [incLng, incLat] = vehicle.activeIncident.location.coordinates;
        const polyline = L.polyline([[lat, lng], [incLat, incLng]], {
          color: '#f43f5e',
          weight: 4,
          dashArray: '8, 12',
          lineCap: 'round',
          opacity: 0.9,
        }).addTo(layerGroup);

        // Add animated dashed offset simulation if needed
      }
    });

    // Auto fit bounds if items exist
    if (bounds.length > 0 && mapInstanceRef.current) {
      try {
        mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
      } catch (e) {
        // Ignore fitBounds errors if map not fully ready
      }
    }
  }, [leafletLoaded, vehicles, incidents, facilities, selectedVehicleId, selectedIncidentId, onSelectVehicle, onSelectIncident]);

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-950 shadow-2xl ${className}`}>
      {/* Top Map Control Bar */}
      <div className="absolute left-4 top-4 z-[1000] flex flex-wrap items-center gap-2 rounded-2xl border border-white/20 bg-slate-950/80 p-2 text-white backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-1.5 px-2 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"></span>
          Aerial Fleet Radar
        </div>

        <div className="h-4 w-px bg-white/20"></div>

        {/* Layer Mode Selector */}
        <div className="flex rounded-xl bg-slate-900/90 p-1 border border-white/10">
          <button
            type="button"
            onClick={() => setMapType('AERIAL')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${mapType === 'AERIAL' ? 'bg-[#1b7b68] text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
          >
            <Layers size={13} /> Aerial Satellite
          </button>
          <button
            type="button"
            onClick={() => setMapType('STREET')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${mapType === 'STREET' ? 'bg-[#1b7b68] text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
          >
            <Navigation size={13} /> Street Map
          </button>
          <button
            type="button"
            onClick={() => setMapType('DARK')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition ${mapType === 'DARK' ? 'bg-[#1b7b68] text-white shadow-md' : 'text-slate-300 hover:text-white'}`}
          >
            <Eye size={13} /> Dark Ops
          </button>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Sync Radar
          </button>
        )}
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] flex flex-wrap items-center gap-3 rounded-2xl border border-white/15 bg-slate-950/85 px-4 py-2.5 text-xs text-white backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-md"></span>
          <span className="font-semibold text-slate-200">Available Ambulance ({vehicles.filter(v => v.status === 'AVAILABLE').length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-500 shadow-md animate-pulse"></span>
          <span className="font-semibold text-slate-200">Dispatched ({vehicles.filter(v => v.status === 'DISPATCHED' || v.activeIncident).length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-400 shadow-md"></span>
          <span className="font-semibold text-slate-200">Emergency Pin ({incidents.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base">🏥</span>
          <span className="font-semibold text-slate-200">Facility ({facilities.length})</span>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className={`w-full ${heightClass}`} />

      {/* Floating Active Info Drawer */}
      {activePopupInfo && (
        <div className="absolute right-4 top-4 z-[1000] max-w-sm rounded-3xl border border-white/20 bg-slate-900/95 p-5 text-white backdrop-blur-xl shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#1b7b68]">
                {activePopupInfo.type === 'vehicle' ? 'Ambulance Unit' : activePopupInfo.type === 'incident' ? 'Emergency SOS' : 'Receiving Facility'}
              </span>
              <h3 className="mt-1 text-lg font-black text-white">
                {activePopupInfo.type === 'vehicle' ? activePopupInfo.item.registrationNumber
                  : activePopupInfo.type === 'incident' ? activePopupInfo.item.reference
                  : activePopupInfo.item.name}
              </h3>
            </div>
            <button
              onClick={() => setActivePopupInfo(null)}
              className="rounded-full bg-white/10 p-1.5 text-slate-400 hover:bg-white/20 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
            {activePopupInfo.type === 'vehicle' && (
              <>
                <p><strong>Make / Class:</strong> {activePopupInfo.item.makeModel} ({activePopupInfo.item.vehicleClass})</p>
                <p><strong>Status:</strong> <span className={`font-bold ${activePopupInfo.item.status === 'DISPATCHED' ? 'text-rose-400' : 'text-emerald-400'}`}>{activePopupInfo.item.status}</span></p>
                {activePopupInfo.item.provider?.displayName && <p><strong>Provider:</strong> {activePopupInfo.item.provider.displayName}</p>}
                {activePopupInfo.item.activeIncident && (
                  <div className="mt-2 rounded-xl bg-rose-950/70 border border-rose-800/60 p-2.5 text-rose-200">
                    <p className="font-bold">Assigned Emergency: {activePopupInfo.item.activeIncident.reference}</p>
                    <p className="mt-0.5 line-clamp-2">{activePopupInfo.item.activeIncident.chiefComplaint}</p>
                  </div>
                )}
              </>
            )}

            {activePopupInfo.type === 'incident' && (
              <>
                <p><strong>Priority:</strong> <span className="font-extrabold text-rose-400">{activePopupInfo.item.priority}</span></p>
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
