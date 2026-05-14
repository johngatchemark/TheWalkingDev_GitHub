import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import './CityDashboardButton.css';

interface CityDashboardButtonProps {
  onClick: () => void;
}

const CityDashboardButton: React.FC<CityDashboardButtonProps> = ({ onClick }) => {
  return (
    <button className="city-dashboard-btn" onClick={onClick} title="City Dashboard">
      <LayoutDashboard size={24} />
    </button>
  );
};

export default CityDashboardButton;
