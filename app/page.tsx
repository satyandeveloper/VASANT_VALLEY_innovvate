import { AnalyzeForm, type SampleChip } from "@/components/AnalyzeForm";
import { Hero } from "@/components/Hero";
import { supabase } from "@/lib/platform/supabase";
import { unwrap } from "@/lib/platform/errors";

export const dynamic = "force-dynamic";

async function getSamples(): Promise<SampleChip[]> {
  const db = supabase();
  if (!db) return [];
  const data = unwrap(
    "samples.list",
    await db
      .from("analyses")
      .select("id, title, verdict")
      .eq("is_sample", true)
      .order("created_at", { ascending: true })
      .limit(3)
  );
  return (data ?? []) as SampleChip[];
}

export default async function Home() {
  const samples = await getSamples();
  return (
    <div className="mx-auto max-w-4xl">
      <Hero />
      <AnalyzeForm samples={samples} />
    </div>
  );
}
