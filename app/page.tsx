import { AnalyzeForm, type SampleChip } from "@/components/AnalyzeForm";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

async function getSamples(): Promise<SampleChip[]> {
  const db = supabase();
  if (!db) return [];
  try {
    const { data } = await db
      .from("analyses")
      .select("id, title, verdict")
      .eq("is_sample", true)
      .order("created_at", { ascending: true })
      .limit(3);
    return (data ?? []) as SampleChip[];
  } catch {
    return [];
  }
}

export default async function Home() {
  const samples = await getSamples();
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Know what you&apos;re agreeing to.
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-slate-600">
          Every month you sign dozens of contracts you never read. We make them readable in ten
          seconds — and every warning is proven by the exact clause that caused it.
        </p>
      </div>
      <AnalyzeForm samples={samples} />
    </div>
  );
}
