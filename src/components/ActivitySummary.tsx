import React from 'react';
import { MapPin, Clock, Zap, Flame, X } from 'lucide-react';

const ActivitySummary: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  // Mock data - simplified like Strava
  const walkData = {
    title: "Walk Completed",
    subtitle: "España Blvd to UST Manila",
    date: "May 9, 2026",
    time: "2:30 PM",
    distance: "2.8 km",
    duration: "34 mins",
    pace: "12:08 /km",
    calories: 186,
    elevation: "+12 m"
  };

  return (
    <div className="activity-summary">
      <div className="summary-header">
        <h1 className="summary-title">{walkData.title}</h1>
        <p className="summary-subtitle">{walkData.subtitle}</p>
        <p className="summary-datetime">{walkData.date} • {walkData.time}</p>
      </div>

      <div className="map-card">
        <div className="map-preview">
          <div className="map-placeholder">
            <div className="route-line"></div>
            <div className="start-pin">📍</div>
            <div className="end-pin">🏁</div>
            <div className="shade-overlay"></div>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <MapPin size={24} />
            <div className="stat-value">{walkData.distance}</div>
            <div className="stat-label">Distance</div>
          </div>
          <div className="stat-card">
            <Clock size={24} />
            <div className="stat-value">{walkData.duration}</div>
            <div className="stat-label">Time</div>
          </div>
          <div className="stat-card">
            <Zap size={24} />
            <div className="stat-value">{walkData.pace}</div>
            <div className="stat-label">Avg Pace</div>
          </div>
          <div className="stat-card">
            <Flame size={24} />
            <div className="stat-value">{walkData.calories}</div>
            <div className="stat-label">Calories</div>
          </div>
        </div>
      </div>

      <div className="bottom-section">
        <button className="close-button" onClick={onClose}>
          <X size={20} />
          Close
        </button>
      </div>
    </div>
  );
};

export default ActivitySummary;