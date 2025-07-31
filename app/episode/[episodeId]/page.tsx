import EpisodePage from "@/components/EpisodePage"

interface PageProps {
  params: Promise<{
    episodeId: string
  }>
}

export default async function Episode({ params }: PageProps) {
  const { episodeId } = await params

  return <EpisodePage episodeId={episodeId} />
}
