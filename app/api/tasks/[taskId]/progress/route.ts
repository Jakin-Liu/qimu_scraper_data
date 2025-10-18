import { type NextRequest, NextResponse } from "next/server"
import { taskProgressQueries, taskQueries } from "@/lib/db"

// GET - 获取任务进度
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params

    // 获取任务信息
    const task = await taskQueries.getTaskById(taskId)
    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 })
    }

    // 获取任务的所有进度记录
    const progressList = await taskProgressQueries.getProgressByTaskId(taskId)

    // 转换数据格式以匹配前端期望
    const progressData = progressList.map(progress => ({
      id: progress.id,
      taskId: progress.task_id,
      url: progress.url,
      currentPage: progress.current_page,
      totalPages: progress.total_pages,
      status: progress.status,
      startedAt: progress.started_at,
      completedAt: progress.completed_at,
      errorAt: progress.error_at,
      errorMessage: progress.error_message,
      createdAt: progress.created_at,
      updatedAt: progress.updated_at
    }))

    // 从任务的urls字段获取总URL数
    const totalUrls = task.urls ? task.urls.length : 0
    const completedUrls = progressList.filter(p => p.status === 'completed').length
    const failedUrls = progressList.filter(p => p.status === 'failed').length
    const processingUrls = progressList.filter(p => p.status === 'processing').length
    const pendingUrls = progressList.filter(p => p.status === 'pending').length

    const totalPages = progressList.reduce((sum, p) => sum + p.current_page, 0)
    const maxPages = progressList.reduce((sum, p) => sum + p.total_pages, 0)

    return NextResponse.json({
      progress: progressData,
      summary: {
        totalUrls,
        completedUrls,
        failedUrls,
        processingUrls,
        pendingUrls,
        totalPages,
        maxPages,
        completionRate: totalUrls > 0 ? Math.round((completedUrls / totalUrls) * 100) : 0
      },
      taskUrls: task.urls || []
    })
  } catch (error) {
    console.error('获取任务进度失败:', error)
    return NextResponse.json({ error: "获取任务进度失败" }, { status: 500 })
  }
}
