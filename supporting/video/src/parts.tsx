import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, Easing, OffthreadVideo, staticFile } from "remotion";
import { CANARY, INK, INK_FAINT, INK_SOFT, PAPER, RULE } from "./theme";

export const FINE_PRINT = `By accessing or using the Service you acknowledge that you have read, understood, and agree to be bound by these Terms, together with any additional terms, policies, guidelines, or amendments referenced herein or made available by the Company from time to time, whether or not notice of such amendment is provided to you. You grant the Company a perpetual, irrevocable, worldwide, non-exclusive, royalty-free, fully paid-up, sublicensable and transferable licence to host, store, cache, reproduce, publish, display, adapt, modify, translate, create derivative works from, and otherwise exploit any content, data, or material that you submit, post, transmit, or otherwise make available through the Service, in any medium now known or hereafter devised, for any purpose, without further notice to or consent from you and without any obligation of attribution or compensation. The Company may collect, process, retain, and disclose personal information, device identifiers, approximate and precise location data, usage telemetry, and inferred characteristics, and may share such information with affiliates, service providers, advertising partners, analytics providers, and successors in interest, including in connection with any merger, acquisition, reorganisation, or sale of assets. Your subscription shall renew automatically for successive terms of equal duration at the then-current rate unless cancelled in writing not less than thirty days prior to the commencement of the renewal term; cancellation requests submitted by any other means shall be deemed ineffective and fees already charged are non-refundable in whole or in part. To the maximum extent permitted by applicable law, the Company disclaims all warranties, express or implied, including any implied warranties of merchantability, fitness for a particular purpose, title, and non-infringement, and shall not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, revenue, data, goodwill, or anticipated savings, howsoever arising. You agree that any dispute, claim, or controversy arising out of or relating to these Terms shall be resolved exclusively by final and binding individual arbitration, and you expressly waive any right to a trial by jury and any right to participate in a class, collective, consolidated, or representative action.`;

/** The wall of fine print, used as the film's ground texture. */
export const FinePrintBed: React.FC<{ opacity?: number }> = ({ opacity = 0.3 }) => (
  <AbsoluteFill
    style={{
      padding: 40,
      fontFamily: "Courier Prime, monospace",
      fontSize: 11,
      lineHeight: 1.5,
      textAlign: "justify",
      color: INK,
      opacity,
      hyphens: "auto",
    }}
  >
    {`${FINE_PRINT} ${FINE_PRINT} ${FINE_PRINT} ${FINE_PRINT}`}
  </AbsoluteFill>
);

/** Highlighter sweep, the same gesture the site uses on its headline. */
export const Marker: React.FC<{ children: React.ReactNode; start: number; delay?: number }> = ({
  children,
  start,
  delay = 0,
}) => {
  const frame = useCurrentFrame();
  return (
    <span style={{ position: "relative", display: "inline-block", isolation: "isolate" }}>
      <span
        style={{
          position: "absolute",
          zIndex: -1,
          inset: "0.10em -0.20em 0.06em -0.20em",
          backgroundColor: CANARY,
          transformOrigin: "left center",
          clipPath: "polygon(0 6%, 100% 0, 99.4% 96%, 0.6% 100%)",
          scale: `${interpolate(frame, [start + delay, start + delay + 18], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.22, 0.61, 0.36, 1),
          })} 1`,
        }}
      />
      {children}
    </span>
  );
};

/**
 * The footage, seated in a browser frame. Shown at 1360x850 (1.06x from the
 * 1280x800 capture) so the app's own type stays crisp rather than upscaled to
 * mush. Sized so the card bottom lands at 950px, leaving the last 130px as a
 * caption band the card cannot overlap.
 */
export const Screen: React.FC<{
  trimBefore: number;
  trimAfter: number;
  playbackRate?: number;
  caption: string;
}> = ({ trimBefore, trimAfter, playbackRate = 1, caption }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <FinePrintBed opacity={0.12} />
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 280,
          width: 1360,
          border: `3px solid ${INK}`,
          backgroundColor: "#fff",
          boxShadow: "18px 18px 0 rgba(36,33,92,0.16)",
          opacity: interpolate(frame, [0, 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        {/* Browser chrome, drawn in the same ink as everything else. */}
        <div
          style={{
            height: 44,
            borderBottom: `3px solid ${INK}`,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 16px",
            backgroundColor: PAPER,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{ width: 13, height: 13, borderRadius: "50%", border: `2px solid ${INK_FAINT}` }}
            />
          ))}
          <div
            style={{
              marginLeft: 14,
              fontFamily: "Courier Prime, monospace",
              fontSize: 17,
              letterSpacing: "0.09em",
              color: INK_SOFT,
            }}
          >
            innovvate.devjindal.me
          </div>
        </div>
        <div style={{ width: 1360, height: 850, overflow: "hidden" }}>
          <OffthreadVideo
            src={staticFile("demo.mp4")}
            trimBefore={trimBefore}
            trimAfter={trimAfter}
            playbackRate={playbackRate}
            muted
            style={{ width: 1360, height: 850, objectFit: "cover", objectPosition: "top center" }}
          />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 44,
          left: 280,
          width: 1360,
          display: "flex",
          alignItems: "center",
          gap: 18,
          opacity: interpolate(frame, [4, 16], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div style={{ width: 52, height: 4, backgroundColor: CANARY }} />
        <div style={{ fontFamily: "Archivo, sans-serif", fontWeight: 700, fontSize: 40, color: INK }}>
          {caption}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Small uppercase typewriter label — the app's field-label, on screen. */
export const FieldLabel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      fontFamily: "Courier Prime, monospace",
      fontSize: 24,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: INK_FAINT,
      ...style,
    }}
  >
    {children}
  </div>
);

export const Rule: React.FC = () => (
  <div style={{ height: 2, backgroundColor: RULE, width: "100%" }} />
);
