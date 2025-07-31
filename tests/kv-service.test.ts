import { describe, it, expect, beforeEach } from "vitest"
import {
  saveTranslation,
  getTranslation,
  getEpisodeTranslations,
  deleteTranslation,
} from "@/lib/kv-service"
import { Translation } from "@/types/anime"
import memoryStore from "@/lib/memory-store"

describe("KV Service with Memory Store", () => {
  beforeEach(() => {
    // 清空内存存储
    memoryStore.clear()
  })

  describe("Translation Storage", () => {
    it("should save and retrieve a translation", async () => {
      const translation: Translation = {
        id: "test-episode-test-subtitle",
        episodeId: "[CASO&I.G][K-ON!!]-ep01-1920x1080",
        subtitleId: "0:00:31.29-0:00:33.78-abc123",
        originalText: "お姉ちゃん そろそろ起きないと…",
        translatedText: "Big sister, you should get up soon...",
        timestamp: Date.now(),
      }

      await saveTranslation(translation)
      const retrieved = await getTranslation(
        translation.episodeId,
        translation.subtitleId,
      )

      expect(retrieved).toEqual(translation)
    })

    it("should handle special characters in episode IDs", async () => {
      const episodeId = "[CASO&I.G][K-ON!!]-ep01-1920x1080"
      const translation: Translation = {
        id: "test-id",
        episodeId,
        subtitleId: "subtitle-1",
        originalText: "テスト",
        translatedText: "Test",
        timestamp: Date.now(),
      }

      await saveTranslation(translation)
      const translations = await getEpisodeTranslations(episodeId)

      expect(translations).toHaveLength(1)
      expect(translations[0]).toEqual(translation)
    })

    it("should retrieve multiple translations for an episode", async () => {
      const episodeId = "[CASO&I.G][K-ON!!]-ep01-1920x1080"
      const translations: Translation[] = [
        {
          id: "test-1",
          episodeId,
          subtitleId: "subtitle-1",
          originalText: "テスト1",
          translatedText: "Test 1",
          timestamp: Date.now(),
        },
        {
          id: "test-2",
          episodeId,
          subtitleId: "subtitle-2",
          originalText: "テスト2",
          translatedText: "Test 2",
          timestamp: Date.now(),
        },
      ]

      for (const translation of translations) {
        await saveTranslation(translation)
      }

      const retrieved = await getEpisodeTranslations(episodeId)
      expect(retrieved).toHaveLength(2)
      expect(retrieved).toEqual(expect.arrayContaining(translations))
    })

    it("should delete a translation", async () => {
      const translation: Translation = {
        id: "test-delete",
        episodeId: "[CASO&I.G][K-ON!!]-ep01-1920x1080",
        subtitleId: "subtitle-delete",
        originalText: "テスト削除",
        translatedText: "Test Delete",
        timestamp: Date.now(),
      }

      await saveTranslation(translation)
      await deleteTranslation(translation.episodeId, translation.subtitleId)

      const retrieved = await getTranslation(
        translation.episodeId,
        translation.subtitleId,
      )
      expect(retrieved).toBeNull()
    })

    it("should return empty array for episode with no translations", async () => {
      const translations = await getEpisodeTranslations("nonexistent-episode")
      expect(translations).toEqual([])
    })

    it("should handle multiple episodes without cross-contamination", async () => {
      const episode1Id = "[CASO&I.G][K-ON!!]-ep01-1920x1080"
      const episode2Id = "[CASO&I.G][K-ON!!]-ep02-1920x1080"

      const translation1: Translation = {
        id: "ep1-test",
        episodeId: episode1Id,
        subtitleId: "subtitle-1",
        originalText: "エピソード1",
        translatedText: "Episode 1",
        timestamp: Date.now(),
      }

      const translation2: Translation = {
        id: "ep2-test",
        episodeId: episode2Id,
        subtitleId: "subtitle-1",
        originalText: "エピソード2",
        translatedText: "Episode 2",
        timestamp: Date.now(),
      }

      await saveTranslation(translation1)
      await saveTranslation(translation2)

      const ep1Translations = await getEpisodeTranslations(episode1Id)
      const ep2Translations = await getEpisodeTranslations(episode2Id)

      expect(ep1Translations).toHaveLength(1)
      expect(ep2Translations).toHaveLength(1)
      expect(ep1Translations[0]).toEqual(translation1)
      expect(ep2Translations[0]).toEqual(translation2)
    })
  })
})
