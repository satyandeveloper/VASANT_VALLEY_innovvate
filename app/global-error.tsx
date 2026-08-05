"use client";

/**
 * Last-resort boundary for failures in the root layout itself. This replaces
 * the root layout when active, so it must render its own <html>/<body> and
 * cannot rely on global styles — every value here is inline by necessity.
 *
 * The webfonts are gone too at this point, so it leans on Georgia and the
 * system monospace rather than system sans: closer to the product's serif and
 * typewriter voice than a default UI face would be, with nothing to load.
 */

const INK = "#24215c";
const INK_SOFT = "#565398";
const INK_FAINT = "#8b88b8";
const PAPER = "#eef0f7";
const RULE = "#cfd3e6";
const OXBLOOD = "#8e2436";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "Georgia, serif",
          backgroundColor: PAPER,
          color: INK,
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "32rem", width: "100%" }}>
          <p
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.6875rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: OXBLOOD,
              margin: "0 0 0.5rem",
            }}
          >
            Error
          </p>
          <h2 style={{ fontSize: "1.5rem", lineHeight: 1.2, margin: 0, letterSpacing: "-0.01em" }}>
            I AGREE didn&apos;t start
          </h2>
          <p style={{ color: INK_SOFT, fontSize: "0.95rem", lineHeight: 1.6, marginTop: "0.5rem" }}>
            The app failed to load. This is a fault on our side, and nothing you decoded has been
            lost.
          </p>
          <button
            onClick={() => retry()}
            style={{
              marginTop: "1.5rem",
              border: `2px solid ${INK}`,
              borderRadius: 0,
              background: INK,
              color: PAPER,
              padding: "0.7rem 1.25rem",
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.75rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <div style={{ marginTop: "2rem", border: `1px solid ${RULE}`, background: "#fff" }}>
              <p
                style={{
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "0.6875rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: INK_FAINT,
                  borderBottom: `1px solid ${RULE}`,
                  margin: 0,
                  padding: "0.4rem 0.75rem",
                }}
              >
                Quote this if you report it
              </p>
              <code
                style={{
                  display: "block",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: "1rem",
                  letterSpacing: "0.06em",
                  padding: "0.6rem 0.75rem",
                  userSelect: "all",
                }}
              >
                {error.digest}
              </code>
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
