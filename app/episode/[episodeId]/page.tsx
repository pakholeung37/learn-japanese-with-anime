import EpisodePage from '@/components/EpisodePage';

interface PageProps {
  params: {
    episodeId: string;
  };
}

export default function Episode({ params }: PageProps) {
  return (
    <EpisodePage
      episodeId={params.episodeId}
      animeTitle="K-ON!!" // 这里应该从数据库获取
      episodeNumber={1} // 这里应该从episodeId解析
    />
  );
}
