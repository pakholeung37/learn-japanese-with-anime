import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  try {
    // 只在开发环境提供此API
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "此API仅在开发环境可用" },
        { status: 403 },
      )
    }

    const { default: fileStore } = await import("@/lib/file-store")
    const stats = await fileStore.getStats()

    return NextResponse.json({
      environment: "development",
      storage: "file",
      stats,
      note: "数据存储在本地 data/db.json 中，持久化保存",
    })
  } catch (error) {
    console.error("获取开发信息失败:", error)
    return NextResponse.json({ error: "获取开发信息失败" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    // 只在开发环境提供此API
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "此API仅在开发环境可用" },
        { status: 403 },
      )
    }

    const { default: fileStore } = await import("@/lib/file-store")
    await fileStore.clear()

    return NextResponse.json({
      message: "本地文件数据库已清空",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("清空数据失败:", error)
    return NextResponse.json({ error: "清空数据失败" }, { status: 500 })
  }
}
