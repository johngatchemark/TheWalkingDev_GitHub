import React from 'react';
import { Users } from 'lucide-react';
import './MockTrackerButton.css';

interface MockTrackerButtonProps {
  onClick: () => void;
  isActive: boolean;
}

const MockTrackerButton: React.FC<MockTrackerButtonProps> = ({ onClick, isActive }) => {
  return (
    <button 
      className={`mock-tracker-btn ${isActive ? 'active' : ''}`} 
      onClick={onClick} 
      title="Toggle Mock Users Tracker"
    >
      <Users size={24} />
    </button>
  );
};

export default MockTrackerButton;
