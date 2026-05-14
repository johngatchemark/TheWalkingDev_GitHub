import React, { useState } from 'react';
import { User, LogOut } from 'lucide-react';
import './AuthModule.css';

interface AuthModuleProps {
  isSignedIn: boolean;
  setIsSignedIn: (val: boolean) => void;
  name: string;
  setName: (val: string) => void;
  username: string;
  setUsername: (val: string) => void;
}

const AuthModule: React.FC<AuthModuleProps> = ({
  isSignedIn,
  setIsSignedIn,
  name,
  setName,
  username,
  setUsername
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [password, setPassword] = useState('');

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && username && password) {
      setIsSignedIn(true);
      setShowForm(false);
    } else {
      alert("Please fill in all fields to sign in.");
    }
  };

  const handleSignOut = () => {
    setIsSignedIn(false);
    setPassword('');
    setIsPopoverOpen(false);
  };

  const togglePopover = () => {
    setIsPopoverOpen(!isPopoverOpen);
    if (!isPopoverOpen) {
      setShowForm(false);
    }
  };

  // Avatar text logic (initials)
  const avatarText = isSignedIn && name ? (name.charAt(0) || '').toUpperCase() : '';

  return (
    <div className="auth-module-container">
      <button className="profile-circle-btn" onClick={togglePopover}>
        {isSignedIn && avatarText ? (
          <span className="avatar-text">{avatarText}</span>
        ) : (
          <User size={28} color="var(--text-main)" />
        )}
      </button>

      {isPopoverOpen && (
        <div className="auth-modal-overlay" onClick={() => setIsPopoverOpen(false)}>
          <div className="auth-popover glass-panel" onClick={(e) => e.stopPropagation()}>
          {isSignedIn ? (
            <div className="profile-display">
              <div className="profile-info">
                <span className="profile-name">{name}</span>
                <span className="profile-username">@{username}</span>
              </div>
              <button className="logout-btn" onClick={handleSignOut} title="Sign Out">
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <>
              {!showForm ? (
                <div className="sign-in-prompt">
                  <span className="prompt-text">Sign in to sync your routes</span>
                  <button className="prompt-signin-btn" onClick={() => setShowForm(true)}>
                    Sign In
                  </button>
                </div>
              ) : (
                <form className="auth-form" onSubmit={handleSignIn}>
                  <div className="form-header">
                    <h4>Sign In</h4>
                    <button type="button" className="close-btn" onClick={() => setShowForm(false)}>×</button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                  />
                  <input 
                    type="text" 
                    placeholder="Username" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    required 
                  />
                  <input 
                    type="password" 
                    placeholder="Password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                  />
                  <button type="submit" className="submit-btn">Sign In</button>
                </form>
              )}
            </>
          )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthModule;
