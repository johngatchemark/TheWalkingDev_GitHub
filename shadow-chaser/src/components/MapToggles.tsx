import React from 'react';
import { TreeDeciduous, Wind, AlertTriangle, ShieldCheck, Sun, Moon } from 'lucide-react';
import './MapToggles.css';

interface MapTogglesProps {
  isNightMode: boolean;
  onToggleNightMode: (night: boolean) => void;
  toggles: {
    shade: boolean;
    coolZones: boolean;
    hazards: boolean;
    safeStreets: boolean;
  };
  onToggle: (key: string) => void;
  layout?: 'vertical' | 'horizontal';
}

const MapToggles: React.FC<MapTogglesProps> = ({ 
  isNightMode, 
  onToggleNightMode, 
  toggles, 
  onToggle,
  layout = 'vertical'
}) => {
  return (
    <div className={`map-toggles-content ${layout}`}>
      <div className="toggle-item">
        <TreeDeciduous size={18} color="#22c55e" />
        <span className="toggle-label">Shade</span>
        <label className="switch">
          <input type="checkbox" checked={toggles.shade} onChange={() => onToggle('shade')} />
          <span className="slider round"></span>
        </label>
      </div>
      <div className="toggle-item">
        <Wind size={18} color="#3b82f6" />
        <span className="toggle-label">Cool Zones</span>
        <label className="switch">
          <input type="checkbox" checked={toggles.coolZones} onChange={() => onToggle('coolZones')} />
          <span className="slider round"></span>
        </label>
      </div>
      <div className="toggle-item">
        <AlertTriangle size={18} color="#ef4444" />
        <span className="toggle-label">Hazards</span>
        <label className="switch">
          <input type="checkbox" checked={toggles.hazards} onChange={() => onToggle('hazards')} />
          <span className="slider round"></span>
        </label>
      </div>
      <div className="toggle-item">
        <ShieldCheck size={18} color="#10b981" />
        <span className="toggle-label">Safe Streets</span>
        <label className="switch">
          <input type="checkbox" checked={toggles.safeStreets} onChange={() => onToggle('safeStreets')} />
          <span className="slider round"></span>
        </label>
      </div>

      <div className="mode-toggles">
        <button className={`mode-btn ${!isNightMode ? 'active-day' : ''}`} onClick={() => onToggleNightMode(false)}>
          <Sun size={16} /> Day
        </button>
        <button className={`mode-btn ${isNightMode ? 'active-night' : ''}`} onClick={() => onToggleNightMode(true)}>
          <Moon size={16} /> Night
        </button>
      </div>
    </div>
  );
};

export default MapToggles;
