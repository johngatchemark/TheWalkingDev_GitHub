import { useState, useCallback } from 'react';
import MapBox from './components/MapBox';
import RoutePanel from './components/RoutePanel';
import CommunityReportButton from './components/CommunityReportButton';
import CommunityReportPanel from './components/CommunityReportPanel';
import './App.css';
import type { RouteOption, LocationPoint } from './types';

function getCurrentTimeString(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function isNightFromTime(time: string): boolean {
  const [hRaw, mRaw] = time.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  const mins = h * 60 + m;
  return mins >= 18 * 60 || mins < 6 * 60;
}

function buildNightLightScores(routes: RouteOption[]): Record<string, number> {
  return routes.reduce<Record<string, number>>((acc, route) => {
    acc[route.id] = Math.floor(65 + Math.random() * 31); // 65-95
    return acc;
  }, {});
}

function App() {
  const [selectedTime, setSelectedTime] = useState<string>(getCurrentTimeString());
  const [is3D, setIs3D] = useState<boolean>(true);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [origin, setOrigin] = useState<LocationPoint>({ text: '', coords: null });
  const [destination, setDestination] = useState<LocationPoint>({ text: '', coords: null });
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [userLocationCoords, setUserLocationCoords] = useState<[number, number] | null>(null);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(null);
  const [shadeScanNonce, setShadeScanNonce] = useState(0);
  const [nightLightScores, setNightLightScores] = useState<Record<string, number>>({});
  const [showSummary, setShowSummary] = useState<boolean>(true); // Show summary by default

  // Sheet position tracking for CommunityReportButton
  const [sheetSnap, setSheetSnap] = useState<'collapsed' | 'mid' | 'expanded'>('mid');
  const [sheetDragY, setSheetDragY] = useState(0);
  const handleSheetChange = useCallback(
    (snap: 'collapsed' | 'mid' | 'expanded', dragY: number) => {
      setSheetSnap(snap);
      setSheetDragY(dragY);
    },
    [],
  );

  // Community Report state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [pinnedCoords, setPinnedCoords] = useState<[number, number] | null>(null);
  const [pinnedLabel, setPinnedLabel] = useState<string | null>(null);
  const [isPinMode, setIsPinMode] = useState(false);

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

  /** Reverse-geocode [lng, lat] via Mapbox to get a human-readable place name */
  const reverseGeocode = useCallback(async (coords: [number, number]): Promise<string> => {
    if (!MAPBOX_TOKEN) return `${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}`;
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${coords[0]},${coords[1]}.json?types=address,poi,neighborhood,locality&language=en&access_token=${MAPBOX_TOKEN}`
      );
      if (!res.ok) throw new Error('geocode failed');
      const data = await res.json();
      const place = data.features?.[0];
      return place?.place_name ?? `${coords[1].toFixed(5)}°N, ${coords[0].toFixed(5)}°E`;
    } catch {
      return `${coords[1].toFixed(5)}°N, ${coords[0].toFixed(5)}°E`;
    }
  }, [MAPBOX_TOKEN]);

  /** Called when user presses "Tap to Pin on Map" — minimizes the panel and enters pin mode */
  const handleRequestPin = useCallback(() => {
    setIsReportOpen(false); // close panel so map is fully interactive
    setIsPinMode(true);
  }, []);

  /** Called when user taps the map in pin mode — captures coords, geocodes, restores panel */
  const handleMapPin = useCallback(async (coords: [number, number]) => {
    setIsPinMode(false);
    setPinnedCoords(coords);
    setPinnedLabel(null); // show loading state
    const label = await reverseGeocode(coords);
    setPinnedLabel(label);
    setIsReportOpen(true);
  }, [reverseGeocode]);

  const handleStartNavigation = () => {
    const routeIdToUse = selectedRouteId ?? routeOptions[0]?.id ?? null;
    if (!routeIdToUse) return;
    const route = routeOptions.find(r => r.id === routeIdToUse);
    if (route) {
      setSelectedRouteId(route.id);
      setActiveRoute(route);
      setIsNavigating(true);
    }
  };

  const isNight = isNightFromTime(selectedTime);

  return (
    <div className={`app-container ${isNight ? 'night-theme' : ''} ${isNavigating ? 'is-navigating' : ''}`}>
      {/* Mapbox Layer */}
      <MapBox
        selectedTime={selectedTime}
        is3D={is3D}
        routeOptions={routeOptions}
        originCoords={origin.coords}
        destCoords={destination.coords}
        onRoutesScored={(scored) => {
          setRouteOptions(scored);

          const selectedStillExists = selectedRouteId
            ? scored.some((route) => route.id === selectedRouteId)
            : false;

          if (isNight) {
            const generatedScores = buildNightLightScores(scored);
            setNightLightScores(generatedScores);
            if (!selectedStillExists && scored.length > 0) {
              const mostLit = [...scored].sort(
                (a, b) => (generatedScores[b.id] ?? 0) - (generatedScores[a.id] ?? 0)
              )[0];
              setSelectedRouteId(mostLit.id);
            }
          } else {
            setNightLightScores({});
            if (!selectedStillExists && scored.length > 0) {
              const coolest = [...scored].sort((a, b) => (a.intensityScore ?? 999) - (b.intensityScore ?? 999))[0];
              setSelectedRouteId(coolest.id);
            }
          }
        }}
        selectedRouteId={selectedRouteId}
        onSelectRoute={setSelectedRouteId}
        userLocationCoords={userLocationCoords}
        shadeScanNonce={shadeScanNonce}
        isNavigating={isNavigating}
        activeRoute={activeRoute}
        onExitNavigation={() => setIsNavigating(false)}
        isPinMode={isPinMode}
        onMapPin={handleMapPin}
        pinnedReportCoords={pinnedCoords}
      />

      {/* Navigation UI Layer */}
      {!isNavigating && (
        <RoutePanel
          selectedTime={selectedTime}
          setSelectedTime={setSelectedTime}
          is3D={is3D}
          setIs3D={setIs3D}
          origin={origin}
          setOrigin={setOrigin}
          destination={destination}
          setDestination={setDestination}
          routeOptions={routeOptions}
          setRouteOptions={setRouteOptions}
          selectedRouteId={selectedRouteId}
          onSelectRoute={setSelectedRouteId}
          nightLightScores={nightLightScores}
          onRequestShadeScan={() => setShadeScanNonce((n) => n + 1)}
          setUserLocationCoords={setUserLocationCoords}
          onStartNavigation={handleStartNavigation}
          onSheetChange={handleSheetChange}
        />
      )}

      {/* Community Report floating button — always visible */}
      <CommunityReportButton
        mobileSheetSnap={isNavigating ? 'collapsed' : sheetSnap}
        sheetDragY={isNavigating ? 0 : sheetDragY}
        onClick={() => setIsReportOpen(true)}
      />

      {/* Pin mode: instruction banner only — map must stay interactive */}
      {isPinMode && (
        <div className="pin-mode-banner">
          📍 Tap anywhere on the map to pin the location
        </div>
      )}

      {/* Community Report Panel */}
      <CommunityReportPanel
        isOpen={isReportOpen}
        onClose={() => {
          setIsReportOpen(false);
          setIsPinMode(false);
          setPinnedCoords(null);
          setPinnedLabel(null);
        }}
        isNight={isNight}
        onRequestPin={handleRequestPin}
        pinnedCoords={pinnedCoords}
        pinnedLabel={pinnedLabel}
        isPinning={isPinMode}
      />


      {/* Top Right Calendar Widget (hidden on mobile) */}
      {/* <div className="calendar-widget glass-panel hidden-mobile">
        <Calendar size={16} color="var(--accent-cool)" />
        <span className="cal-text">Synced: john@domain.com</span>
      </div> */}

      {/* Map Legend (hidden on mobile) */}
      <div className="map-legend glass-panel hidden-mobile">
        <div className="legend-title">Route Ranks</div>
        {routeOptions.length === 0 ? (
          <div className="legend-item" style={{ opacity: 0.5, fontSize: '0.75rem' }}>
            Awaiting route sync...
          </div>
        ) : (
          [...routeOptions]
            .sort((a, b) => {
              if (isNight) {
                const lightA = nightLightScores[a.id] ?? 0;
                const lightB = nightLightScores[b.id] ?? 0;
                if (lightA !== lightB) return lightB - lightA;
              } else {
                const scoreA = a.intensityScore ?? 999;
                const scoreB = b.intensityScore ?? 999;
                if (scoreA !== scoreB) return scoreA - scoreB;
              }
              if (a.route.distance !== b.route.distance) return a.route.distance - b.route.distance;
              return a.id.localeCompare(b.id);
            })
            .map((option, idx) => (
              <div key={option.id} className="legend-item" style={{ gap: '8px' }}>
                <div className={`legend-color rank-color-${idx}`}></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.8rem' }}>
                    {idx === 0 ? (isNight ? 'MOST ILLUMINATED' : 'COOLEST') : `Option ${idx + 1}`}
                  </span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                    {option.label}{isNight ? ` • Light ${nightLightScores[option.id] ?? '--'}%` : ''}
                  </span>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

export default App;
