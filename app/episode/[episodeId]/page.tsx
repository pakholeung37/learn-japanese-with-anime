import EpisodePage from '@/components/EpisodePage';

interface PageProps {
  params: Promise<{
    episodeId: string;
  }>;
}

export default async function Episode({ params }: PageProps) {
  const { episodeId } = await params;
  
  return (
    <EpisodePage
      episodeId={episodeId}
      animeTitle="K-ON!!" // 这里应该从数据库获取
      episodeNumber={1} // 这里应该从episodeId解析
    />
  );
}
