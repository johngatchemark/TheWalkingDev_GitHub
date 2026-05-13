import React, { useState, useRef, useCallback } from 'react';
import lakadLogo from '../assets/LakadPHLogo.png';
import {
  Navigation,
  MapPin,
  Clock,
  Layers,
  Box,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Search,
  LocateFixed,
  Sun,
  TreeDeciduous,
  ShieldCheck,
  Coffee,
  ShoppingBag,
  Droplet,
  Store
} from 'lucide-react';
import type { RouteData, RouteOption, LocationPoint } from '../types';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
const GOOGLE_KEY   = import.meta.env.VITE_GOOGLE_PLACES_KEY || '';

// ── Google Places (New) API ────────────────────────────────────────────────
// Restricted to a Metro Manila (NCR) bounding box.
const METRO_MANILA_RECT = {
  // Southwest (near Las Pinas / Muntinlupa boundary area)
  low:  { latitude: 14.36, longitude: 120.94 },
  // Northeast (near Caloocan / Quezon City boundary area)
  high: { latitude: 14.80, longitude: 121.12 },
};

interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

function cleanContext(text: string): string {
  return text
    .replace(/,?\s*Metro Manila/gi, '')
    .replace(/,?\s*Philippines/gi, '')
    .replace(/,?\s*Manila$/gi, '')
    .replace(/^\s*,\s*/, '')
    .trim();
}

// This function was created using Generative AI
async function fetchGoogleSuggestions(query: string): Promise<PlaceSuggestion[]> {
  if (query.trim().length < 2 || !GOOGLE_KEY) {
    if (!GOOGLE_KEY) console.warn('[Shadow-Chaser] VITE_GOOGLE_PLACES_KEY is not set.');
    return [];
  }
  try {
    // Use ?key= query param instead of X-Goog-Api-Key header to avoid CORS preflight
    const res = await fetch(
      `https://places.googleapis.com/v1/places:autocomplete?key=${GOOGLE_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: query,
          languageCode: 'en',
          includedRegionCodes: ['ph'],
          locationRestriction: { rectangle: METRO_MANILA_RECT },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[Shadow-Chaser] Places Autocomplete error:', res.status, err);
      return [];
    }
interface GooglePrediction {
  placePrediction?: {
    placeId: string;
    text?: { text: string };
    structuredFormat?: {
      mainText?: { text: string };
      secondaryText?: { text: string };
    };
  };
}

    const data = await res.json();
    return (data.suggestions ?? [])
      .filter((s: GooglePrediction) => !!s.placePrediction)
      .map((s: GooglePrediction) => {
        const pred = s.placePrediction!;
        const main      = pred.structuredFormat?.mainText?.text      ?? pred.text?.text ?? '';
        const secondary = pred.structuredFormat?.secondaryText?.text ?? '';
        return {
          placeId: pred.placeId,
          mainText: main,
          secondaryText: cleanContext(secondary),
        };
      });
  } catch (e) {
    console.error('[Shadow-Chaser] fetchGoogleSuggestions failed:', e);
    return [];
  }
}

// This function was created using Generative AI
// Fetch exact lat/lng via Place Details — also uses ?key= to skip CORS preflight
async function getPlaceCoords(placeId: string): Promise<[number, number] | null> {
  if (!GOOGLE_KEY) return null;
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?fields=location&key=${GOOGLE_KEY}`
    );
    if (!res.ok) {
      console.error('[Shadow-Chaser] Place Details error:', res.status);
      return null;
    }
    const data = await res.json();
    if (data.location) return [data.location.longitude, data.location.latitude];
    return null;
  } catch (e) {
    console.error('[Shadow-Chaser] getPlaceCoords failed:', e);
    return null;
  }
}

// Fallback geocoder used when user types freely and never picks a suggestion
async function geocodeByText(query: string): Promise<[number, number] | null> {
  const suggestions = await fetchGoogleSuggestions(query);
  if (!suggestions.length) return null;
  return getPlaceCoords(suggestions[0].placeId);
}

async function reverseGeocodeByCoords(coords: [number, number]): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null;
  try {
    const [lng, lat] = coords;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=address,poi,place&limit=1&language=en&access_token=${MAPBOX_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.features?.[0]?.place_name ?? null;
  } catch {
    return null;
  }
}

interface RoutePanelProps {
  selectedTime: string;
  setSelectedTime: (time: string) => void;
  is3D: boolean;
  setIs3D: (val: boolean) => void;
  origin: LocationPoint;
  setOrigin: (p: LocationPoint) => void;
  destination: LocationPoint;
  setDestination: (p: LocationPoint) => void;
  routeOptions: RouteOption[];
  setRouteOptions: (routes: RouteOption[]) => void;
  selectedRouteId: string | null;
  onSelectRoute: (id: string | null) => void;
  nightLightScores: Record<string, number>;
  onRequestShadeScan: () => void;
  setUserLocationCoords: (coords: [number, number] | null) => void;
  onStartNavigation: () => void;
}

function timeStringToMinutes(time: string): number {
  const [hRaw, mRaw] = time.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (Number.isNaN(h) || Number.isNaN(m)) return 12 * 60;
  return Math.min(23 * 60 + 59, Math.max(0, h * 60 + m));
}

function minutesToTimeString(totalMinutes: number): string {
  const mins = Math.min(23 * 60 + 59, Math.max(0, totalMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatTimeDisplay(time: string): string {
  const mins = timeStringToMinutes(time);
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = h24 % 12 || 12;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function isNightFromTime(time: string): boolean {
  const mins = timeStringToMinutes(time);
  return mins >= 18 * 60 || mins < 6 * 60;
}


async function fetchWalkingDirectionsByPoints(points: [number, number][]): Promise<RouteData | null> {
  if (!MAPBOX_TOKEN) return null;
  const pathCoords = points.map((pt) => `${pt[0]},${pt[1]}`).join(';');
  const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${pathCoords}?steps=true&geometries=geojson&overview=full&language=en&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.routes?.length > 0) return data.routes[0] as RouteData;
  return null;
}

function buildPerpendicularWaypoint(
  origin: [number, number],
  dest: [number, number],
  offsetMeters: number
): [number, number] {
  const [lng1, lat1] = origin;
  const [lng2, lat2] = dest;
  const midLng = (lng1 + lng2) / 2;
  const midLat = (lat1 + lat2) / 2;

  const avgLatRad = ((lat1 + lat2) / 2) * Math.PI / 180;
  const metersPerLng = 111320 * Math.cos(avgLatRad);
  const metersPerLat = 110540;
  const dxMeters = (lng2 - lng1) * metersPerLng;
  const dyMeters = (lat2 - lat1) * metersPerLat;
  const length = Math.hypot(dxMeters, dyMeters) || 1;

  const perpXMeters = -dyMeters / length;
  const perpYMeters = dxMeters / length;

  const offsetLng = (perpXMeters * offsetMeters) / metersPerLng;
  const offsetLat = (perpYMeters * offsetMeters) / metersPerLat;

  return [midLng + offsetLng, midLat + offsetLat];
}

async function fetchThreePathOptions(
  origin: [number, number],
  dest: [number, number]
): Promise<RouteOption[]> {
  const detourMeters = 220;
  const waypointB = buildPerpendicularWaypoint(origin, dest, detourMeters);
  const waypointC = buildPerpendicularWaypoint(origin, dest, -detourMeters);

  const [routeA, routeB, routeC] = await Promise.all([
    fetchWalkingDirectionsByPoints([origin, dest]),
    fetchWalkingDirectionsByPoints([origin, waypointB, dest]),
    fetchWalkingDirectionsByPoints([origin, waypointC, dest])
  ]);

  const options: RouteOption[] = [];
  if (routeA) options.push({ id: 'A', label: 'Path A', route: routeA });
  if (routeB) options.push({ id: 'B', label: 'Path B', route: routeB });
  if (routeC) options.push({ id: 'C', label: 'Path C', route: routeC });
  return options;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

export default function RoutePanel({
  selectedTime,
  setSelectedTime,
  is3D,
  setIs3D,
  origin,
  setOrigin,
  destination,
  setDestination,
  routeOptions,
  setRouteOptions,
  selectedRouteId,
  onSelectRoute,
  nightLightScores,
  onRequestShadeScan,
  setUserLocationCoords,
  onStartNavigation
}: RoutePanelProps) {
  const [mobileSheetSnap, setMobileSheetSnap] = useState<'collapsed' | 'mid' | 'expanded'>('mid');
  const [sheetDragY, setSheetDragY] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  // Autocomplete state
  const [originSuggestions, setOriginSuggestions] = useState<PlaceSuggestion[]>([]);
  const [destSuggestions, setDestSuggestions]     = useState<PlaceSuggestion[]>([]);
  const [showOriginDrop, setShowOriginDrop] = useState(false);
  const [showDestDrop, setShowDestDrop]     = useState(false);
  const [resolvingOrigin, setResolvingOrigin] = useState(false);
  const [resolvingDest, setResolvingDest]     = useState(false);
  const [locatingMe, setLocatingMe] = useState(false);

  const originDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destDebounce   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStartYRef = useRef<number | null>(null);
  const timeSelectorRef = useRef<HTMLDivElement | null>(null);

  const isNight = isNightFromTime(selectedTime);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const coolZonesStores = [
    {
      id: 's1',
      name: '7‑Eleven Taft',
      category: 'Convenience store',
      icon: <ShoppingBag size={16} />,
      rating: 4.6,
      walkMinutes: 3,
      shade: 'Medium',
      status: 'Open',
      tags: ['Airconditioned', 'Water', 'Safe at Night']
    },
    {
      id: 's2',
      name: 'Cafe Luntian',
      category: 'Cafe',
      icon: <Coffee size={16} />,
      rating: 4.8,
      walkMinutes: 6,
      shade: 'High',
      status: 'Open',
      tags: ['Airconditioned', 'Shade']
    },
    {
      id: 's3',
      name: 'SM Aura Mall',
      category: 'Mall',
      icon: <Store size={16} />,
      rating: 4.7,
      walkMinutes: 9,
      shade: 'High',
      status: 'Open',
      tags: ['Airconditioned', 'Shade', 'Safe at Night']
    },
    {
      id: 's4',
      name: 'Rainforest Water Hub',
      category: 'Water station',
      icon: <Droplet size={16} />,
      rating: 4.4,
      walkMinutes: 4,
      shade: 'Low',
      status: 'Open',
      tags: ['Water']
    },
    {
      id: 's5',
      name: 'Sheltered Waiting Shed',
      category: 'Shade stop',
      icon: <TreeDeciduous size={16} />,
      rating: 4.2,
      walkMinutes: 2,
      shade: 'Very High',
      status: 'Open',
      tags: ['Shade', 'Safe at Night']
    }
  ];

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) => prev.includes(filter) ? prev.filter((value) => value !== filter) : [...prev, filter]);
  };

  const filteredStores = activeFilters.length > 0
    ? coolZonesStores.filter((store) => store.tags.some((tag) => activeFilters.includes(tag)))
    : coolZonesStores;

  const nextCoolStop = filteredStores[0] ?? coolZonesStores[0];
  const coolStopMessage = nextCoolStop
    ? `High heat ahead. Cooling stop available in ${nextCoolStop.walkMinutes}m.`
    : 'No cooling stops found along your route yet.';

  const handleOriginChange = useCallback((value: string) => {
    setOrigin({ text: value, coords: null });
    setUserLocationCoords(null);
    setShowOriginDrop(true);
    if (originDebounce.current) clearTimeout(originDebounce.current);
    if (value.trim().length < 2) { setOriginSuggestions([]); return; }
    originDebounce.current = setTimeout(async () => {
      const results = await fetchGoogleSuggestions(value);
      setOriginSuggestions(results);
    }, 350);
  }, [setOrigin, setUserLocationCoords]);

  const handleDestChange = useCallback((value: string) => {
    setDestination({ text: value, coords: null });
    setShowDestDrop(true);
    if (destDebounce.current) clearTimeout(destDebounce.current);
    if (value.trim().length < 2) { setDestSuggestions([]); return; }
    destDebounce.current = setTimeout(async () => {
      const results = await fetchGoogleSuggestions(value);
      setDestSuggestions(results);
    }, 350);
  }, [setDestination]);

  const selectOrigin = async (suggestion: PlaceSuggestion) => {
    setOriginSuggestions([]);
    setShowOriginDrop(false);
    setOrigin({ text: suggestion.mainText, coords: null });
    setResolvingOrigin(true);
    const coords = await getPlaceCoords(suggestion.placeId);
    setResolvingOrigin(false);
    setOrigin({ text: suggestion.mainText, coords });
    setUserLocationCoords(null);
  };

  const selectDest = async (suggestion: PlaceSuggestion) => {
    setDestSuggestions([]);
    setShowDestDrop(false);
    setDestination({ text: suggestion.mainText, coords: null });
    setResolvingDest(true);
    const coords = await getPlaceCoords(suggestion.placeId);
    setResolvingDest(false);
    setDestination({ text: suggestion.mainText, coords });
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTime(minutesToTimeString(parseInt(e.target.value, 10)));
  };

  const handleTimePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTime(e.target.value);
  };

  const handleSetNow = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setSelectedTime(`${hh}:${mm}`);
  };

  const sliderValue = timeStringToMinutes(selectedTime);
  const isMobileViewport = () => window.innerWidth < 768;

  const settleSheetForKeyboard = () => {
    if (!isMobileViewport()) return;
    setMobileSheetSnap('mid');
    setSheetDragY(0);
  };

  const dismissMobileKeyboard = (input: HTMLInputElement) => {
    input.blur();
    if (isMobileViewport()) {
      // Some mobile browsers need a tiny delay before viewport reflows.
      setTimeout(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }, 0);
    }
  };

  const getSnapOffsetPercent = (snap: 'collapsed' | 'mid' | 'expanded') => {
    if (snap === 'collapsed') return 82;
    if (snap === 'expanded') return 0;
    return 42;
  };

  const clampDragY = (value: number) => Math.max(-220, Math.min(220, value));
  const mobileSheetTransform = `translateY(calc(${getSnapOffsetPercent(mobileSheetSnap)}% + ${sheetDragY}px))`;

  const shiftSheetUp = () => {
    setMobileSheetSnap((prev) => {
      if (prev === 'collapsed') return 'mid';
      if (prev === 'mid') return 'expanded';
      return 'expanded';
    });
  };

  const shiftSheetDown = () => {
    setMobileSheetSnap((prev) => {
      if (prev === 'expanded') return 'mid';
      if (prev === 'mid') return 'collapsed';
      return 'collapsed';
    });
  };

  const handleSheetTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (window.innerWidth >= 768) return;
    dragStartYRef.current = e.touches[0].clientY;
    setSheetDragY(0);
  };

  const handleSheetTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (window.innerWidth >= 768 || dragStartYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - dragStartYRef.current;
    setSheetDragY(clampDragY(delta));
  };

  const handleSheetTouchEnd = () => {
    if (window.innerWidth >= 768 || dragStartYRef.current === null) {
      dragStartYRef.current = null;
      setSheetDragY(0);
      return;
    }
    if (sheetDragY <= -40) shiftSheetUp();
    if (sheetDragY >= 40) shiftSheetDown();
    dragStartYRef.current = null;
    setSheetDragY(0);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }

    setError(null);
    setLocatingMe(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords: [number, number] = [
          position.coords.longitude,
          position.coords.latitude
        ];
        const resolvedText = await reverseGeocodeByCoords(coords);
        setOrigin({
          text: resolvedText ?? 'My Current Location',
          coords
        });
        setUserLocationCoords(coords);
        setLocatingMe(false);
      },
      (geoError) => {
        console.error('[Shadow-Chaser] Geolocation error:', {
          code: geoError.code,
          message: geoError.message
        });
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError('Location permission denied. Please allow location access.');
        } else if (geoError.code === geoError.TIMEOUT) {
          setError('Could not get your location in time. Please try again.');
        } else {
          setError('Failed to get your current location.');
        }
        setLocatingMe(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleFindRoute = async () => {
    if (!destination.text.trim()) return;
    setError(null);
    onSelectRoute(null);
    setRouteOptions([]);
    setShowSteps(false);
    setIsLoading(true);

    try {
      let originCoords = origin.coords;
      if (!originCoords && origin.text) {
        originCoords = await geocodeByText(origin.text);
        if (originCoords) setOrigin({ ...origin, coords: originCoords });
      }

      let destCoords = destination.coords;
      if (!destCoords && destination.text) {
        destCoords = await geocodeByText(destination.text);
        if (destCoords) setDestination({ ...destination, coords: destCoords });
      }

      if (!originCoords) { setError('Could not find the origin location.'); return; }
      if (!destCoords) { setError('Could not find the destination location.'); return; }

      const options = await fetchThreePathOptions(originCoords, destCoords);
      if (options.length === 0) { setError('No walking routes found between these locations.'); return; }

      setRouteOptions(options);
      onRequestShadeScan();
      setShowSteps(true);
    } catch {
      setError('Failed to fetch directions. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedOption = routeOptions.find(o => o.id === selectedRouteId) || routeOptions[0];
  const primaryRoute = selectedOption?.route;
  const rankedRouteOptions = [...routeOptions].sort((a, b) => {
    if (isNight) {
      const lightA = nightLightScores[a.id] ?? 0;
      const lightB = nightLightScores[b.id] ?? 0;
      if (lightA !== lightB) return lightB - lightA;
    } else {
      const shadeA = a.intensityScore ?? 999;
      const shadeB = b.intensityScore ?? 999;
      if (shadeA !== shadeB) return shadeA - shadeB;
    }
    return a.id.localeCompare(b.id);
  });

  const estimateHeatIndex = (baseTime: string): number => {
    const mins = timeStringToMinutes(baseTime);
    const normalized = Math.sin(((mins - 360) / 720) * Math.PI);
    return Math.round(32 + Math.max(0, normalized) * 8 + (isNight ? -2 : 0));
  };

  const formatHeatExposure = (score: number | null) => {
    if (score === null) return 'Moderate';
    if (score > 70) return 'Extreme';
    if (score > 45) return 'High';
    return 'Low';
  };

  const computeSafetyScore = (option: RouteOption) => {
    const shade = option.intensityScore ?? 50;
    const durationFactor = Math.max(0, Math.min(1, 1 - option.route.duration / 1800));
    return Math.min(100, Math.round(55 + (100 - shade) * 0.3 + durationFactor * 25));
  };

  const fastestRoute = routeOptions.reduce<RouteOption | null>((best, option) => {
    if (!best || option.route.duration < best.route.duration) return option;
    return best;
  }, null);

  const coolerRoute = routeOptions.reduce<RouteOption | null>((best, option) => {
    if (!best) return option;
    if ((option.intensityScore ?? 999) < (best.intensityScore ?? 999)) return option;
    return best;
  }, null);

  const saferRoute = routeOptions.reduce<RouteOption | null>((best, option) => {
    if (!best) return option;
    return computeSafetyScore(option) > computeSafetyScore(best) ? option : best;
  }, null);

  const heatIndex = estimateHeatIndex(selectedTime);
  const weatherSummary = routeOptions.length > 0 ? 'Expect bright sun with humid Manila air, ideal for shaded walking corridors.' : 'Select your route to see personalized comfort insights.';

  const handleChooseCoolerRoute = () => {
    if (coolerRoute) onSelectRoute(coolerRoute.id);
  };

  const routeInputs = (
    <div className="input-group route-inputs-group">
      {/* Point A */}
      <div className="mobile-origin-row">
        <div className="autocomplete-wrapper mobile-origin-input-wrap">
          <div className="location-input">
            <MapPin size={18} color="var(--accent-cool)" />
            <input
              type="text"
              placeholder="Point A – Origin"
              value={origin.text}
              onChange={(e) => handleOriginChange(e.target.value)}
              onFocus={() => {
                settleSheetForKeyboard();
                if (originSuggestions.length > 0) setShowOriginDrop(true);
              }}
              onBlur={() => setTimeout(() => setShowOriginDrop(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowOriginDrop(false);
                  return;
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  setShowOriginDrop(false);
                  dismissMobileKeyboard(e.currentTarget);
                }
              }}
              enterKeyHint="next"
              autoComplete="off"
            />
            {resolvingOrigin && <Loader2 size={13} className="spin coords-loader" />}
          </div>
          {showOriginDrop && originSuggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {originSuggestions.map((s) => (
                <div
                  key={s.placeId}
                  className="suggestion-item"
                  onMouseDown={(e) => { e.preventDefault(); selectOrigin(s); }}
                >
                  <Search size={13} className="suggestion-icon" />
                  <div className="suggestion-text">
                    <span className="suggestion-name">{s.mainText}</span>
                    {s.secondaryText && (
                      <span className="suggestion-address">{s.secondaryText}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="mobile-inline-location-btn"
          onClick={handleUseMyLocation}
          disabled={locatingMe}
          title="Use my location"
          aria-label="Use my location"
        >
          {locatingMe ? <Loader2 size={16} className="spin" /> : <LocateFixed size={16} />}
        </button>
      </div>

      {/* Point B */}
      <div className="autocomplete-wrapper">
        <div className="location-input">
          <Navigation size={18} color={isNight ? 'var(--accent-night)' : 'var(--accent-hot)'} />
          <input
            type="text"
            placeholder="Point B – Destination"
            value={destination.text}
            onChange={(e) => handleDestChange(e.target.value)}
            onFocus={() => {
              settleSheetForKeyboard();
              if (destSuggestions.length > 0) setShowDestDrop(true);
            }}
            onBlur={() => setTimeout(() => setShowDestDrop(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowDestDrop(false);
              if (e.key === 'Enter') {
                e.preventDefault();
                setShowDestDrop(false);
                dismissMobileKeyboard(e.currentTarget);
                settleSheetForKeyboard();
              }
            }}
            enterKeyHint="search"
            autoComplete="off"
          />
          {resolvingDest && <Loader2 size={13} className="spin coords-loader" />}
        </div>
        {showDestDrop && destSuggestions.length > 0 && (
          <div className="suggestions-dropdown">
            {destSuggestions.map((s) => (
              <div
                key={s.placeId}
                className="suggestion-item"
                onMouseDown={(e) => { e.preventDefault(); selectDest(s); }}
              >
                <Search size={13} className="suggestion-icon" />
                <div className="suggestion-text">
                  <span className="suggestion-name">{s.mainText}</span>
                  {s.secondaryText && (
                    <span className="suggestion-address">{s.secondaryText}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className={`mobile-top-fields glass-panel ${isNight ? 'night-theme' : ''}`}>
        {routeInputs}
      </div>
      <div
        className={`assistant-sidebar glass-panel ${isNight ? 'night-theme' : ''}`}
        style={{ ['--mobile-sheet-transform' as string]: mobileSheetTransform } as React.CSSProperties}
      >
        <div
          className="pull-tab"
          onClick={() => setMobileSheetSnap((prev) => (prev === 'collapsed' ? 'mid' : 'collapsed'))}
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
        ></div>

      <div className="app-header">
        <div className="header-left">
          {/* {isNight
            ? <MoonStar className="header-icon" size={28} color="var(--accent-night)" />
            : <ThermometerSun className="header-icon" size={28} color="var(--accent-hot)" />} */}
          <img src={lakadLogo} alt="LakadPH" className="app-logo" />
        </div>
        <button
          className="toggle-btn"
          onClick={(e) => { e.stopPropagation(); setIs3D(!is3D); }}
          title="Toggle 2D / 3D Map View"
        >
          {is3D ? <><Layers size={16} /> 2D</> : <><Box size={16} /> 3D</>}
        </button>
      </div>

      <div className="sheet-scroll-content">

        {/* Dev warning if Google key is missing */}
        {!GOOGLE_KEY && (
          <div className="error-alert" style={{ fontSize: '0.78rem' }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span><strong>VITE_GOOGLE_PLACES_KEY</strong> not found. Add it to <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: 3 }}>.env</code> and restart the dev server.</span>
          </div>
        )}

        {/* Origin / Destination Inputs (desktop only) */}
        <div className="desktop-route-inputs">
          {routeInputs}
        </div>

        {/* Time Simulator */}
        <div className="time-selector" ref={timeSelectorRef}>
          <div className="time-header">
            <span className="time-label"><Clock size={14} /> Departure Time</span>
            <span className="time-value">{formatTimeDisplay(selectedTime)}</span>
          </div>
          <input
            type="range"
            min="0" max="1439" step="1"
            value={sliderValue}
            onChange={handleSliderChange}
          />
          <div className="time-ticks-row">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:59</span>
          </div>
          <div className="time-controls-row">
            <input
              type="time"
              className="time-picker-input"
              value={selectedTime}
              onChange={handleTimePickerChange}
            />
            <button
              type="button"
              className="now-time-btn"
              onClick={handleSetNow}
              title="Set departure time to now"
            >
              Now
            </button>
          </div>
        </div>

        <div className="travel-nudge-panel">
          <div className="weather-card glass-panel">
            <div className="weather-card-meta">
              <div>
                <div className="weather-label">Heat-aware routing</div>
                <div className="weather-title">Weather & comfort summary</div>
              </div>
              <div className="weather-icon"><Sun size={24} /></div>
            </div>
            <div className="weather-details">
              <div className="weather-temp">{heatIndex}°C</div>
              <div className="weather-subtle">Heat index</div>
              <div className="weather-text">{weatherSummary}</div>
            </div>
            <div className="weather-metrics-row">
              <div className="weather-metric">
                <span className="weather-metric-value">{formatHeatExposure(coolerRoute?.intensityScore ?? null)}</span>
                <span className="weather-metric-label">Heat exposure</span>
              </div>
              <div className="weather-metric">
                <span className="weather-metric-value">{coolerRoute ? `${Math.max(0, 100 - Math.round(coolerRoute.intensityScore ?? 50))}%` : '--'}</span>
                <span className="weather-metric-label">Best shade</span>
              </div>
              <div className="weather-metric">
                <span className="weather-metric-value">{saferRoute ? computeSafetyScore(saferRoute) : '--'}</span>
                <span className="weather-metric-label">Safety score</span>
              </div>
            </div>
          </div>

          <div className="suggestion-cards">
            <div className="suggestion-card">
              <div className="suggestion-icon suggestion-icon-cool"><TreeDeciduous size={18} /></div>
              <div>
                <div className="suggestion-title">Leave 20 mins later for 45% more shade</div>
                <div className="suggestion-copy">Shaded routes are cooler and more comfortable for afternoon walking.</div>
              </div>
            </div>
            <div className="suggestion-card suggestion-card-warm">
              <div className="suggestion-icon suggestion-icon-warm"><Sun size={18} /></div>
              <div>
                <div className="suggestion-title">This route avoids extreme heat exposure</div>
                <div className="suggestion-copy">AI selects the most sheltered corridors based on current sunlight patterns.</div>
              </div>
            </div>
            <div className="suggestion-card suggestion-card-blue">
              <div className="suggestion-icon suggestion-icon-blue"><ShieldCheck size={18} /></div>
              <div>
                <div className="suggestion-title">Walking + LRT is faster today</div>
                <div className="suggestion-copy">A transit-assisted option saves time while keeping the walk comfortable.</div>
              </div>
            </div>
          </div>

          {routeOptions.length > 0 && (
            <div className="route-comparison-grid">
              {[
                { title: 'Fastest Route', option: fastestRoute, accent: 'fast' },
                { title: 'Cooler Route', option: coolerRoute, accent: 'cool' },
                { title: 'Safer Route', option: saferRoute, accent: 'safe' }
              ].map((entry) => (
                <div key={entry.title} className="comparison-card">
                  <div className="comparison-card-header">
                    <span>{entry.title}</span>
                    <span className={`comparison-pill comparison-pill-${entry.accent}`}>{entry.option?.label ?? 'N/A'}</span>
                  </div>
                  <div className="comparison-stats-row">
                    <div className="comparison-stat">
                      <span className="comparison-value">{entry.option ? formatDuration(entry.option.route.duration) : '--'}</span>
                      <span className="comparison-label">ETA</span>
                    </div>
                    <div className="comparison-stat">
                      <span className="comparison-value">{entry.option ? `${Math.max(0, 100 - Math.round(entry.option.intensityScore ?? 50))}%` : '--'}</span>
                      <span className="comparison-label">Shade</span>
                    </div>
                  </div>
                  <div className="comparison-stats-row">
                    <div className="comparison-stat">
                      <span className="comparison-value">{entry.option ? formatHeatExposure(entry.option.intensityScore ?? null) : '--'}</span>
                      <span className="comparison-label">Heat</span>
                    </div>
                    <div className="comparison-stat">
                      <span className="comparison-value">{entry.option ? computeSafetyScore(entry.option) : '--'}</span>
                      <span className="comparison-label">Safety</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button type="button" className="choose-cooler-btn action-button" onClick={handleChooseCoolerRoute}>
            <Sun size={16} /> Choose Cooler Route
          </button>
        </div>

        {/* This function was created using Generative AI */}
        {/* Find Route Button */}
        <button
          className={`action-button ${isNight ? 'night-mode' : ''}`}
          onClick={handleFindRoute}
          disabled={isLoading || !destination.text.trim()}
        >
          {isLoading
            ? <><Loader2 size={16} className="spin" /> Routing…</>
            : 'Find Routes'}
        </button>
        <hr className="route-content-divider route-button-divider" />

        {error && (
          <div className="error-alert">
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        {routeOptions.length > 0 && (

          <div>
            <div className="route-summary">
            <div className="route-options-list">
              {rankedRouteOptions.map((option, idx) => {
                  const isSelected = option.id === selectedRouteId;
                  const isCoolest = idx === 0;
                  const shadePercentage = option.intensityScore !== undefined ? 100 - option.intensityScore : null;
                  const lightScore = nightLightScores[option.id] ?? null;
                  const routeColor = idx === 0 ? '#0098d9' : (idx === 1 ? '#facc15' : '#ea4335');
                  
                  return (
                    <div 
                      key={option.id} 
                      className={`route-option-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => onSelectRoute(option.id)}
                      style={{ cursor: 'pointer', ['--route-color' as string]: routeColor } as React.CSSProperties}
                    >
                      <div className="route-option-main">
                        {isCoolest && (
                          <span className="route-coolest-text">
                            {isNight ? '💡 Most Illuminated' : '🧊 Most Shaded Path'}
                          </span>
                        )}
                      </div>

                      <div className="route-summary-row">
                        <div className="summary-item">
                          <span className="summary-value route-name-value">{option.label}</span>
                          <span className="summary-label">route</span>
                        </div>
                        <div className="summary-divider" />
                        <div className="summary-item">
                          <span className="summary-value">{formatDistance(option.route.distance)}</span>
                          <span className="summary-label">distance</span>
                        </div>
                        <div className="summary-divider" />
                        <div className="summary-item">
                          <span className="summary-value">{formatDuration(option.route.duration)}</span>
                          <span className="summary-label">walk time</span>
                        </div>
                        {(isNight ? lightScore !== null : shadePercentage !== null) && (
                          <>
                            <div className="summary-divider" />
                            <div className="summary-item">
                              <span className="summary-value">{isNight ? `${lightScore}%` : `${shadePercentage}%`}</span>
                              <span className="summary-label">{isNight ? 'light score' : 'shade'}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {routeOptions.length > 0 && (
              <div className="navigation-trigger-area">
                <button 
                  className="start-nav-btn shadowed"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartNavigation();
                  }}
                >
                  <Navigation size={18} fill="currentColor" />
                  <span>Start Now</span>
                </button>
              </div>
            )}

            {primaryRoute?.legs[0]?.steps && <hr className="route-content-divider" />}

            <button
              className="steps-toggle-btn"
              onClick={() => setShowSteps(!showSteps)}
            >
              <span>Turn-by-turn directions (Path A)</span>
              {showSteps ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {showSteps && primaryRoute?.legs[0]?.steps && (
              <div className="steps-list">
                {primaryRoute.legs[0].steps.map((step, idx) => (
                  <div key={idx} className="step-item">
                    <div className="step-info">
                      <span className="step-instruction">{step.maneuver.instruction}</span>
                      {step.distance > 0 && (
                        <span className="step-distance">{formatDistance(step.distance)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

            <div className="cool-zones-panel">
              <div className="cool-suggestion-popup glass-panel">
                <span className="cool-popup-label">Cool Zone Alert</span>
                <span className="cool-popup-message">{coolStopMessage}</span>
              </div>

              <div className="filter-pill-row">
                {['Airconditioned', 'Water', 'Shade', 'Safe at Night'].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={`filter-pill ${activeFilters.includes(filter) ? 'active' : ''}`}
                    onClick={() => toggleFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="store-list">
                {filteredStores.map((store) => (
                  <div key={store.id} className="store-card glass-panel">
                    <div className="store-card-header">
                      <div className="store-card-icon">{store.icon}</div>
                      <div>
                        <div className="store-title">{store.name}</div>
                        <div className="store-category">{store.category}</div>
                      </div>
                    </div>
                    <div className="store-card-meta">
                      <div className="store-badge">{store.status}</div>
                      <div className="store-rating">{store.rating} ★</div>
                    </div>
                    <div className="store-card-stats">
                      <div className="store-metric">
                        <span className="store-metric-value">{store.walkMinutes} min</span>
                        <span className="store-metric-label">walk</span>
                      </div>
                      <div className="store-metric">
                        <span className="store-metric-value">{store.shade}</span>
                        <span className="store-metric-label">shade</span>
                      </div>
                      <div className="store-metric">
                        <span className="store-metric-value">{store.tags.join(' • ')}</span>
                        <span className="store-metric-label">amenities</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" className="continue-route-btn action-button">
                <Navigation size={16} /> Continue route after resting
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
