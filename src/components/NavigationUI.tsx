import { 
  X,
  ArrowUp,
  ArrowUpRight,
  ArrowUpLeft,
  CornerUpRight,
  CornerUpLeft,
  MapPin
} from 'lucide-react';
import type { RouteOption } from '../types';

interface NavigationUIProps {
  activeRoute: RouteOption;
  activeStepIndex: number;
  distanceToNextStep: number;
  remainingDistance: number;
  remainingDuration: number;
  isStuck: boolean;
  onExit: () => void;
}

const getManeuverIcon = (type: string, modifier?: string) => {
  if (type === 'arrive') return <MapPin size={32} />;
  if (type === 'depart') return <ArrowUp size={32} />;
  
  const isLeft = modifier?.includes('left');
  const isRight = modifier?.includes('right');
  const isSlight = modifier?.includes('slight');

  if (isLeft) {
    if (isSlight) return <ArrowUpLeft size={32} />;
    return <CornerUpLeft size={32} />;
  }
  if (isRight) {
    if (isSlight) return <ArrowUpRight size={32} />;
    return <CornerUpRight size={32} />;
  }
  
  return <ArrowUp size={32} />;
};

export default function NavigationUI({
  activeRoute,
  activeStepIndex,
  distanceToNextStep,
  remainingDistance,
  remainingDuration,
  onExit
}: NavigationUIProps) {
  const steps = activeRoute.route.legs[0].steps;
  const currentStep = steps[activeStepIndex] || steps[steps.length - 1];
  
  const formatDistance = (m: number) => {
    if (m < 1000) return `${Math.round(m)}m`;
    return `${(m / 1000).toFixed(1)}km`;
  };

  const formatTime = (s: number) => {
    const mins = Math.ceil(s / 60);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const eta = new Date(Date.now() + remainingDuration * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="nav-overlay-container">
      <div className="nav-top-card glass-panel-heavy animate-slide-down">
        <div className="maneuver-section">
          <div className="maneuver-icon-container">
            {getManeuverIcon(currentStep.maneuver.type, currentStep.maneuver.modifier)}
          </div>
          <div className="maneuver-text">
            <div className="maneuver-distance">{formatDistance(distanceToNextStep)}</div>
            <div className="maneuver-instruction">{currentStep.maneuver.instruction}</div>
          </div>
        </div>
        <button className="nav-exit-btn" onClick={onExit} aria-label="Exit navigation">
          <X size={20} />
        </button>
      </div>

      <div className="nav-bottom-bar glass-panel-heavy animate-slide-up">
        <div className="nav-stat-item">
          <span className="nav-stat-value">{formatTime(remainingDuration)}</span>
          <span className="nav-stat-label">TIME</span>
        </div>
        <div className="nav-stat-divider" />
        <div className="nav-stat-item main">
          <span className="nav-stat-value">{eta}</span>
          <span className="nav-stat-label">ETA</span>
        </div>
        <div className="nav-stat-divider" />
        <div className="nav-stat-item">
          <span className="nav-stat-value">{formatDistance(remainingDistance)}</span>
          <span className="nav-stat-label">DISTANCE</span>
        </div>
      </div>
    </div>
  );
}
