import { describe, it, expect } from "vitest"
import { parseToFurigana } from "@/lib/furigana"

describe("Furigana Parser", () => {
  it("should handle empty or whitespace-only text", async () => {
    const emptyResult = await parseToFurigana("")
    expect(emptyResult).toHaveLength(1)
    expect(emptyResult[0].text).toBe("")
    expect(emptyResult[0].isKanji).toBe(false)

    const spaceResult = await parseToFurigana("   ")
    expect(spaceResult).toHaveLength(1)
    expect(spaceResult[0].text).toBe("   ")
    expect(spaceResult[0].isKanji).toBe(false)
  })

  it("should parse text containing kanji and return correct readings in hiragana", async () => {
    // "学校" (School) is parsed as a single kanji word
    const result = await parseToFurigana("学校")
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe("学校")
    expect(result[0].isKanji).toBe(true)
    // kuromoji reading for 学校 is ガッコウ, converted to がっこう
    expect(result[0].reading).toBe("がっこう")
  })

  it("should mark non-kanji text with isKanji false and no reading", async () => {
    const result = await parseToFurigana("こんにちは")
    expect(result.every(token => !token.isKanji)).toBe(true)
    expect(result.every(token => token.reading === undefined)).toBe(true)
  })

  it("should parse mixed kanji and kana sentence correctly", async () => {
    const result = await parseToFurigana("日本語を勉強します")
    
    // Check that "日本語" (Japanese) is tokenized with kanji and reading
    const nihongoToken = result.find(t => t.text === "日本語")
    expect(nihongoToken).toBeDefined()
    expect(nihongoToken?.isKanji).toBe(true)
    expect(nihongoToken?.reading).toBe("にほんご")

    // Check that "勉強" (Study) is tokenized with kanji and reading
    const benkyouToken = result.find(t => t.text === "勉強")
    expect(benkyouToken).toBeDefined()
    expect(benkyouToken?.isKanji).toBe(true)
    expect(benkyouToken?.reading).toBe("べんきょう")

    // Check that particles/hiragana parts like "を" or "します" do not have kanji status
    const woToken = result.find(t => t.text === "を")
    expect(woToken).toBeDefined()
    expect(woToken?.isKanji).toBe(false)
    expect(woToken?.reading).toBeUndefined()
  })

  it("should align mixed Kanji and okurigana correctly (e.g. 振り返って)", async () => {
    const result = await parseToFurigana("振り返って")
    // "振り返って" is tokenized as "振り返っ" and "て"
    // "振り返っ" is aligned to:
    // 振 -> ふ
    // り -> り
    // 返 -> かえ
    // っ -> っ
    // "て" is a separate particle token
    
    expect(result).toBeDefined()
    
    const zhenToken = result.find(t => t.text === "振")
    expect(zhenToken).toBeDefined()
    expect(zhenToken?.isKanji).toBe(true)
    expect(zhenToken?.reading).toBe("ふ")

    const riToken = result.find(t => t.text === "り")
    expect(riToken).toBeDefined()
    expect(riToken?.isKanji).toBe(false)
    expect(riToken?.reading).toBeUndefined()

    const fanToken = result.find(t => t.text === "返")
    expect(fanToken).toBeDefined()
    expect(fanToken?.isKanji).toBe(true)
    expect(fanToken?.reading).toBe("かえ")

    const tsuToken = result.find(t => t.text === "っ")
    expect(tsuToken).toBeDefined()
    expect(tsuToken?.isKanji).toBe(false)
    expect(tsuToken?.reading).toBeUndefined()
  })

  it("debug tokens", async () => {
    const result = await parseToFurigana("入部希望の紙も書いたし")
    console.log("DEBUG TOKENS:", JSON.stringify(result, null, 2))
  })
})

