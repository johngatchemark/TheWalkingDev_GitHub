import { useMemo, useState } from "react";
import {
  AlertCircle,
  Box,
  CheckCircle2,
  Droplets,
  Flame,
  MapPin,
  ShieldAlert,
  Sun,
  ThumbsUp,
} from "lucide-react";

const FILTERS = ["Safety", "Heat", "Accessibility", "Crowd"] as const;

const REPORT_CATEGORIES = [
  { id: "poor-lighting", label: "Poor Lighting", icon: AlertCircle },
  { id: "unsafe-area", label: "Unsafe Area", icon: ShieldAlert },
  { id: "flooded-path", label: "Flooded Path", icon: Droplets },
  { id: "heavy-heat", label: "Heavy Heat Exposure", icon: Sun },
  { id: "sidewalk-obstruction", label: "Sidewalk Obstruction", icon: Box },
  { id: "construction-area", label: "Construction Area", icon: MapPin },
] as const;

const REPORT_MARKERS = [
  { id: "m1", top: "28%", left: "48%", tone: "high", count: 6 },
  { id: "m2", top: "34%", left: "58%", tone: "medium", count: 3 },
  { id: "m3", top: "45%", left: "66%", tone: "high", count: 8 },
  { id: "m4", top: "56%", left: "53%", tone: "low", count: 2 },
] as const;

const WARNING_CARDS = [
  {
    id: "w1",
    severity: "High",
    copy: "Poor lighting reported here tonight",
    time: "11m ago",
    validation: "Verified by 8 walkers",
    score: 0.82,
  },
  {
    id: "w2",
    severity: "Medium",
    copy: "High heat exposure reported at noon",
    time: "26m ago",
    validation: "Verified by 5 walkers",
    score: 0.74,
  },
  {
    id: "w3",
    severity: "High",
    copy: "Sidewalk blocked due to construction",
    time: "39m ago",
    validation: "Verified by 11 walkers",
    score: 0.9,
  },
] as const;

export default function RouteReportingMockup() {
  const [activeFilters, setActiveFilters] = useState<string[]>(["Safety"]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<string>("poor-lighting");
  const [helpfulCardId, setHelpfulCardId] = useState<string>("w1");
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  const activeCategory = useMemo(
    () =>
      REPORT_CATEGORIES.find((category) => category.id === selectedCategory),
    [selectedCategory],
  );

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((item) => item !== filter)
        : [...prev, filter],
    );
  };

  const handleSubmitReport = () => {
    setIsConfirmationOpen(true);
    setIsSheetOpen(false);
  };

  const handleConfirmationClose = () => {
    setIsConfirmationOpen(false);
  };

  return (
    <>
      <div className="route-reporting-overlay">
        <div className="route-reporting-header glass-panel">
          <div className="route-reporting-title">Community reports</div>
          <div className="route-reporting-subtitle">
            Live updates from nearby walkers
          </div>
        </div>
        <div className="route-reporting-filter-row glass-panel">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`route-report-chip ${activeFilters.includes(filter) ? "active" : ""}`}
              onClick={() => toggleFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        {REPORT_MARKERS.map((marker) => (
          <button
            key={marker.id}
            type="button"
            className={`route-report-pin ${marker.tone}`}
            style={{ top: marker.top, left: marker.left }}
            aria-label="Crowd report marker"
          >
            <span />
            <span className="route-report-pin-count">{marker.count}</span>
          </button>
        ))}

        <div className="route-warning-stack">
          {WARNING_CARDS.map((card) => (
            <article
              key={card.id}
              className="route-warning-card glass-panel-heavy"
            >
              <header className="route-warning-head">
                <span
                  className={`warning-severity ${card.severity.toLowerCase()}`}
                >
                  {card.severity}
                </span>
                <span className="warning-time">{card.time}</span>
              </header>
              <p className="warning-copy">{card.copy}</p>
              <p className="warning-validation">{card.validation}</p>

              <div className="community-validation-row">
                <button
                  type="button"
                  className={`helpful-btn ${helpfulCardId === card.id ? "active" : ""}`}
                  onClick={() => setHelpfulCardId(card.id)}
                >
                  <ThumbsUp size={14} />
                  Helpful
                </button>
                <span className="verified-pill">
                  <CheckCircle2 size={13} />
                  Verified report
                </span>
                <span className="contributor-badge">Community Scout</span>
              </div>

              <div className="reliability-row">
                <span>Reliability</span>
                <div className="reliability-track">
                  <span style={{ width: `${Math.round(card.score * 100)}%` }} />
                </div>
                <span>{Math.round(card.score * 100)}%</span>
              </div>
            </article>
          ))}
        </div>

        <button
          type="button"
          className="report-route-fab"
          onClick={() => setIsSheetOpen(true)}
        >
          <Flame size={18} />
          Report Route
        </button>
      </div>

      <div
        className={`route-report-sheet-backdrop ${isSheetOpen ? "open" : ""}`}
        onClick={() => setIsSheetOpen(false)}
      />
      <section
        className={`route-report-sheet ${isSheetOpen ? "open" : ""}`}
        aria-hidden={!isSheetOpen}
      >
        <div className="route-report-sheet-handle" />
        <div className="route-report-sheet-head">
          <h3>Report Route Condition</h3>
          <p>Help fellow walkers avoid risky spots on this path.</p>
        </div>

        <div className="report-category-grid">
          {REPORT_CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                type="button"
                className={`report-category-btn ${selectedCategory === category.id ? "active" : ""}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <span className="category-icon-wrap">
                  <Icon size={17} />
                </span>
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>

        <div className="sheet-selected-state">
          <CheckCircle2 size={16} />
          <span>Selected: {activeCategory?.label}</span>
        </div>

        <button
          type="button"
          className="report-submit-btn"
          onClick={handleSubmitReport}
        >
          <Flame size={16} />
          Submit Report
        </button>
      </section>

      <div
        className={`confirmation-backdrop ${isConfirmationOpen ? "open" : ""}`}
        onClick={handleConfirmationClose}
      />
      <div
        className={`confirmation-modal ${isConfirmationOpen ? "open" : ""}`}
        aria-hidden={!isConfirmationOpen}
      >
        <div className="confirmation-content">
          <div className="confirmation-icon-wrap">
            <CheckCircle2 size={48} color="var(--accent-cool)" />
          </div>
          <h2 className="confirmation-title">Report Submitted!</h2>
          <p className="confirmation-message">
            Thank you for helping the community! Your report on{" "}
            <strong>{activeCategory?.label}</strong> has been shared with nearby
            walkers.
          </p>
          <div className="confirmation-details">
            <div className="detail-row">
              <span className="detail-label">Category:</span>
              <span className="detail-value">{activeCategory?.label}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className="detail-value">Pending verification</span>
            </div>
          </div>
          <button
            type="button"
            className="confirmation-close-btn"
            onClick={handleConfirmationClose}
          >
            Got it
          </button>
        </div>
      </div>
    </>
  );
}
