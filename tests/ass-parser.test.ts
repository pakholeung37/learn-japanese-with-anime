import { describe, it, expect, beforeAll } from 'vitest'
import { readSubtitleFile } from '@/lib/subtitle-scanner'
import { parseASS, timeToSeconds, secondsToTime } from '@/lib/ass-parser'
import path from 'path'

describe('ASS Parser', () => {
  let assContent: string

  beforeAll(async () => {
    // 读取测试用的 ASS 文件
    const filePath = path.join(
      process.cwd(),
      'app/res/[CASO&I.G][K-ON!]/[I.G&CASO][K-ON!][01][BDRIP][1920x1080][x264_FLAC_3][4A9C59D1].JP.ass'
    )
    assContent = await readSubtitleFile(filePath)
  })

  describe('parseASS', () => {
    it('should parse ASS file correctly', () => {
      const result = parseASS(assContent)

      // 验证基本结构
      expect(result).toHaveProperty('info')
      expect(result).toHaveProperty('styles')
      expect(result).toHaveProperty('dialogues')
      expect(Array.isArray(result.dialogues)).toBe(true)
    })

    it('should extract script info correctly', () => {
      const result = parseASS(assContent)

      // 验证脚本信息
      expect(result.info.Title).toBe('K-ON')
      expect(result.info['Original Script']).toBe('华盟字幕社')
      expect(result.info.PlayResX).toBe('848')
      expect(result.info.PlayResY).toBe('480')
    })

    it('should parse dialogues correctly', () => {
      const result = parseASS(assContent)

      // 验证对话数量大于0
      expect(result.dialogues.length).toBeGreaterThan(0)

      // 验证第一条对话
      const firstDialogue = result.dialogues[0]
      expect(firstDialogue).toHaveProperty('id')
      expect(firstDialogue).toHaveProperty('startTime')
      expect(firstDialogue).toHaveProperty('endTime')
      expect(firstDialogue).toHaveProperty('text')
      expect(firstDialogue).toHaveProperty('style')
      expect(firstDialogue).toHaveProperty('actor')

      // 验证第一条对话的具体内容
      expect(firstDialogue.startTime).toBe('0:00:31.29')
      expect(firstDialogue.endTime).toBe('0:00:33.78')
      expect(firstDialogue.text).toBe('お姉ちゃん そろそろ起きないと…')
      expect(firstDialogue.style).toBe('zhengwen')
      expect(firstDialogue.actor).toBe('NTP')
    })

    it('should clean ASS formatting tags', () => {
      const result = parseASS(assContent)

      // 查找包含格式标签的对话
      const formattedDialogue = result.dialogues.find(d => 
        d.text.includes('Chatting Now') || d.text.includes('ガチでカシマシ')
      )

      if (formattedDialogue) {
        // 验证格式标签已被清理
        expect(formattedDialogue.text).not.toMatch(/\{[^}]*\}/)
        expect(formattedDialogue.text).not.toMatch(/\\[rn]/)
      }
    })

    it('should generate unique IDs for each dialogue', () => {
      const result = parseASS(assContent)

      const ids = result.dialogues.map(d => d.id)
      const uniqueIds = [...new Set(ids)]

      // 验证所有ID都是唯一的
      expect(ids.length).toBe(uniqueIds.length)
    })

    it('should handle empty or invalid content gracefully', () => {
      const emptyResult = parseASS('')
      expect(emptyResult.dialogues).toHaveLength(0)

      const invalidResult = parseASS('invalid content')
      expect(invalidResult.dialogues).toHaveLength(0)
    })

    it('should parse multiple dialogue lines correctly', () => {
      const result = parseASS(assContent)

      // 验证有足够的对话
      expect(result.dialogues.length).toBeGreaterThan(10)

      // 验证时间顺序
      for (let i = 1; i < Math.min(result.dialogues.length, 10); i++) {
        const prev = timeToSeconds(result.dialogues[i - 1].startTime)
        const curr = timeToSeconds(result.dialogues[i].startTime)
        
        // 大部分对话应该按时间顺序排列（允许一些例外）
        expect(curr).toBeGreaterThanOrEqual(prev - 5) // 允许5秒的误差
      }
    })
  })

  describe('timeToSeconds', () => {
    it('should convert time string to seconds correctly', () => {
      expect(timeToSeconds('0:00:31.29')).toBeCloseTo(31.29)
      expect(timeToSeconds('0:01:02.50')).toBeCloseTo(62.5)
      expect(timeToSeconds('1:30:00.00')).toBeCloseTo(5400)
    })

    it('should handle invalid time format', () => {
      expect(timeToSeconds('invalid')).toBe(0)
      expect(timeToSeconds('1:2')).toBe(0)
      expect(timeToSeconds('')).toBe(0)
    })
  })

  describe('secondsToTime', () => {
    it('should convert seconds to time string correctly', () => {
      expect(secondsToTime(31.29)).toBe('00:00:31.29')
      expect(secondsToTime(62.5)).toBe('00:01:02.50')
      expect(secondsToTime(5400)).toBe('01:30:00.00')
    })

    it('should handle edge cases', () => {
      expect(secondsToTime(0)).toBe('00:00:00.00')
      expect(secondsToTime(3661.5)).toBe('01:01:01.50')
    })
  })

  describe('Real content validation', () => {
    it('should find expected Japanese dialogue content', () => {
      const result = parseASS(assContent)

      // 查找一些预期的日语对话
      const expectedTexts = [
        'お姉ちゃん そろそろ起きないと…',
        'はッ ８時！',
        'ちッ 遅刻 遅刻ッ',
        '高校生！'
      ]

      expectedTexts.forEach(expectedText => {
        const found = result.dialogues.some(d => d.text === expectedText)
        expect(found, `Should find dialogue: "${expectedText}"`).toBe(true)
      })
    })

    it('should have reasonable dialogue distribution', () => {
      const result = parseASS(assContent)

      // 验证有普通对话和OP/ED歌词
      const regularDialogues = result.dialogues.filter(d => d.style === 'zhengwen')
      const opDialogues = result.dialogues.filter(d => d.style === 'OPJ')

      expect(regularDialogues.length).toBeGreaterThan(0)
      expect(opDialogues.length).toBeGreaterThan(0)
    })
  })
})
