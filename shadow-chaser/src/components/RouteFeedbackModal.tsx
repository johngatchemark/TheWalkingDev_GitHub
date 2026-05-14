import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, X, ShieldAlert, ShieldCheck, ThermometerSnowflake, ThermometerSun } from 'lucide-react';
import './RouteFeedbackModal.css';

interface RouteFeedbackModalProps {
  onClose: () => void;
  onSubmit: (feedback: any) => void;
}

const RouteFeedbackModal: React.FC<RouteFeedbackModalProps> = ({ onClose, onSubmit }) => {
  const [rating, setRating] = useState<'up' | 'down' | null>(null);
  const [safety, setSafety] = useState<'safe' | 'unsafe' | null>(null);
  const [comfort, setComfort] = useState<'cooler' | 'hotter' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setIsSubmitting(true);
    // Mock API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setTimeout(() => {
        onSubmit({ rating, safety, comfort });
        onClose();
      }, 1500);
    }, 800);
  };

  if (submitted) {
    return (
      <div className="feedback-modal-overlay">
        <div className="feedback-modal glass-panel success-state">
          <div className="success-icon-container">
            <ThumbsUp size={48} color="#22c55e" />
          </div>
          <h2>Thank You!</h2>
          <p>Your feedback helps improve recommendations for everyone.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-modal-overlay">
      <div className="feedback-modal glass-panel animate-slide-up">
        <div className="modal-header">
          <h2>Route Feedback</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="feedback-section">
            <label>How was your overall route?</label>
            <div className="btn-group">
              <button 
                className={`feedback-btn ${rating === 'up' ? 'active active-up' : ''}`}
                onClick={() => setRating('up')}
              >
                <ThumbsUp size={20} /> Good
              </button>
              <button 
                className={`feedback-btn ${rating === 'down' ? 'active active-down' : ''}`}
                onClick={() => setRating('down')}
              >
                <ThumbsDown size={20} /> Poor
              </button>
            </div>
          </div>

          <div className="feedback-section">
            <label>Did this route feel safe?</label>
            <div className="btn-group">
              <button 
                className={`feedback-btn ${safety === 'safe' ? 'active active-safe' : ''}`}
                onClick={() => setSafety('safe')}
              >
                <ShieldCheck size={20} /> Yes
              </button>
              <button 
                className={`feedback-btn ${safety === 'unsafe' ? 'active active-unsafe' : ''}`}
                onClick={() => setSafety('unsafe')}
              >
                <ShieldAlert size={20} /> No
              </button>
            </div>
          </div>

          <div className="feedback-section">
            <label>Was this route comfortable?</label>
            <div className="btn-group">
              <button 
                className={`feedback-btn ${comfort === 'cooler' ? 'active active-cooler' : ''}`}
                onClick={() => setComfort('cooler')}
              >
                <ThermometerSnowflake size={20} /> Cooler
              </button>
              <button 
                className={`feedback-btn ${comfort === 'hotter' ? 'active active-hotter' : ''}`}
                onClick={() => setComfort('hotter')}
              >
                <ThermometerSun size={20} /> Hotter
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="submit-btn" 
            onClick={handleSubmit}
            disabled={!rating && !safety && !comfort || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteFeedbackModal;
