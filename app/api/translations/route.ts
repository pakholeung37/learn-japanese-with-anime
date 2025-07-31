import { NextRequest, NextResponse } from "next/server"
import { saveTranslation, deleteTranslation } from "@/lib/kv-service"
import { Translation } from "@/types/anime"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { episodeId, subtitleId, originalText, translatedText } = body

    if (!episodeId || !subtitleId || !originalText || !translatedText) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    const translation: Translation = {
      id: `${episodeId}-${subtitleId}`,
      episodeId,
      subtitleId,
      originalText,
      translatedText,
      timestamp: Date.now(),
    }

    await saveTranslation(translation)

    return NextResponse.json({ success: true, translation })
  } catch (error) {
    console.error("保存翻译失败:", error)
    return NextResponse.json({ error: "保存翻译失败" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { episodeId, subtitleId } = body

    if (!episodeId || !subtitleId) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    await deleteTranslation(episodeId, subtitleId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("删除翻译失败:", error)
    return NextResponse.json({ error: "删除翻译失败" }, { status: 500 })
  }
}
