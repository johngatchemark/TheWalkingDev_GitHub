export interface RouteStep {
  maneuver: {
    instruction: string;
    type: string;
    modifier?: string;
    location: [number, number];
  };
  distance: number;
  duration: number;
  name: string;
}

export interface RouteLeg {
  steps: RouteStep[];
  distance: number;
  duration: number;
  summary: string;
}

export interface RouteData {
  geometry: {
    type: 'LineString';
    coordinates: number[][];
  };
  legs: RouteLeg[];
  distance: number;
  duration: number;
}

export interface RouteOption {
  id: string;
  label: string;
  route: RouteData;
  intensityScore?: number; // 0 (cool/shade) to 100 (direct sun)
  sunSegments?: number;    // Count of sample points found in the sun
}

export interface LocationPoint {
  text: string;
  coords: [number, number] | null;
}

export interface NavigationState {
  isNavigating: boolean;
  startTime: string | null;
  activeStepIndex: number;
  remainingDistance: number;
  remainingDuration: number;
  isStuck: boolean;
  lastRecalculatedAt: number | null;
}
