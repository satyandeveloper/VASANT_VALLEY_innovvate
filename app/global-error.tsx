"use client";

/**
 * Last-resort boundary for failures in the root layout itself. This replaces
 * the root layout when active, so it must render its own <html>/<body> and
 * cannot rely on global styles.
 */
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
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.25rem", margin: 0 }}>I AGREE is temporarily unavailable</h2>
          <p style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "0.5rem" }}>
            Something went wrong while loading the app. Please try again.
          </p>
          <button
            onClick={() => retry()}
            style={{
              marginTop: "1.25rem",
              borderRadius: "0.5rem",
              border: 0,
              background: "#0f172a",
              color: "#fff",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ color: "#94a3b8", fontSize: "0.75rem", marginTop: "1rem" }}>
              Reference: <code>{error.digest}</code>
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
