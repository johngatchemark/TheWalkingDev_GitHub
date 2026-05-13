import React from 'react';
import './MmdaDashboard.css';
import { 
  Map as MapIcon, 
  AlertTriangle, 
  Users, 
  CloudRain,
  ShieldAlert,
  ThermometerSun,
  Activity,
  ArrowUpRight,
  TrendingUp,
  X
} from 'lucide-react';

interface MmdaDashboardProps {
  onClose: () => void;
}

const MmdaDashboard: React.FC<MmdaDashboardProps> = ({ onClose }) => {
  return (
    <div className="mmda-dashboard">
      <div className="dashboard-overlay"></div>
      
      <div className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <div className="badge">Government Portal</div>
            <h1 className="dashboard-title">MMDA Infrastructure Intelligence</h1>
            <p className="dashboard-subtitle">Data-driven urban planning & pedestrian safety metrics powered by LakadPH</p>
          </div>
          <button className="close-dashboard" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="dashboard-grid">
          {/* Main KPI Cards */}
          <div className="kpi-card glass-panel heat-card">
            <div className="kpi-icon"><ThermometerSun size={24} /></div>
            <div className="kpi-info">
              <h3>Avg Heat Exposure</h3>
              <div className="kpi-value">38.4°C <span className="trend positive"><ArrowUpRight size={16}/> 1.2°C</span></div>
              <p>Peak daytime pedestrian routes</p>
            </div>
          </div>
          
          <div className="kpi-card glass-panel shade-card">
            <div className="kpi-icon"><CloudRain size={24} /></div>
            <div className="kpi-info">
              <h3>Identified Shade Gaps</h3>
              <div className="kpi-value">1,402 <span className="trend negative"><ArrowUpRight size={16}/> 12%</span></div>
              <p>Segments lacking cover &gt; 50m</p>
            </div>
          </div>

          <div className="kpi-card glass-panel safety-card">
            <div className="kpi-icon"><ShieldAlert size={24} /></div>
            <div className="kpi-info">
              <h3>Unsafe Walking Zones</h3>
              <div className="kpi-value">47 <span className="trend positive"><TrendingUp size={16}/> 4</span></div>
              <p>Based on low lighting & user reports</p>
            </div>
          </div>

          <div className="kpi-card glass-panel flow-card">
            <div className="kpi-icon"><Users size={24} /></div>
            <div className="kpi-info">
              <h3>Pedestrian Flow</h3>
              <div className="kpi-value">284k <span className="trend positive"><ArrowUpRight size={16}/> 8%</span></div>
              <p>Daily active walkers in UBelt</p>
            </div>
          </div>

          {/* Heat Exposure Map Mock */}
          <div className="dashboard-widget wide glass-panel">
            <div className="widget-header">
              <h2><MapIcon size={20} /> Heat Exposure & Shade Gap Map</h2>
              <div className="widget-actions">
                <button className="btn-filter active">Day</button>
                <button className="btn-filter">Night</button>
              </div>
            </div>
            <div className="mock-map-container">
              {/* CSS Art for Mock Map */}
              <div className="map-grid-bg"></div>
              
              {/* Heat Zones */}
              <div className="heat-zone high" style={{ top: '20%', left: '30%', width: '150px', height: '150px' }}></div>
              <div className="heat-zone extreme" style={{ top: '50%', left: '60%', width: '120px', height: '200px' }}></div>
              <div className="heat-zone moderate" style={{ top: '70%', left: '20%', width: '180px', height: '100px' }}></div>
              
              {/* Shade Gaps */}
              <div className="shade-gap-marker" style={{ top: '25%', left: '35%' }}>
                <span className="pulse"></span>
                <span className="label">Gap A-1</span>
              </div>
              <div className="shade-gap-marker" style={{ top: '60%', left: '65%' }}>
                <span className="pulse"></span>
                <span className="label">Gap C-4</span>
              </div>
              <div className="shade-gap-marker" style={{ top: '40%', left: '50%' }}>
                <span className="pulse"></span>
                <span className="label">Gap B-2</span>
              </div>
              
              <div className="map-legend-overlay">
                <div className="legend-row"><span className="color-dot extreme"></span> Extreme Heat</div>
                <div className="legend-row"><span className="color-dot high"></span> High Heat</div>
                <div className="legend-row"><span className="color-dot gap"></span> Critical Shade Gap</div>
              </div>
            </div>
          </div>

          {/* Infrastructure Action Items */}
          <div className="dashboard-widget glass-panel">
            <div className="widget-header">
              <h2><AlertTriangle size={20} /> Infrastructure Priorities</h2>
            </div>
            <div className="action-list">
              <div className="action-item">
                <div className="priority-indicator critical"></div>
                <div className="action-details">
                  <h4>Install Streetlights - Morayta</h4>
                  <p>73% of night walkers avoid this route</p>
                </div>
                <button className="action-btn">Review</button>
              </div>
              <div className="action-item">
                <div className="priority-indicator high"></div>
                <div className="action-details">
                  <h4>Plant Trees - España Blvd</h4>
                  <p>1.2km continuous shade gap identified</p>
                </div>
                <button className="action-btn">Review</button>
              </div>
              <div className="action-item">
                <div className="priority-indicator medium"></div>
                <div className="action-details">
                  <h4>Widen Pavement - Dapitan</h4>
                  <p>Pedestrian flow exceeds capacity at 5PM</p>
                </div>
                <button className="action-btn">Review</button>
              </div>
              <div className="action-item">
                <div className="priority-indicator medium"></div>
                <div className="action-details">
                  <h4>Repair Sidewalk - P. Noval</h4>
                  <p>Multiple user reports of uneven terrain</p>
                </div>
                <button className="action-btn">Review</button>
              </div>
            </div>
          </div>

          {/* Pedestrian Flow Chart Mock */}
          <div className="dashboard-widget glass-panel">
            <div className="widget-header">
              <h2><Activity size={20} /> Pedestrian Flow Trends</h2>
              <span className="time-filter">Last 7 Days</span>
            </div>
            <div className="mock-chart">
              <div className="chart-bars">
                <div className="chart-bar" style={{ height: '40%' }}><span>Mon</span></div>
                <div className="chart-bar" style={{ height: '55%' }}><span>Tue</span></div>
                <div className="chart-bar" style={{ height: '45%' }}><span>Wed</span></div>
                <div className="chart-bar" style={{ height: '70%' }}><span>Thu</span></div>
                <div className="chart-bar" style={{ height: '85%' }}><span>Fri</span></div>
                <div className="chart-bar" style={{ height: '30%' }}><span>Sat</span></div>
                <div className="chart-bar" style={{ height: '20%' }}><span>Sun</span></div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MmdaDashboard;
