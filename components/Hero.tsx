/**
 * The thesis of the page, staged as a collision between two textures: the wall
 * of fine print nobody reads, and the one plain sentence that replaces it.
 *
 * The fine print is set at its real hostile size (6.5px, justified, tight) and
 * is decorative — hidden from assistive tech, which reads the headline alone.
 */

const FINE_PRINT = `By accessing or using the Service you acknowledge that you have read, understood, and agree to be bound by these Terms, together with any additional terms, policies, guidelines, or amendments referenced herein or made available by the Company from time to time, whether or not notice of such amendment is provided to you. You grant the Company a perpetual, irrevocable, worldwide, non-exclusive, royalty-free, fully paid-up, sublicensable and transferable licence to host, store, cache, reproduce, publish, display, adapt, modify, translate, create derivative works from, and otherwise exploit any content, data, or material that you submit, post, transmit, or otherwise make available through the Service, in any medium now known or hereafter devised, for any purpose, without further notice to or consent from you and without any obligation of attribution or compensation. The Company may collect, process, retain, and disclose personal information, device identifiers, approximate and precise location data, usage telemetry, and inferred characteristics, and may share such information with affiliates, service providers, advertising partners, analytics providers, and successors in interest, including in connection with any merger, acquisition, reorganisation, or sale of assets. Your subscription shall renew automatically for successive terms of equal duration at the then-current rate unless cancelled in writing not less than thirty days prior to the commencement of the renewal term; cancellation requests submitted by any other means shall be deemed ineffective and fees already charged are non-refundable in whole or in part. To the maximum extent permitted by applicable law, the Company disclaims all warranties, express or implied, including any implied warranties of merchantability, fitness for a particular purpose, title, and non-infringement, and shall not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, revenue, data, goodwill, or anticipated savings, howsoever arising. You agree that any dispute, claim, or controversy arising out of or relating to these Terms shall be resolved exclusively by final and binding individual arbitration, and you expressly waive any right to a trial by jury and any right to participate in a class, collective, consolidated, or representative action. The Company may suspend, restrict, or terminate your access to the Service at any time, for any reason or no reason, with or without notice, and shall have no liability to you in respect of such suspension or termination. These Terms shall be governed by the laws of the jurisdiction in which the Company is incorporated, without regard to conflict of law principles.`;

export function Hero() {
  return (
    <section className="relative mb-8 overflow-hidden border-2 border-ink bg-white px-5 py-14 sm:px-10 sm:py-20">
      {/* Repeated so the texture fills the block at any viewport height —
          overflow is clipped, and a half-empty wall would read as a mistake. */}
      {/* Faded at the foot so the clip lands as a deliberate edge rather than
          a line of type sliced in half. */}
      <p
        className="fineprint absolute inset-0 p-4 sm:p-6"
        style={{
          maskImage: "linear-gradient(to bottom, #000 88%, transparent 99%)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 88%, transparent 99%)",
        }}
        aria-hidden="true"
      >
        {`${FINE_PRINT} ${FINE_PRINT} ${FINE_PRINT}`}
      </p>

      {/* Strongest behind the headline, clearing away toward the edges, so the
          fine print still reads as a wall while the type stays crisp. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 62% 52% at 50% 46%, rgba(255,255,255,0.94) 38%, rgba(255,255,255,0.72) 62%, rgba(255,255,255,0.18) 100%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl">
          You already
          <br />
          <span className="marker marker--animate">agreed to this.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
          Paste the document. Get a verdict in ten seconds — and every warning comes with the
          exact line that caused it.
        </p>
        <p className="field-label mt-6">
          <span className="bg-white/85 px-2 py-1">
            Terms of Service · Privacy Policy · Lease
          </span>
        </p>
      </div>
    </section>
  );
}
