export interface AnimeInfo {
  id: string
  title: string
  episodes: EpisodeInfo[]
}

export interface EpisodeInfo {
  id: string
  number: number
  title?: string
  subtitlePath: string
  animeId: string
}

export interface Translation {
  id: string
  episodeId: string
  subtitleId: string
  originalText: string
  translatedText: string
  timestamp: number
}

export interface UserProgress {
  userId: string
  episodeId: string
  completedSubtitles: string[]
  lastPosition: number
  updatedAt: number
}
