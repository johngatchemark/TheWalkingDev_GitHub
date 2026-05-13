import React, { useState, useRef, useEffect } from "react";
import {
  X,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  ShieldAlert,
  Thermometer,
  Waves,
  ConeIcon,
  HardHat,
  Footprints,
  TreeDeciduous,
  MoreHorizontal,
  CheckCircle2,
  Send,
  Navigation,
} from "lucide-react";
import "./CommunityReportPanel.css";

// ── Types ────────────────────────────────────────────────────────────────────

type ReportStep = "location" | "type" | "details" | "success";

interface ReportType {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

// ── Report type catalogue ────────────────────────────────────────────────────

const REPORT_TYPES: ReportType[] = [
  {
    id: "poor_lighting",
    label: "Poor Lighting",
    icon: <Lightbulb size={22} />,
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.15)",
  },
  {
    id: "unsafe_area",
    label: "Unsafe Area",
    icon: <ShieldAlert size={22} />,
    color: "#f43f5e",
    bg: "rgba(244,63,94,0.15)",
  },
  {
    id: "extreme_heat",
    label: "Extreme Heat Exposure",
    icon: <Thermometer size={22} />,
    color: "#fb923c",
    bg: "rgba(251,146,60,0.15)",
  },
  {
    id: "flooded_path",
    label: "Flooded Path",
    icon: <Waves size={22} />,
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.15)",
  },
  {
    id: "sidewalk_obstruction",
    label: "Sidewalk Obstruction",
    icon: <ConeIcon size={22} />,
    color: "#f97316",
    bg: "rgba(249,115,22,0.15)",
  },
  {
    id: "construction",
    label: "Construction Area",
    icon: <HardHat size={22} />,
    color: "#facc15",
    bg: "rgba(250,204,21,0.15)",
  },
  {
    id: "broken_sidewalk",
    label: "Broken Sidewalk",
    icon: <Footprints size={22} />,
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.15)",
  },
  {
    id: "no_shade",
    label: "No Shade",
    icon: <TreeDeciduous size={22} />,
    color: "#4ade80",
    bg: "rgba(74,222,128,0.15)",
  },
  {
    id: "other",
    label: "Other",
    icon: <MoreHorizontal size={22} />,
    color: "#94a3b8",
    bg: "rgba(148,163,184,0.15)",
  },
];

// ── Step labels for progress bar ─────────────────────────────────────────────
const STEPS: ReportStep[] = ["location", "type", "details"];

// ── Props ────────────────────────────────────────────────────────────────────

interface CommunityReportPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isNight: boolean;
  /** Fires when user wants to tap the map — panel should minimize */
  onRequestPin: () => void;
  /** Coords of pinned location, set by parent after map tap */
  pinnedCoords: [number, number] | null;
  /** Human-readable label for pinned location */
  pinnedLabel: string | null;
  /** True while we are waiting for the user to tap the map */
  isPinning: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CommunityReportPanel({
  isOpen,
  onClose,
  isNight,
  onRequestPin,
  pinnedCoords,
  pinnedLabel,
  isPinning,
}: CommunityReportPanelProps) {
  const [step, setStep] = useState<ReportStep>("location");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [mobileSheetSnap, setMobileSheetSnap] = useState<
    "collapsed" | "mid" | "expanded"
  >("mid");
  const [sheetDragY, setSheetDragY] = useState(0);
  const dragStartYRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Reset form when panel opens
  useEffect(() => {
    if (isOpen) {
      setStep("location");
      setSelectedType(null);
      setDetails("");
      setMobileSheetSnap("expanded");
      setSheetDragY(0);
    }
  }, [isOpen]);

  // Snap to expanded when step changes so content + footer are fully visible
  useEffect(() => {
    if (isOpen) {
      setMobileSheetSnap("expanded");
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step, isOpen]);

  // ── Drag handlers (mirrors RoutePanel pattern) ────────────────────────────
  const getSnapOffsetPercent = (
    snap: "collapsed" | "mid" | "expanded",
  ): number => {
    if (snap === "collapsed") return 82;
    if (snap === "expanded") return 0;
    return 42;
  };

  const clampDrag = (v: number) => Math.max(-220, Math.min(220, v));
  const mobileTransform = `translateY(calc(${getSnapOffsetPercent(mobileSheetSnap)}% + ${sheetDragY}px))`;

  const shiftUp = () =>
    setMobileSheetSnap((p) =>
      p === "collapsed" ? "mid" : p === "mid" ? "expanded" : "expanded",
    );
  const shiftDown = () =>
    setMobileSheetSnap((p) =>
      p === "expanded" ? "mid" : p === "mid" ? "collapsed" : "collapsed",
    );

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (window.innerWidth >= 768) return;
    dragStartYRef.current = e.touches[0].clientY;
    setSheetDragY(0);
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (window.innerWidth >= 768 || dragStartYRef.current === null) return;
    setSheetDragY(clampDrag(e.touches[0].clientY - dragStartYRef.current));
  };
  const handleTouchEnd = () => {
    if (window.innerWidth >= 768 || dragStartYRef.current === null) {
      dragStartYRef.current = null;
      setSheetDragY(0);
      return;
    }
    if (sheetDragY <= -40) shiftUp();
    if (sheetDragY >= 40) shiftDown();
    dragStartYRef.current = null;
    setSheetDragY(0);
  };

  // ── Step navigation ───────────────────────────────────────────────────────
  const canAdvance = (): boolean => {
    if (step === "location") return pinnedCoords !== null;
    if (step === "type") return selectedType !== null;
    return true;
  };

  const advance = () => {
    if (step === "location") setStep("type");
    else if (step === "type") setStep("details");
    else if (step === "details") setStep("success");
  };

  const goBack = () => {
    if (step === "type") setStep("location");
    else if (step === "details") setStep("type");
  };

  // ── Step index for progress ───────────────────────────────────────────────
  const stepIndex = STEPS.indexOf(step as ReportStep);

  // ── Selected report type object ───────────────────────────────────────────
  const selectedTypeObj = REPORT_TYPES.find((r) => r.id === selectedType);

  if (!isOpen) return null;

  return (
    <div
      className={`crp-overlay ${isOpen ? "crp-overlay--visible" : ""}`}
      onClick={(e) => {
        // Close if clicking the backdrop (desktop only)
        if (e.target === e.currentTarget && window.innerWidth >= 768) onClose();
      }}
    >
      <div
        className={`crp-panel glass-panel ${isNight ? "night-theme" : ""}`}
        style={
          {
            ["--crp-mobile-transform" as string]: mobileTransform,
          } as React.CSSProperties
        }
      >
        {/* ── Pull tab (mobile) ────────────────────────────────────────── */}
        <div
          className="pull-tab crp-pull-tab"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() =>
            setMobileSheetSnap((p) => (p === "collapsed" ? "mid" : "collapsed"))
          }
        />

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="crp-header">
          <div className="crp-header-left">
            {step !== "location" && step !== "success" && (
              <button
                className="crp-back-btn"
                onClick={goBack}
                aria-label="Go back"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div>
              <div className="crp-header-eyebrow">Community Report</div>
              <div className="crp-header-title">
                {step === "location" && "Pinpoint the Location"}
                {step === "type" && "Select Report Type"}
                {step === "details" && "Additional Details"}
                {step === "success" && "Report Submitted"}
              </div>
            </div>
          </div>
          <button
            className="crp-close-btn"
            onClick={onClose}
            aria-label="Close community report"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Progress bar (steps 0-2) ─────────────────────────────── */}
        {step !== "success" && (
          <div className="crp-progress">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`crp-progress-dot ${i <= stepIndex ? "crp-progress-dot--active" : ""}`}
              />
            ))}
            <div className="crp-progress-track">
              <div
                className="crp-progress-fill"
                style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Scrollable body ───────────────────────────────────────── */}
        <div className="crp-body sheet-scroll-content" ref={scrollRef}>
          {/* ══ STEP: LOCATION ══════════════════════════════════════ */}
          {step === "location" && (
            <div className="crp-step crp-step-location">
              <p className="crp-step-hint">
                Tap the button below, then tap a location on the map to mark
                where the issue is.
              </p>

              <button
                className={`crp-pin-btn action-button ${isNight ? "night-mode" : ""} ${isPinning ? "crp-pin-btn--waiting" : ""}`}
                onClick={onRequestPin}
                disabled={isPinning}
              >
                <Navigation size={16} />
                {isPinning ? "Tap the map to pin…" : pinnedCoords ? "Re-pin Location" : "Tap to Pin on Map"}
              </button>

              {pinnedCoords ? (
                <div className="crp-location-confirmed">
                  <div className="crp-location-icon">
                    <MapPin size={20} color="#22c55e" />
                  </div>
                  <div className="crp-location-text">
                    <div className="crp-location-label">
                      {pinnedLabel ?? "Pinned Location"}
                    </div>
                    <div className="crp-location-coords">
                      {pinnedCoords[1].toFixed(5)}°N,{" "}
                      {pinnedCoords[0].toFixed(5)}°E
                    </div>
                  </div>
                  <CheckCircle2 size={18} color="#22c55e" className="crp-check" />
                </div>
              ) : (
                <div className="crp-location-empty">
                  <MapPin size={28} color="rgba(255,255,255,0.2)" />
                  <span>No location pinned yet</span>
                </div>
              )}

              <div className="crp-map-hint glass-panel">
                <span className="crp-map-hint-icon">📍</span>
                <span>
                  After tapping <strong>"Tap to Pin on Map"</strong>, tap anywhere
                  on the map. A marker will appear and your selection will be shown
                  here.
                </span>
              </div>
            </div>
          )}

          {/* ══ STEP: REPORT TYPE ═══════════════════════════════════ */}
          {step === "type" && (
            <div className="crp-step crp-step-type">
              <p className="crp-step-hint">
                What kind of issue are you reporting?
              </p>
              <div className="crp-type-grid">
                {REPORT_TYPES.map((rt) => (
                  <button
                    key={rt.id}
                    className={`crp-type-card ${selectedType === rt.id ? "crp-type-card--selected" : ""}`}
                    style={
                      {
                        ["--rt-color" as string]: rt.color,
                        ["--rt-bg" as string]: rt.bg,
                      } as React.CSSProperties
                    }
                    onClick={() => setSelectedType(rt.id)}
                  >
                    <span className="crp-type-icon">{rt.icon}</span>
                    <span className="crp-type-label">{rt.label}</span>
                    {selectedType === rt.id && (
                      <CheckCircle2
                        size={14}
                        className="crp-type-check"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ══ STEP: DETAILS ═══════════════════════════════════════ */}
          {step === "details" && (
            <div className="crp-step crp-step-details">
              {/* Summary of selections */}
              <div className="crp-summary-row">
                <div className="crp-summary-chip">
                  <MapPin size={13} />
                  <span>{pinnedLabel ?? "Pinned location"}</span>
                </div>
                {selectedTypeObj && (
                  <div
                    className="crp-summary-chip"
                    style={{ color: selectedTypeObj.color }}
                  >
                    {selectedTypeObj.icon}
                    <span>{selectedTypeObj.label}</span>
                  </div>
                )}
              </div>

              <p className="crp-step-hint">
                Add any extra details to help the community understand the
                issue better. <em>(Optional)</em>
              </p>

              <textarea
                className="crp-textarea"
                placeholder="Describe the issue… e.g. 'The sidewalk here has a large crack that is easy to trip on, especially at night.'"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={5}
                maxLength={500}
              />
              <div className="crp-char-count">{details.length} / 500</div>
            </div>
          )}

          {/* ══ STEP: SUCCESS ════════════════════════════════════════ */}
          {step === "success" && (
            <div className="crp-step crp-step-success">
              <div className="crp-success-icon">
                <CheckCircle2 size={48} color="#22c55e" />
              </div>
              <h3 className="crp-success-title">Thank you!</h3>
              <p className="crp-success-body">
                Your report has been recorded. The LakadPH community will review
                it and update the route data accordingly.
              </p>

              {/* Summary card */}
              <div className="crp-success-card glass-panel">
                <div className="crp-success-row">
                  <MapPin size={15} color="var(--accent-cool)" />
                  <span>{pinnedLabel ?? "Pinned location"}</span>
                </div>
                {selectedTypeObj && (
                  <div className="crp-success-row" style={{ color: selectedTypeObj.color }}>
                    {selectedTypeObj.icon}
                    <span>{selectedTypeObj.label}</span>
                  </div>
                )}
                {details.trim() && (
                  <div className="crp-success-details">
                    <span>"{details.trim()}"</span>
                  </div>
                )}
              </div>

              <button
                className="action-button crp-done-btn"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* ── Footer CTA ────────────────────────────────────────────── */}
        {step !== "success" && (
          <div className="crp-footer">
            <button
              className={`action-button crp-next-btn ${isNight ? "night-mode" : ""} ${!canAdvance() ? "crp-next-btn--disabled" : ""}`}
              onClick={advance}
              disabled={!canAdvance()}
            >
              {step === "details" ? (
                <>
                  <Send size={16} />
                  Submit Report
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
