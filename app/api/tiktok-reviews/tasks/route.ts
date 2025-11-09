import { type NextRequest, NextResponse } from "next/server"
import { tiktokTaskQueries } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"

// 生成唯一ID
function generateId() {
  return uuidv4()
}

// GET - 获取所有TikTok评论任务
export async function GET() {
  try {
    const tasks = await tiktokTaskQueries.getAllTasks()
    
    const taskList = tasks.map(task => ({
      id: task.id,
      status: task.status,
      urls: task.urls,
      createdAt: task.created_at,
      completedAt: task.completed_at,
      csvUrl: task.csv_url,
      error: task.error,
      remark: task.remark
    }))

    return NextResponse.json({ tasks: taskList })
  } catch (error) {
    console.error('获取TikTok评论任务列表失败:', error)
    return NextResponse.json({ error: "获取任务列表失败" }, { status: 500 })
  }
}

// POST - 创建新的TikTok评论任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { urls, remark } = body

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    // 验证URL格式（允许包含查询参数，支持 shop.tiktok.com 和 www.tiktok.com）
    const tiktokShopUrlPattern = /^https:\/\/(shop|www)\.tiktok\.com\/view\/product\/\d+/
    const invalidUrls = urls.filter(url => {
      // 移除查询参数后验证
      const urlWithoutQuery = url.split('?')[0]
      return !tiktokShopUrlPattern.test(urlWithoutQuery)
    })
    if (invalidUrls.length > 0) {
      return NextResponse.json({ 
        error: `以下URL格式不正确：${invalidUrls.join(', ')}` 
      }, { status: 400 })
    }

    const taskId = generateId()
    
    // 在数据库中创建任务（会自动创建子任务）
    await tiktokTaskQueries.createTask(taskId, urls, remark)

    return NextResponse.json({
      taskId,
      message: "TikTok评论任务创建成功",
    })
  } catch (error) {
    console.error('创建TikTok评论任务失败:', error)
    return NextResponse.json({ error: "创建任务失败" }, { status: 500 })
  }
}

// PUT - 启动TikTok评论任务
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId } = body

    if (!taskId) {
      return NextResponse.json({ error: "缺少必要参数: taskId" }, { status: 400 })
    }

    // 检查任务是否存在
    const task = await tiktokTaskQueries.getTaskById(taskId)
    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 })
    }

    // 检查任务状态
    if (task.status !== 'pending') {
      return NextResponse.json({ 
        error: `任务状态为 ${task.status}，无法启动。只有等待中的任务可以启动` 
      }, { status: 400 })
    }

    // 异步启动抓取任务
    startTikTokReviewScraping(taskId)

    return NextResponse.json({
      message: "任务启动成功",
      taskId
    })
  } catch (error) {
    console.error('启动TikTok评论任务失败:', error)
    return NextResponse.json({ error: "启动任务失败" }, { status: 500 })
  }
}

// 后台抓取函数
async function startTikTokReviewScraping(taskId: string) {
  try {
    // 更新状态为处理中
    await tiktokTaskQueries.updateTaskStatus(taskId, "processing")

    // 获取任务信息
    const task = await tiktokTaskQueries.getTaskById(taskId)
    if (!task) return

    console.log(`开始抓取TikTok评论任务 ${taskId}，URLs: ${task.urls.join(', ')}`)

    // 导入爬虫模块并开始抓取
    const { scrapeTikTokReviewsTask } = await import('@/lib/tiktok-reviews-scraper')
    await scrapeTikTokReviewsTask(taskId)

    console.log(`任务 ${taskId} 处理完成`)
  } catch (error) {
    console.error(`任务 ${taskId} 处理失败:`, error)
    // 更新任务状态为失败
    await tiktokTaskQueries.updateTaskStatus(taskId, "failed", undefined, error instanceof Error ? error.message : "未知错误")
  }
}

