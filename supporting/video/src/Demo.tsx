import React from "react";
import {
  AbsoluteFill,
  Series,
  interpolate,
  useCurrentFrame,
  Easing,
  Composition,
} from "remotion";
import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadCourier } from "@remotion/google-fonts/CourierPrime";
import { loadFont as loadNewsreader } from "@remotion/google-fonts/Newsreader";
import { CANARY, FPS, HEIGHT, INK, INK_SOFT, OXBLOOD, PAPER, SAGE, WIDTH, SRC } from "./theme";
import { FieldLabel, FinePrintBed, Marker, Screen } from "./parts";

loadArchivo();
loadCourier();
loadNewsreader();

/* ---------------------------------------------------------------- scenes */

const Title: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <FinePrintBed opacity={0.32} />
      {/* Cleared behind the type so the wall still reads as a wall while the
          headline stays legible — the same wash the site uses. */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 64% 52% at 50% 48%, rgba(255,255,255,0.96) 36%, rgba(255,255,255,0.74) 64%, rgba(255,255,255,0.15) 100%)",
        }}
      />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 120 }}>
        <div
          style={{
            fontFamily: "Archivo, sans-serif",
            fontWeight: 800,
            fontSize: 132,
            lineHeight: 1.03,
            letterSpacing: "-0.02em",
            color: INK,
            textAlign: "center",
            translate: `0px ${interpolate(frame, [0, 24], [26, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            })}px`,
            opacity: interpolate(frame, [0, 18], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          You already
          <br />
          <Marker start={0} delay={22}>
            agreed to this.
          </Marker>
        </div>
        <div
          style={{
            marginTop: 46,
            fontFamily: "Newsreader, serif",
            fontSize: 46,
            color: INK_SOFT,
            textAlign: "center",
            opacity: interpolate(frame, [40, 58], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          I AGREE — the fine print decoder
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const lines = [
    "Nobody reads the terms.",
    "Reading them all would take weeks a year.",
    "So we agree to things we would never accept.",
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <FinePrintBed opacity={0.16} />
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 160px" }}>
        <FieldLabel style={{ marginBottom: 42 }}>The problem</FieldLabel>
        {lines.map((l, i) => (
          <div
            key={l}
            style={{
              fontFamily: "Archivo, sans-serif",
              fontWeight: i === 2 ? 800 : 600,
              fontSize: i === 2 ? 74 : 66,
              lineHeight: 1.22,
              color: i === 2 ? INK : INK_SOFT,
              marginBottom: 26,
              translate: `${interpolate(frame, [i * 14, i * 14 + 20], [-28, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              })}px 0px`,
              opacity: interpolate(frame, [i * 14, i * 14 + 18], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            {l}
          </div>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Impact: React.FC = () => {
  const frame = useCurrentFrame();
  const items = [
    {
      k: "Verified, not guessed",
      v: "Every flag must quote the document word for word. Quotes that cannot be found are withheld for human review, so the tool never invents a clause.",
      c: SAGE,
    },
    {
      k: "Plain English",
      v: "Three risks that actually cost people money: what happens to your data, how hard it is to cancel, and what rights you sign away over your own content.",
      c: CANARY,
    },
    {
      k: "Ten seconds, free",
      v: "Paste a document or a link. No account, no upload, no fee — costing well under a cent per analysis to run.",
      c: OXBLOOD,
    },
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: PAPER }}>
      <FinePrintBed opacity={0.1} />
      <AbsoluteFill style={{ padding: "96px 140px", justifyContent: "center" }}>
        <FieldLabel style={{ marginBottom: 40 }}>Why it matters</FieldLabel>
        {items.map((it, i) => (
          <div
            key={it.k}
            style={{
              display: "flex",
              gap: 30,
              // No trailing gap on the last row, which would push the block
              // off-centre and leave a dead band along the bottom.
              marginBottom: i === items.length - 1 ? 0 : 40,
              opacity: interpolate(frame, [i * 22, i * 22 + 20], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              translate: `${interpolate(frame, [i * 22, i * 22 + 24], [-26, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              })}px 0px`,
            }}
          >
            <div style={{ width: 8, backgroundColor: it.c, flexShrink: 0 }} />
            <div>
              <div
                style={{
                  fontFamily: "Archivo, sans-serif",
                  fontWeight: 800,
                  fontSize: 52,
                  color: INK,
                  marginBottom: 10,
                }}
              >
                {it.k}
              </div>
              <div
                style={{
                  fontFamily: "Newsreader, serif",
                  fontSize: 36,
                  lineHeight: 1.4,
                  color: INK_SOFT,
                  maxWidth: 1440,
                }}
              >
                {it.v}
              </div>
            </div>
          </div>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <AbsoluteFill
        style={{
          padding: 60,
          fontFamily: "Courier Prime, monospace",
          fontSize: 11,
          lineHeight: 1.5,
          textAlign: "justify",
          color: PAPER,
          opacity: 0.14,
        }}
      >
        {/* Enough repetitions to reach the bottom edge — a bed that runs out
            two-thirds down reads as a rendering fault, not as texture. */}
        {"By accessing or using the Service you acknowledge that you have read, understood, and agree to be bound by these Terms. ".repeat(
          220
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            fontFamily: "Archivo, sans-serif",
            fontWeight: 800,
            fontSize: 96,
            color: PAPER,
            letterSpacing: "-0.01em",
            opacity: interpolate(frame, [0, 16], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          Read it before you agree.
        </div>
        <div
          style={{
            marginTop: 44,
            padding: "18px 40px",
            border: `4px double ${CANARY}`,
            color: CANARY,
            fontFamily: "Courier Prime, monospace",
            fontSize: 40,
            letterSpacing: "0.06em",
            rotate: "-2.4deg",
            opacity: interpolate(frame, [22, 38], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            scale: interpolate(frame, [22, 40], [1.12, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            }) as any,
          }}
        >
          innovvate.devjindal.me
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------- the film */

export const DemoFilm: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: PAPER }}>
    <Series>
      <Series.Sequence durationInFrames={112}>
        <Title />
      </Series.Sequence>
      <Series.Sequence durationInFrames={160}>
        <Problem />
      </Series.Sequence>

      {/* Real footage. Waiting is compressed, the payoff plays at full speed. */}
      <Series.Sequence durationInFrames={150}>
        <Screen trimBefore={250} trimAfter={SRC.pasted} playbackRate={1.5} caption="Paste any document" />
      </Series.Sequence>
      <Series.Sequence durationInFrames={80}>
        <Screen
          trimBefore={SRC.analyzing}
          trimAfter={SRC.verdict}
          playbackRate={3}
          caption="Read and cross-checked in seconds"
        />
      </Series.Sequence>
      <Series.Sequence durationInFrames={96}>
        <Screen trimBefore={SRC.verdict} trimAfter={800} caption="A verdict in plain English" />
      </Series.Sequence>
      <Series.Sequence durationInFrames={150}>
        <Screen
          trimBefore={800}
          trimAfter={SRC.end}
          caption="Every warning cites the exact line"
        />
      </Series.Sequence>

      <Series.Sequence durationInFrames={280}>
        <Impact />
      </Series.Sequence>
      <Series.Sequence durationInFrames={130}>
        <Outro />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);

export const DemoComposition: React.FC = () => (
  <Composition
    id="Demo"
    component={DemoFilm}
    durationInFrames={112 + 160 + 150 + 80 + 96 + 150 + 280 + 130}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
