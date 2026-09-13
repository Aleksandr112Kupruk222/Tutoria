import { lessons } from "@/lib/lessons";
import { LessonView } from "@/components/tutoria";
import { notFound } from "next/navigation";
export function generateStaticParams() {
  return lessons.map((l) => ({ slug: l.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const l = lessons.find((l) => l.slug === slug);
  if (!l) return {};
  const image = `https://i.ytimg.com/vi/${l.media[0].videoId}/hqdefault.jpg`;
  return {
    title: l.title,
    description: l.description,
    openGraph: { title: l.title, description: l.description, images: [image] },
    twitter: {
      card: "summary_large_image",
      title: l.title,
      description: l.description,
      images: [image],
    },
  };
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
