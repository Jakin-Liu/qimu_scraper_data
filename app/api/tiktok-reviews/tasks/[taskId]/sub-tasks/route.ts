import { type NextRequest, NextResponse } from "next/server"
import { tiktokSubTaskQueries } from "@/lib/db"

// GET - 获取任务的所有子任务
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params

    if (!taskId) {
      return NextResponse.json({ error: "缺少任务ID" }, { status: 400 })
    }

    const subTasks = await tiktokSubTaskQueries.getSubTasksByTaskId(taskId)

    const subTaskList = subTasks.map(subTask => ({
      id: subTask.id,
      taskId: subTask.task_id,
      url: subTask.url,
      productId: subTask.product_id,
      status: subTask.status,
      currentPage: subTask.current_page,
      totalPages: subTask.total_pages,
      totalReviews: subTask.total_reviews,
      startedAt: subTask.started_at,
      completedAt: subTask.completed_at,
      errorAt: subTask.error_at,
      errorMessage: subTask.error_message,
      createdAt: subTask.created_at,
      updatedAt: subTask.updated_at
    }))

    return NextResponse.json({ subTasks: subTaskList })
  } catch (error) {
    console.error('获取子任务列表失败:', error)
    return NextResponse.json({ error: "获取子任务列表失败" }, { status: 500 })
  }
}

