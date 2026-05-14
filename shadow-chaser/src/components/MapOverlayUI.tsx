import React, { useState } from 'react';
import { TreeDeciduous, Wind, Droplets } from 'lucide-react';
import MapToggles from './MapToggles';
import './MapOverlayUI.css';

interface MapOverlayUIProps {
  isNightMode: boolean;
  onToggleNightMode: (night: boolean) => void;
  toggles: {
    shade: boolean;
    coolZones: boolean;
    hazards: boolean;
    safeStreets: boolean;
  };
  onToggle: (key: string) => void;
}

const MapOverlayUI: React.FC<MapOverlayUIProps> = ({ isNightMode, onToggleNightMode, toggles, onToggle }) => {
  const [showCoolZoneDetails, setShowCoolZoneDetails] = useState(true);

  return (
    <div className="map-overlay-container">
      {/* Toggles Panel */}
      <div className="map-toggles-panel glass-panel">
        <MapToggles 
          isNightMode={isNightMode} 
          onToggleNightMode={onToggleNightMode} 
          toggles={toggles} 
          onToggle={onToggle} 
        />
      </div>

      {/* Cool Zone Card */}
      {toggles.coolZones && showCoolZoneDetails && (
        <div className="cool-zone-card glass-panel">
          <div className="cz-header">
            <h3>Rizal Park</h3>
            <button className="cz-close" onClick={() => setShowCoolZoneDetails(false)}>×</button>
          </div>
          <div className="cz-subtitle">3 min away (200 m)</div>
          <div className="cz-tags">
            <span className="cz-tag shade"><TreeDeciduous size={12}/> High Shade</span>
            <span className="cz-tag rest"><Wind size={12}/> Rest Area</span>
            <span className="cz-tag water"><Droplets size={12}/> Water Station</span>
          </div>
          <div className="cz-image-placeholder">
            <div className="cz-image-gradient"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapOverlayUI;
