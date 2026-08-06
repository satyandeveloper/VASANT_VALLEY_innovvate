import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultView } from "@/components/ResultView";
import { getById } from "@/lib/analysis/pipeline";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const analysis = await getById(id).catch(() => null);
  if (!analysis) return {};
  return {
    title: `${analysis.title} — I AGREE verdict`,
    description: analysis.headline,
    openGraph: { images: [`/api/og?id=${id}`] },
  };
}

export default async function ResultsPage({ params }: Props) {
  const { id } = await params;
  const analysis = await getById(id).catch(() => null);
  if (!analysis) notFound();
  return <ResultView analysis={analysis} />;
}
