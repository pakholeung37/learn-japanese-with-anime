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

    const { default: memoryStore } = await import("@/lib/memory-store")
    const stats = memoryStore.getStats()

    return NextResponse.json({
      environment: "development",
      storage: "memory",
      stats,
      note: "数据存储在内存中，重启服务后会丢失",
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

    const { default: memoryStore } = await import("@/lib/memory-store")
    memoryStore.clear()

    return NextResponse.json({
      message: "内存数据已清空",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("清空数据失败:", error)
    return NextResponse.json({ error: "清空数据失败" }, { status: 500 })
  }
}
