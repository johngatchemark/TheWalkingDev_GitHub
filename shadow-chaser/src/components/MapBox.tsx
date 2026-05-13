// MapBox.tsx
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Map, { Source, Layer, Marker, type MapRef, NavigationControl } from 'react-map-gl/mapbox';
import { type MapboxGeoJSONFeature } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import ShadeMap from 'mapbox-gl-shadow-simulator';
import SunCalc from 'suncalc';
import { Coffee, Droplet, TreeDeciduous, Store } from 'lucide-react';
import type { RouteOption } from '../types';
import NavigationUI from './NavigationUI';

interface MapBoxProps {
  selectedTime: string;
  is3D: boolean;
  routeOptions: RouteOption[];
  originCoords: [number, number] | null;
  destCoords: [number, number] | null;
  onRoutesScored?: (scored: RouteOption[]) => void;
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
  userLocationCoords: [number, number] | null;
  shadeScanNonce: number;
  isNavigating: boolean;
  activeRoute: RouteOption | null;
  onExitNavigation: () => void;
}

interface TerrainTile { x: number; y: number; z: number; }
interface TerrainRGB { r: number; g: number; b: number; }

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const SHADE_MAP_API_KEY = import.meta.env.VITE_SHADE_MAP_API_KEY || '';

const INITIAL_VIEW_STATE = {
  longitude: 120.9856,
  latitude: 14.6022,
  zoom: 16.5,
  pitch: 60,
  bearing: -20
};

const ROUTE_STYLES: Record<string, { color: string; textColor: string; dash?: number[]; width: number; opacity: number; offset?: number }> = {
  A: { color: '#ea4335', textColor: '#ffffff', width: 9, opacity: 1, offset: -4 },
  B: { color: '#4285F4', textColor: '#ffffff', width: 9, opacity: 1, offset: 0 },
  C: { color: '#facc15', textColor: '#111827', width: 9, opacity: 1, offset: 4 }
};

function getDateForTime(time: string) {
  const d = new Date();
  const [hRaw, mRaw] = time.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    d.setHours(12, 0, 0, 0);
    return d;
  }
  d.setHours(h, m, 0, 0);
  return d;
}

export default function MapBox({ 
  selectedTime, 
  is3D, 
  routeOptions, 
  originCoords, 
  destCoords, 
  userLocationCoords, 
  onRoutesScored, 
  selectedRouteId, 
  onSelectRoute,
  isNavigating,
  activeRoute,
  onExitNavigation,
  shadeScanNonce
}: MapBoxProps) {
  const mapRef = useRef<MapRef>(null);
  const shadeMapRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [liveUserCoords, setLiveUserCoords] = useState<[number, number] | null>(null);
  const [userHeadingDeg, setUserHeadingDeg] = useState(0);
  const hasCenteredOnUserRef = useRef(false);
  const userHeadingRef = useRef(0);
  const headingTargetRef = useRef(0);
  const headingFrameRef = useRef<number | null>(null);
  const headingSamplesRef = useRef<number[]>([]);
  const lastHeadingUpdateMsRef = useRef(0);
  
  const [orientationPermGranted, setOrientationPermGranted] = useState(false);

  const coolZoneMarkers = useMemo(() => {
    if (!routeOptions.length) return [] as { id: string; coords:[number, number]; type: string; }[];
    const coords = routeOptions[0].route.geometry.coordinates;
    const sampleIndexes = [2, Math.floor(coords.length / 3), Math.floor((coords.length * 2) / 3), coords.length - 3];
    const types = ['Water', 'Cafe', 'Shade', 'Mall'];
    return sampleIndexes.filter((idx) => coords[idx]).map((idx, index) => ({
      id: `cool-zone-${index}`,
      coords: coords[idx] as [number, number],
      type: types[index] || 'Cool Zone'
    }));
  }, [routeOptions]);
  const [showOrientationPrompt, setShowOrientationPrompt] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [distToNextStep, setDistToNextStep] = useState(0);
  const [remDist, setRemDist] = useState(0);
  const [remDur, setRemDur] = useState(0);
  const [isStuck, setIsStuck] = useState(false);
  const lastPosRef = useRef<[number, number] | null>(null);
  const lastMoveTimeRef = useRef<number>(Date.now());
  const lastFollowUpdateRef = useRef<number>(0);

  const isNight = (() => {
    const [hRaw, mRaw] = selectedTime.split(':');
    const h = Number(hRaw);
    const m = Number(mRaw);
    if (Number.isNaN(h) || Number.isNaN(m)) return false;
    const mins = h * 60 + m;
    return mins >= 18 * 60 || mins < 6 * 60;
  })();

  const buildingLayer: any = {
    id: '3d-buildings',
    source: 'composite',
    'source-layer': 'building',
    filter: ['==', 'extrude', 'true'],
    type: 'fill-extrusion',
    minzoom: 15,
    paint: {
      'fill-extrusion-color': isNight ? '#1e293b' : '#f8fafc',
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': ['get', 'min_height'],
      'fill-extrusion-opacity': 0.95
    }
  };

  const normalizeHeading = useCallback((deg: number) => ((deg % 360) + 360) % 360, []);
  const shortestHeadingDelta = useCallback((fromDeg: number, toDeg: number) => {
    return ((toDeg - fromDeg + 540) % 360) - 180;
  }, []);

  const animateHeadingTowardsTarget = useCallback(() => {
    const current = userHeadingRef.current;
    const target = headingTargetRef.current;
    const delta = shortestHeadingDelta(current, target);
    
    const next = Math.abs(delta) < 0.5
      ? target
      : normalizeHeading(current + delta * 0.2);

    userHeadingRef.current = next;
    setUserHeadingDeg(next);

    if (Math.abs(shortestHeadingDelta(next, target)) < 0.5) {
      headingFrameRef.current = null;
      return;
    }
    headingFrameRef.current = window.requestAnimationFrame(animateHeadingTowardsTarget);
  }, [normalizeHeading, shortestHeadingDelta]);

  const updateHeadingTarget = useCallback((deg: number) => {
    const normalized = normalizeHeading(deg);
    const delta = Math.abs(shortestHeadingDelta(headingTargetRef.current, normalized));
    if (delta < 1.0) return;
    headingTargetRef.current = normalized;
    if (headingFrameRef.current === null) {
      headingFrameRef.current = window.requestAnimationFrame(animateHeadingTowardsTarget);
    }
  }, [normalizeHeading, shortestHeadingDelta, animateHeadingTowardsTarget]);

  // *** FIXED: Proper iOS orientation permission flow ***
  const requestOrientationPermission = useCallback(async () => {
    // Check if the permission API exists (iOS 13+)
    const DOE = DeviceOrientationEvent as any;
    if (typeof DOE.requestPermission === 'function') {
      try {
        const result = await DOE.requestPermission();
        if (result === 'granted') {
          console.log('[Shadow-Chaser] ✅ Orientation permission GRANTED');
          setOrientationPermGranted(true);
          setShowOrientationPrompt(false);
        } else {
          console.warn('[Shadow-Chaser] ❌ Orientation permission DENIED');
        }
      } catch (err) {
        console.error('[Shadow-Chaser] Orientation permission error:', err);
      }
    } else {
      // Android or older iOS — no permission needed, events just fire
      console.log('[Shadow-Chaser] No permission API — orientation events should work automatically');
      setOrientationPermGranted(true);
    }
  }, []);

  // This function was created using Generative AI
  useEffect(() => {
    const DOE = DeviceOrientationEvent as any;
    if (typeof DOE.requestPermission === 'function') {
      // iOS 13+ — we need explicit user-gesture permission
      setShowOrientationPrompt(true);
      setOrientationPermGranted(false);
    } else {
      // Not iOS or old iOS — permission not needed
      setOrientationPermGranted(true);
    }
  }, []);

  // Track user location continuously
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const nextCoords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setLiveUserCoords(nextCoords);

        // *** Use GPS heading as fallback with lower speed threshold ***
        if (
          typeof pos.coords.heading === 'number' &&
          Number.isFinite(pos.coords.heading) &&
          pos.coords.heading !== -1 &&        // iOS returns -1 when unavailable
          (pos.coords.speed ?? 0) > 0.3       // lowered from 0.6
        ) {
          updateHeadingTarget(pos.coords.heading);
        }

        if (mapLoaded && !hasCenteredOnUserRef.current) {
          mapRef.current?.getMap().flyTo({
            center: nextCoords,
            zoom: 16.8,
            duration: 900
          });
          hasCenteredOnUserRef.current = true;
        }
      },
      (err) => {
        console.error('[Shadow-Chaser] User location watch error:', err);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [mapLoaded, updateHeadingTarget]);

  // This function was created using Generative AI
  // Navigation Progress Tracking & Stuck Detection
  useEffect(() => {
    if (!isNavigating || !activeRoute || !liveUserCoords) return;

    const getDistance = (p1: number[], p2: number[]) => {
      const R = 6371e3;
      const dLat = (p2[1] - p1[1]) * Math.PI / 180;
      const dLng = (p2[0] - p1[0]) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1[1] * Math.PI / 180) * Math.cos(p2[1] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const steps = activeRoute.route.legs[0].steps;
    const nextIdx = Math.min(activeStepIndex + 1, steps.length - 1);
    const nextStep = steps[nextIdx];
    const nextStepCoords = [nextStep.maneuver.location?.[0] || 0, nextStep.maneuver.location?.[1] || 0];
    const dToNext = getDistance(liveUserCoords, nextStepCoords);

    if (dToNext < 15 && activeStepIndex < steps.length - 1) {
      setActiveStepIndex(prev => prev + 1);
    }

    setDistToNextStep(dToNext);

    let totalD = dToNext;
    let avgWalkingSpeed = activeRoute.route.distance / activeRoute.route.duration;
    let totalT = dToNext / (avgWalkingSpeed || 1.4);
    
    for (let i = activeStepIndex + 1; i < steps.length; i++) {
      totalD += steps[i].distance;
      totalT += steps[i].duration;
    }
    setRemDist(totalD);
    setRemDur(totalT);

    const dMoved = lastPosRef.current ? getDistance(liveUserCoords, lastPosRef.current) : 10;
    if (dMoved > 3) {
      lastPosRef.current = liveUserCoords;
      lastMoveTimeRef.current = Date.now();
      setIsStuck(false);
    } else {
      if (Date.now() - lastMoveTimeRef.current > 60000) {
        setIsStuck(true);
      }
    }

    const now = Date.now();
    if (now - lastFollowUpdateRef.current > 1800) {
      mapRef.current?.getMap().easeTo({
        center: liveUserCoords,
        zoom: 18.2,
        pitch: 65,
        bearing: userHeadingDeg,
        duration: 1800
      });
      lastFollowUpdateRef.current = now;
    }

  }, [liveUserCoords, isNavigating, activeRoute, activeStepIndex, userHeadingDeg]);

  // This function was created using Generative AI
  // *** FIXED: Only listen for orientation events AFTER permission is granted ***
  useEffect(() => {
    if (!orientationPermGranted) {
      console.log('[Shadow-Chaser] Skipping orientation listener — no permission yet');
      return;
    }

    console.log('[Shadow-Chaser] 🎯 Attaching orientation listeners');

    const updateHeading = (event: DeviceOrientationEvent) => {
      const now = Date.now();
      if (now - lastHeadingUpdateMsRef.current < 60) return;
      lastHeadingUpdateMsRef.current = now;

      // iOS: webkitCompassHeading is degrees from magnetic north (0-360, clockwise)
      const webkitCompass = (event as any).webkitCompassHeading;
      
      let raw: number | null = null;
      
      if (typeof webkitCompass === 'number' && Number.isFinite(webkitCompass)) {
        raw = webkitCompass;
      } else if (typeof event.alpha === 'number' && Number.isFinite(event.alpha)) {
        // Android: alpha is counterclockwise from north when using absolute
        // For `deviceorientationabsolute`, alpha=0 means north
        // We need to convert: heading = 360 - alpha
        raw = (event as any).absolute ? (360 - event.alpha) % 360 : null;
      }
      
      if (raw === null) return;

      const normalized = normalizeHeading(raw);
      const samples = [...headingSamplesRef.current, normalized].slice(-8);
      headingSamplesRef.current = samples;

      // Circular mean
      const meanSin = samples.reduce((sum, deg) => sum + Math.sin((deg * Math.PI) / 180), 0) / samples.length;
      const meanCos = samples.reduce((sum, deg) => sum + Math.cos((deg * Math.PI) / 180), 0) / samples.length;
      const meanDeg = normalizeHeading((Math.atan2(meanSin, meanCos) * 180) / Math.PI);

      updateHeadingTarget(meanDeg);
    };

    // This function was created using Generative AI
    // *** IMPORTANT: On iOS, `deviceorientationabsolute` does NOT exist. ***
    // Only listen to `deviceorientation` which provides webkitCompassHeading on iOS.
    // On Android, prefer `deviceorientationabsolute` for true north.
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      window.addEventListener('deviceorientation', updateHeading, true);
    } else {
      // Android: try absolute first, fall back to regular
      window.addEventListener('deviceorientationabsolute', updateHeading, true);
      window.addEventListener('deviceorientation', updateHeading, true);
    }

    return () => {
      window.removeEventListener('deviceorientationabsolute', updateHeading, true);
      window.removeEventListener('deviceorientation', updateHeading, true);
      if (headingFrameRef.current !== null) {
        window.cancelAnimationFrame(headingFrameRef.current);
        headingFrameRef.current = null;
      }
    };
  }, [orientationPermGranted, normalizeHeading, updateHeadingTarget]);

  // This function was created using Generative AI
  // Recenter map on user location coords
  useEffect(() => {
    if (!mapLoaded || !userLocationCoords) return;
    mapRef.current?.getMap().flyTo({
      center: userLocationCoords,
      zoom: 17.2,
      duration: 900
    });
  }, [userLocationCoords, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (map && mapLoaded) {
      map.easeTo({
        pitch: is3D ? 60 : 0,
        bearing: is3D ? -20 : 0,
        duration: 800
      });
      if (map.getLayer('3d-buildings')) {
        map.setLayoutProperty('3d-buildings', 'visibility', is3D ? 'visible' : 'none');
      }
    }
  }, [is3D, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoaded) return;

    const injectShadeMap = () => {
      if (shadeMapRef.current) shadeMapRef.current.remove();
      shadeMapRef.current = new ShadeMap({
        date: getDateForTime(selectedTime),
        color: '#01112f',
        opacity: 0.7,
        apiKey: SHADE_MAP_API_KEY,
        terrainSource: {
          tileSize: 256,
          maxZoom: 15,
          getSourceUrl: ({ x, y, z }: any) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
          getElevation: ({ r, g, b }: any) => (r * 256 + g + b / 256) - 32768
        },
        getFeatures: async () => {
          return map.querySourceFeatures('composite', { sourceLayer: 'building' }).filter((feature: any) => {
            return feature.properties && feature.properties.underground !== "true" && (feature.properties.height || feature.properties.render_height);
          });
        }
      }).addTo(map);
    };

    map.on('style.load', () => {
      injectShadeMap();
      if (map.getLayer('3d-buildings')) {
        map.setLayoutProperty('3d-buildings', 'visibility', is3D ? 'visible' : 'none');
      }
    });

    if (map.getLayer('3d-buildings')) {
      map.moveLayer('3d-buildings');
    }
    
    return () => {
      map.off('style.load', injectShadeMap);
    };
  }, [mapLoaded, selectedTime, is3D]);

  const handleMapLoad = () => {
    setMapLoaded(true);
    const map = mapRef.current?.getMap();
    if (!map) return;

    shadeMapRef.current = new ShadeMap({
      date: getDateForTime(selectedTime),
      color: '#0f172a',
      opacity: 0.7,
      apiKey: SHADE_MAP_API_KEY,
      terrainSource: {
        tileSize: 256,
        maxZoom: 15,
        getSourceUrl: ({ x, y, z }: TerrainTile) =>
          `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
        getElevation: ({ r, g, b }: TerrainRGB) => (r * 256 + g + b / 256) - 32768
      },
      getFeatures: async () => {
        return (map.querySourceFeatures('composite', { sourceLayer: 'building' })).filter((f) =>
          f.properties && f.properties.underground !== 'true' &&
          (f.properties.height || f.properties.render_height)
        ) as MapboxGeoJSONFeature[];
      }
    }).addTo(map);
  };

  useEffect(() => {
    if (shadeMapRef.current) shadeMapRef.current.setDate(getDateForTime(selectedTime));
  }, [selectedTime]);

  const lastFittedRoutes = useRef<string>("");

  useEffect(() => {
    if (!routeOptions.length || !mapLoaded) {
      lastFittedRoutes.current = "";
      return;
    }
    const routesKey = routeOptions.map(o => `${o.id}:${o.route.distance}`).join('|');
    if (routesKey === lastFittedRoutes.current) return;
    lastFittedRoutes.current = routesKey;
    const coords = routeOptions.flatMap((option) => option.route.geometry.coordinates);
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)]
    ];
    mapRef.current?.getMap().fitBounds(bounds, { 
      padding: { top: 0, bottom: 0, left: 0, right: 0 }, 
      duration: 1200 
    });
  }, [routeOptions, mapLoaded]);

  const scoringDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProcessedShadeScanNonce = useRef<number>(-1);

  useEffect(() => {
    if (!mapLoaded || !routeOptions.length || !onRoutesScored) return;
    if (shadeScanNonce === lastProcessedShadeScanNonce.current) return;
    lastProcessedShadeScanNonce.current = shadeScanNonce;
    if (scoringDebounce.current) clearTimeout(scoringDebounce.current);
    scoringDebounce.current = setTimeout(async () => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      const getDistance = (p1: number[], p2: number[]) => {
        const R = 6371e3;
        const dLat = (p2[1] - p1[1]) * Math.PI / 180;
        const dLng = (p2[0] - p1[0]) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1[1] * Math.PI / 180) * Math.cos(p2[1] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      };
      const date = getDateForTime(selectedTime);
      const referencePoint = routeOptions[0].route.geometry.coordinates[0];
      const sunPos = SunCalc.getPosition(date, referencePoint[1], referencePoint[0]);
      if (sunPos.altitude <= 0) {
        onRoutesScored(routeOptions.map(o => ({ ...o, intensityScore: 100, sunSegments: 0 })));
        return;
      }
      const allBuildings = map.querySourceFeatures('composite', { sourceLayer: 'building' })
        .filter((f: any) => f.properties && f.properties.underground !== "true" && (f.properties.height || f.properties.render_height));
      const dedupeMap = new globalThis.Map();
      allBuildings.forEach((b: any) => { if (b.id) dedupeMap.set(b.id, b); });
      const buildings = Array.from(dedupeMap.values()) as any[];
      const isPointInFootprint = (p: [number, number], polygon: any): boolean => {
        if (!polygon || polygon.length === 0) return false;
        const pts = polygon[0];
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const xi = pts[i][0], yi = pts[i][1];
          const xj = pts[j][0], yj = pts[j][1];
          const intersect = ((yi > p[1]) !== (yj > p[1])) && (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        return inside;
      };
      const scoredOptions = routeOptions.map((option) => {
        const coords = option.route.geometry.coordinates;
        const totalDist = option.route.distance;
        const totalDur = option.route.duration;
        const avgSpeed = totalDist / totalDur;
        const baseDate = getDateForTime(selectedTime);
        const samplePoints: { coord: [number, number], timeOffset: number }[] = [];
        let traversedDist = 0;
        for (let i = 0; i < coords.length - 1; i++) {
          const p1 = coords[i] as [number, number];
          const segmentDist = getDistance(p1, coords[i+1] as [number, number]);
          samplePoints.push({ coord: p1, timeOffset: traversedDist / (avgSpeed || 1.4) });
          if (segmentDist > 15) {
            const numSteps = Math.floor(segmentDist / 15);
            for (let j = 1; j <= numSteps; j++) {
              const f = j / (numSteps + 1);
              const stepCoord: [number, number] = [p1[0] + (coords[i+1][0] - p1[0]) * f, p1[1] + (coords[i+1][1] - p1[1]) * f];
              samplePoints.push({ coord: stepCoord, timeOffset: (traversedDist + (segmentDist * f)) / (avgSpeed || 1.4) });
            }
          }
          traversedDist += segmentDist;
        }
        samplePoints.push({ coord: coords[coords.length - 1] as [number, number], timeOffset: totalDist / (avgSpeed || 1.4) });
        let sunCount = 0;
        for (const pt of samplePoints) {
          const arrivalDate = new Date(baseDate.getTime() + pt.timeOffset * 1000);
          const dynamicSunPos = SunCalc.getPosition(arrivalDate, pt.coord[1], pt.coord[0]);
          if (dynamicSunPos.altitude <= 0) continue;
          const dz = Math.tan(dynamicSunPos.altitude);
          const dxSun = -Math.sin(dynamicSunPos.azimuth);
          const dySun = -Math.cos(dynamicSunPos.azimuth);
          let inShadow = false;
          for (let d = 5; d < 300; d += 5) {
            const rayZ = d * dz;
            const checkLng = pt.coord[0] + (dxSun * d) / (111320 * Math.cos(pt.coord[1] * Math.PI / 180));
            const checkLat = pt.coord[1] + (dySun * d) / 111320;
            for (const b of buildings) {
              if ((b.properties.height || b.properties.render_height || 0) > rayZ) {
                if (isPointInFootprint([checkLng, checkLat], b.geometry.coordinates)) { inShadow = true; break; }
              }
            }
            if (inShadow) break;
          }
          if (!inShadow) sunCount++;
        }
        return { ...option, intensityScore: Math.round((sunCount / samplePoints.length) * 100), sunSegments: sunCount };
      });
      onRoutesScored(scoredOptions);
    }, 1000);
    return () => { if (scoringDebounce.current) clearTimeout(scoringDebounce.current); };
  }, [shadeScanNonce, routeOptions, selectedTime, mapLoaded, onRoutesScored]);

  const effectiveUserCoords = userLocationCoords ?? liveUserCoords;

  return (
    <div className="map-container">
      {showOrientationPrompt && !orientationPermGranted && (
        <button
          className="compass-permission-btn"
          onClick={requestOrientationPermission}
        >
          🧭 Tap to Enable Compass
        </button>
      )}

      {MAPBOX_TOKEN ? (
        <Map
          ref={mapRef}
          initialViewState={INITIAL_VIEW_STATE}
          mapStyle="mapbox://styles/mapbox/outdoors-v12"
          mapboxAccessToken={MAPBOX_TOKEN}
          antialias={true}
          onLoad={handleMapLoad}
          onClick={(e) => {
            if (e.features && e.features.length > 0 && e.features[0].layer) {
              const layerId = e.features[0].layer.id;
              if (layerId.startsWith('route-') && layerId.endsWith('-line')) {
                onSelectRoute(layerId.split('-')[1]);
              }
            }
          }}
          interactiveLayerIds={routeOptions.map(o => `route-${o.id}-line`)}
        >
          <NavigationControl position="bottom-right" visualizePitch={true} />
          <Layer {...buildingLayer} />
          
          {(() => {
            const ranked = [...routeOptions].sort((a, b) => (a.intensityScore ?? 999) - (b.intensityScore ?? 999));
            return ranked.map((option) => {
              const isSelected = option.id === selectedRouteId;
              const routeColor = ROUTE_STYLES[option.id]?.color || '#0098d9';
              return (
                <Source key={option.id} type="geojson" data={{ type: 'Feature', geometry: option.route.geometry } as any}>
                  <Layer
                    id={`route-${option.id}-line`}
                    type="line"
                    layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                    paint={{
                      'line-color': routeColor,
                      'line-width': isSelected ? 10 : 6,
                      'line-opacity': isSelected ? 0.98 : 0.88,
                      'line-offset': (ROUTE_STYLES[option.id]?.offset || 0),
                      ...(isSelected ? {} : { 'line-dasharray': [2.4, 2.4] })
                    }}
                  />
                </Source>
              );
            });
          })()}

          {coolZoneMarkers.length > 0 && (
            <Source
              id="cool-zone-points"
              type="geojson"
              data={{
                type: 'FeatureCollection',
                features: coolZoneMarkers.map((zone) => ({
                  type: 'Feature',
                  properties: { id: zone.id, label: zone.type },
                  geometry: { type: 'Point', coordinates: zone.coords }
                }))
              }}
            >
              <Layer
                id="cool-zone-points-layer"
                type="circle"
                paint={{
                  'circle-color': '#22c55e',
                  'circle-radius': 16,
                  'circle-opacity': 0.35,
                  'circle-stroke-color': '#8ee6b9',
                  'circle-stroke-width': 2
                }}
              />
            </Source>
          )}

          {coolZoneMarkers.map((zone) => {
            const IconComponent = zone.type === 'Cafe'
              ? Coffee
              : zone.type === 'Water'
                ? Droplet
                : zone.type === 'Shade'
                  ? TreeDeciduous
                  : Store;
            const colorClass = zone.type === 'Cafe'
              ? 'cool-zone-cafe'
              : zone.type === 'Water'
                ? 'cool-zone-water'
                : zone.type === 'Mall'
                  ? 'cool-zone-mall'
                  : 'cool-zone-shade';
            return (
              <Marker key={zone.id} longitude={zone.coords[0]} latitude={zone.coords[1]} anchor="center">
                <div className={`cool-zone-marker ${colorClass}`} title={zone.type}>
                  <IconComponent size={16} />
                </div>
              </Marker>
            );
          })}

          {[...routeOptions]
            .sort((a, b) => (a.intensityScore ?? 999) - (b.intensityScore ?? 999))
            .map((option) => {
            const midpoint = option.route.geometry.coordinates[Math.floor(option.route.geometry.coordinates.length / 2)];
            const style = ROUTE_STYLES[option.id] || { color: '#0098d9', textColor: '#ffffff' };
            return (
              <Marker key={`label-${option.id}`} longitude={midpoint[0]} latitude={midpoint[1]} anchor="center">
                <div
                  className={`path-label-marker ${option.id === selectedRouteId ? 'selected' : ''}`}
                  style={{ backgroundColor: style.color, color: style.textColor }}
                  onClick={() => onSelectRoute(option.id)}
                >
                  {option.label}
                </div>
              </Marker>
            );
          })}

          {originCoords && (
            <Marker longitude={originCoords[0]} latitude={originCoords[1]} anchor="center" offset={[0, 18]}>
              <div className="map-marker origin-marker" aria-label="Start point" />
            </Marker>
          )}

          {destCoords && (
            <Marker longitude={destCoords[0]} latitude={destCoords[1]} anchor="center">
              <div className="map-marker dest-marker">End</div>
            </Marker>
          )}

          {/* *** FIXED: Use CSS transform for rotation instead of Marker rotation prop *** */}
          {effectiveUserCoords && (
            <Marker 
              longitude={effectiveUserCoords[0]} 
              latitude={effectiveUserCoords[1]} 
              anchor="center"
            >
              <div 
                className="nav-marker-arrow"
                style={{ transform: `rotate(${userHeadingDeg}deg)` }}
              >
                <div className="arrow-pulse-ring" />
                <svg className="arrow-icon-svg" viewBox="0 0 42 48">
                  <path d="M21 0L42 48L21 38L0 48L21 0Z" />
                </svg>
              </div>
            </Marker>
          )}
        </Map>
      ) : (
        <div style={{ padding: 40, color: 'white', background: '#111', height: '100%' }}>
          <h2>Mapbox Token Missing</h2>
        </div>
      )}

      {isNavigating && activeRoute && (
        <NavigationUI
          activeRoute={activeRoute}
          activeStepIndex={activeStepIndex}
          distanceToNextStep={distToNextStep}
          remainingDistance={remDist}
          remainingDuration={remDur}
          isStuck={isStuck}
          onExit={onExitNavigation}
        />
      )}
    </div>
  );
}