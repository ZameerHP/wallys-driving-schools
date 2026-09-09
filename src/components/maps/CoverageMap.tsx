import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin
} from '@vis.gl/react-google-maps';
import { Circle } from './Circle';

export const ROOTY_HILL_CENTER = { lat: -33.7738, lng: 150.8172 };
export const COVERAGE_RADIUS_METERS = 15000; // 15 km fixed radius

function LeafletCoverageMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center: [ROOTY_HILL_CENTER.lat, ROOTY_HILL_CENTER.lng],
      zoom: 11,
      zoomControl: true,
      attributionControl: true,
    });

    mapInstanceRef.current = map;

    // Add high quality tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Custom Red Pin Icon
    const redPinIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="width: 32px; height: 42px; transform: translate(-50%, -100%); display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));">
          <svg width="32" height="42" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37 18.63 0 12 0Z" fill="#E3222A" stroke="#991B1B" stroke-width="1.5"/>
            <circle cx="12" cy="11" r="4.5" fill="#FFFFFF"/>
          </svg>
        </div>
      `,
      iconSize: [32, 42],
      iconAnchor: [16, 42],
    });

    // Add Central Red Marker
    L.marker([ROOTY_HILL_CENTER.lat, ROOTY_HILL_CENTER.lng], {
      icon: redPinIcon,
      title: 'Rooty Hill Service Hub',
    }).addTo(map);

    // Add 15 km Transparent Blue Circle
    const circle = L.circle([ROOTY_HILL_CENTER.lat, ROOTY_HILL_CENTER.lng], {
      radius: COVERAGE_RADIUS_METERS, // 15 km
      color: '#1976D2',
      weight: 2.5,
      opacity: 0.85,
      fillColor: '#2196F3',
      fillOpacity: 0.28,
      interactive: false,
    }).addTo(map);

    // Fit map bounds to encompass the 15km circle
    map.fitBounds(circle.getBounds(), { padding: [30, 30] });

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return <div ref={mapContainerRef} className="w-full h-full" />;
}

export function CoverageMap() {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';
  const [googleMapsError, setGoogleMapsError] = useState<boolean>(false);

  // Catch any auth failure thrown by Google Maps if an invalid key was configured
  useEffect(() => {
    const handleAuthFailure = () => {
      setGoogleMapsError(true);
    };
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = handleAuthFailure;
  }, []);

  const shouldRenderGoogleMaps = Boolean(apiKey && apiKey.trim().length > 5 && !googleMapsError);

  return (
    <div 
      id="google-coverage-map-container"
      className="w-full h-[620px] rounded-[36px] overflow-hidden shadow-2xl border border-black/10 relative bg-slate-100"
    >
      {shouldRenderGoogleMaps ? (
        <APIProvider
          apiKey={apiKey}
          solutionChannel="gmp_mcp_codeassist_v1_aistudio"
          onError={() => setGoogleMapsError(true)}
        >
          <Map
            id="coverage-google-map"
            mapId="DEMO_MAP_ID"
            defaultCenter={ROOTY_HILL_CENTER}
            defaultZoom={11}
            gestureHandling="greedy"
            disableDefaultUI={false}
            zoomControl={true}
            streetViewControl={false}
            mapTypeControl={false}
            fullscreenControl={true}
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            className="w-full h-full"
          >
            {/* Central Red Marker Pin at Rooty Hill */}
            <AdvancedMarker
              position={ROOTY_HILL_CENTER}
              title="Rooty Hill Service Hub"
            >
              <Pin
                background="#E3222A"
                borderColor="#991B1B"
                glyphColor="#FFFFFF"
                scale={1.25}
              />
            </AdvancedMarker>

            {/* 15 km Transparent Blue Circle */}
            <Circle
              center={ROOTY_HILL_CENTER}
              radius={COVERAGE_RADIUS_METERS}
              strokeColor="#1976D2"
              strokeOpacity={0.85}
              strokeWeight={2.5}
              fillColor="#2196F3"
              fillOpacity={0.28}
              clickable={false}
            />
          </Map>
        </APIProvider>
      ) : (
        <LeafletCoverageMap />
      )}
    </div>
  );
}
