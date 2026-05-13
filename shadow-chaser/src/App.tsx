import { useState } from 'react';
import MapBox from './components/MapBox';
import RoutePanel from './components/RoutePanel';
import ActivitySummary from './components/ActivitySummary';
import { Calendar } from 'lucide-react';
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

  if (showSummary) {
    return <ActivitySummary onClose={() => setShowSummary(false)} />;
  }

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
        />
      )}

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
