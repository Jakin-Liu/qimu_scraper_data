import { type NextRequest, NextResponse } from "next/server"
import { tiktokTaskQueries } from "@/lib/db"

// GET - 获取单个 TikTok 任务详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params

    if (!taskId) {
      return NextResponse.json({ error: "缺少任务ID" }, { status: 400 })
    }

    const task = await tiktokTaskQueries.getTaskById(taskId)
    
    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 })
    }

    return NextResponse.json({
      id: task.id,
      status: task.status,
      urls: task.urls,
      createdAt: task.created_at,
      completedAt: task.completed_at,
      csvUrl: task.csv_url,
      error: task.error,
      remark: task.remark
    })
  } catch (error) {
    console.error('获取任务详情失败:', error)
    return NextResponse.json({ error: "获取任务详情失败" }, { status: 500 })
  }
}

