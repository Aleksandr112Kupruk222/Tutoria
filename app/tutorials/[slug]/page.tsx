import { lessons } from "@/lib/lessons";
import { LessonView } from "@/components/tutoria";
import { notFound } from "next/navigation";
export function generateStaticParams() {
  return lessons.map((l) => ({ slug: l.slug }));
}
export default async function Tutorial({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = lessons.find((l) => l.slug === slug);
  if (!lesson) notFound();
  return <LessonView lesson={lesson} />;
}
