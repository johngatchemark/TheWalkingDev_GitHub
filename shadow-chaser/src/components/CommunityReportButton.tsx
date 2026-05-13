import React, { useEffect, useState } from "react";
import "./CommunityReportButton.css";

interface CommunityReportButtonProps {
  /** Current snap state of the mobile bottom sheet */
  mobileSheetSnap: "collapsed" | "mid" | "expanded";
  /** Live drag offset in px while the user is dragging the sheet */
  sheetDragY: number;
  /** Called when the button is pressed */
  onClick: () => void;
}

/** Maps snap name → translateY percent used by the sheet (mirrors RoutePanel) */
function getSnapOffsetPercent(snap: "collapsed" | "mid" | "expanded"): number {
  if (snap === "collapsed") return 82;
  if (snap === "expanded") return 0;
  return 42; // mid
}

/**
 * Floating community-report button.
 * - Mobile  : hovers just above the route-panel bottom sheet.
 * - Desktop : fixed to the upper-right corner of the viewport.
 */
export default function CommunityReportButton({
  mobileSheetSnap,
  sheetDragY,
  onClick,
}: CommunityReportButtonProps) {
  // Mobile bottom offset so the button sits just above the sheet's visible top edge.
  // The sheet is: position=fixed, bottom=0, height=calc(100vh - 120px).
  // Its top edge = 100vh - sheetHeight * (1 - snapPercent/100) - |dragY if going up|
  // Simplified: bottom offset = sheetHeight * (1 - snapPercent/100) - dragY
  const [mobileBottom, setMobileBottom] = useState(0);

  useEffect(() => {
    const update = () => {
      if (window.innerWidth >= 768) return; // desktop handles itself with CSS
      const sheetHeight = window.innerHeight - 120;
      const snapPercent = getSnapOffsetPercent(mobileSheetSnap) / 100;
      // How much of the sheet is currently visible
      const visibleHeight = sheetHeight * (1 - snapPercent) - sheetDragY;
      // Button bottom = visible sheet height + 12px gap
      setMobileBottom(Math.max(0, visibleHeight + 12));
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [mobileSheetSnap, sheetDragY]);

  return (
    <button
      id="community-report-btn"
      className="community-report-btn"
      aria-label="Report a community issue"
      title="Report a community issue"
      onClick={onClick}
      style={
        {
          "--mobile-bottom": `${mobileBottom}px`,
        } as React.CSSProperties
      }
    >
      {/* Road-style yellow exclamation triangle */}
      <span className="crb-icon" aria-hidden="true">
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="crb-svg"
        >
          {/* Triangle body */}
          <path
            d="M24 4L44 42H4L24 4Z"
            fill="#F5C518"
            stroke="#D4A800"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Exclamation stem */}
          <rect x="21.5" y="18" width="5" height="13" rx="2.5" fill="#1a1a1a" />
          {/* Exclamation dot */}
          <circle cx="24" cy="35.5" r="3" fill="#1a1a1a" />
        </svg>
      </span>

      {/* Ripple ring shown on hover / focus */}
      <span className="crb-ripple" aria-hidden="true" />
    </button>
  );
}
