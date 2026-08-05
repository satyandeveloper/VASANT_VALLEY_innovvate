import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/**
 * The register — the shared shape behind /registry and /history.
 *
 * The design problem these pages had: with nothing to list, they rendered a
 * single sentence floating in most of a screen of blank space, which reads as
 * broken rather than as empty. A register is a ruled form, and a form with no
 * entries is still a form. So it always renders as one — headed and ruled —
 * and declares its own state with a stamp, the same vocabulary the verdict
 * uses. The absence becomes legible instead of being a hole in the page.
 *
 * The three states stay strictly distinct. Telling someone "nothing here yet"
 * when the lookup actually failed is a lie the interface should never tell.
 */

export type RegisterState = "unavailable" | "empty" | "signed-out";

const STAMP: Record<RegisterState, { label: string; tone: string }> = {
  unavailable: { label: "Unavailable", tone: "text-oxblood" },
  empty: { label: "No entries", tone: "text-ink-faint" },
  "signed-out": { label: "Not signed in", tone: "text-ditto" },
};

/**
 * Ruled but unfilled. Hairlines only — a grey block would read as loading
 * rather than as blank. Ruled by a repeating gradient rather than by fixed
 * rows so the sheet fills whatever height it is given: a register holding
 * fifty entries is tall, so an empty one that stops short looks wrong.
 */
const RULING: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent 0 43px, var(--color-rule) 43px 44px)",
};

export function RegisterEmpty({
  state,
  headline,
  explain,
  action,
}: {
  state: RegisterState;
  headline: string;
  explain: string;
  action: ReactNode;
}) {
  const stamp = STAMP[state];
  return (
    <div
      className="relative min-h-[26rem] border-2 border-ink bg-white sm:min-h-[32rem]"
      style={RULING}
    >
      {/* Sits over the ruling the way a stamp sits over a blank form. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <div className={`stamp mb-4 text-sm ${stamp.tone}`}>{stamp.label}</div>
        <p className="font-display text-lg font-bold text-ink">{headline}</p>
        <p className="mt-1.5 max-w-sm text-[15px] leading-relaxed text-ink-soft">{explain}</p>
        <div className="mt-4">{action}</div>
      </div>
    </div>
  );
}

/** The action that follows every empty state: there is always something to do. */
export function DecodeAction({ children = "Decode a document" }: { children?: string }) {
  return (
    <Link
      href="/"
      className="inline-block border-2 border-ink bg-ink px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-paper transition-colors hover:border-ditto hover:bg-ditto"
    >
      {children}
    </Link>
  );
}

export function RegisterHead({ columns }: { columns: string[] }) {
  return (
    <div className="flex items-center gap-3.5 border-2 border-b-0 border-ink bg-paper px-4 py-2">
      {columns.map((c, i) => (
        <span key={c} className={`field-label ${i === 0 ? "flex-1" : "shrink-0"}`}>
          {c}
        </span>
      ))}
    </div>
  );
}
