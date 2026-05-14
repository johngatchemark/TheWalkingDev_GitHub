import React, { useState } from 'react';
import './MmdaDashboard.css';
import { 
  Home,
  Map as MapIcon, 
  CloudRain,
  ShieldAlert,
  ClipboardList,
  Activity,
  Layers,
  ChevronDown,
  X,
  Sun,
  AlertTriangle,
  Clipboard,
  MapPin
} from 'lucide-react';
import type { RouteOption } from '../types';

interface MmdaDashboardProps {
  onClose: () => void;
  routeOptions: RouteOption[];
  selectedRouteId: string | null;
  isNight: boolean;
  nightLightScores: Record<string, number>;
}

const MmdaDashboard: React.FC<MmdaDashboardProps> = ({ 
  onClose, 
  routeOptions, 
  selectedRouteId, 
  isNight, 
  nightLightScores 
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Derive some "live" data from the app state
  const currentRoute = routeOptions.find(r => r.id === selectedRouteId) || routeOptions[0];
  
  // Calculate Heat Exposure based on route intensity scores
  const avgIntensity = routeOptions.length > 0 
    ? routeOptions.reduce((acc, r) => acc + (r.intensityScore || 0), 0) / routeOptions.length 
    : 0;
  
  const heatStatus = avgIntensity > 60 ? 'High' : avgIntensity > 30 ? 'Moderate' : 'Low';
  const heatColor = heatStatus === 'High' ? 'highlight-danger' : heatStatus === 'Moderate' ? 'highlight-warning' : 'highlight-success';

  // Calculate Unsafe Zones (Mock based on night light scores or hazards)
  const lowLightRoutes = Object.values(nightLightScores).filter(s => s < 70).length;
  const unsafeCount = 12 + lowLightRoutes;

  // Mock insights based on current focus
  const insights = [
    { title: "Areas needing more trees", description: "High heat detected along Taft Ave and Recto.", priority: "High" },
    { title: "Streets needing better lighting", description: "Low illumination scores reported near Dapitan.", priority: "Medium" },
    { title: "Frequent sidewalk obstruction", description: "Multiple reports near university entrances.", priority: "High" },
    { title: "High pedestrian traffic", description: "Peak flow detected 12PM-2PM and 5PM-7PM.", priority: "Info" }
  ];

  return (
    <div className="mmda-dashboard">
      <div className="dashboard-overlay" onClick={onClose}></div>
      
      <div className="dashboard-container">
        {/* Sidebar */}
        <div className="dashboard-sidebar">
          <div className="sidebar-header">
            <h2>City Dashboard</h2>
          </div>
          <nav className="sidebar-nav">
            <button className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              <Home size={18} /> Overview
            </button>
            <button className={`nav-item ${activeTab === 'heat' ? 'active' : ''}`} onClick={() => setActiveTab('heat')}>
              <MapIcon size={18} /> Heat Map
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="dashboard-main">
          <div className="main-header">
            <div className="header-filters">
              <button className="filter-btn">
                All Districts <ChevronDown size={14} />
              </button>
              <button className="filter-btn">
                This Month <ChevronDown size={14} />
              </button>
            </div>
            <button className="close-btn" onClick={onClose}>
              <X size={24} />
            </button>
          </div>

          <div className="kpi-row">
            <div className="kpi-card glass-card">
              <div className="kpi-content">
                <div>
                  <div className="kpi-label">Heat Exposure</div>
                  <div className={`kpi-value ${heatColor}`}>{heatStatus}</div>
                  <div className="kpi-subtext">Based on active routes</div>
                </div>
                <div className={`kpi-icon-large ${heatStatus === 'High' ? 'danger' : 'warning'}`}><Sun size={32} /></div>
              </div>
            </div>
            <div className="kpi-card glass-card">
              <div className="kpi-content">
                <div>
                  <div className="kpi-label">Unsafe Zones</div>
                  <div className="kpi-value highlight-danger">{unsafeCount}</div>
                  <div className="kpi-subtext">Low light/Hazard reports</div>
                </div>
                <div className="kpi-icon-large danger"><AlertTriangle size={32} /></div>
              </div>
            </div>
            <div className="kpi-card glass-card">
              <div className="kpi-content">
                <div>
                  <div className="kpi-label">Active Reports</div>
                  <div className="kpi-value highlight-success">1,246</div>
                  <div className="kpi-subtext">Community crowdsourced</div>
                </div>
                <div className="kpi-icon-large success"><Clipboard size={32} /></div>
              </div>
            </div>
          </div>

          <div className="maps-row">
            <div className="map-card glass-card">
              <h3>Heat Exposure Map</h3>
              <div className="map-placeholder heat-map-bg">
                {/* Simulated Heat Map */}
              </div>
            </div>
            <div className="map-card glass-card">
              <h3>Shade Gap Analysis</h3>
              <div className="map-placeholder shade-map-bg">
                {/* Simulated Shade Map */}
              </div>
            </div>
          </div>

          <div className="bottom-row">
            <div className="issues-card glass-card">
              <h3>Top Reported Issues</h3>
              <ul className="issues-list">
                <li><span><MapPin size={14} /> Poor lighting</span> <span className="issue-count">542</span></li>
                <li><span><MapPin size={14} /> Sidewalk obstruction</span> <span className="issue-count">326</span></li>
                <li><span><MapPin size={14} /> Extreme heat</span> <span className="issue-count">201</span></li>
                <li><span><MapPin size={14} /> Unsafe area</span> <span className="issue-count">177</span></li>
              </ul>
            </div>
            <div className="flow-card glass-card">
              <h3>Pedestrian Flow <span className="chart-subtitle">(Peak Hours)</span></h3>
              <div className="chart-placeholder">
                <svg viewBox="0 0 400 100" className="mock-line-chart">
                  <path d="M0,80 Q20,70 40,80 T80,50 T120,60 T160,30 T200,40 T240,20 T280,30 T320,50 T360,20 T400,60" fill="none" stroke="#38bdf8" strokeWidth="3" />
                  <circle cx="160" cy="30" r="4" fill="#38bdf8" />
                  <circle cx="240" cy="20" r="4" fill="#38bdf8" />
                  <circle cx="360" cy="20" r="4" fill="#38bdf8" />
                </svg>
                <div className="chart-x-axis">
                  <span>6AM</span>
                  <span>12PM</span>
                  <span>6PM</span>
                  <span>12AM</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="dashboard-footer">
            Data-driven insights for better walkability and infrastructure planning.
          </div>
        </div>
      </div>
    </div>
  );
};

export default MmdaDashboard;
