import { type NextRequest, NextResponse } from "next/server"

// 使用内存存储任务（生产环境应使用数据库）
const tasks = new Map<
  string,
  {
    id: string
    status: "pending" | "processing" | "completed" | "failed"
    urls: string[]
    createdAt: string
    completedAt?: string
    csvUrl?: string
    error?: string
  }
>()

// 生成唯一ID
function generateId() {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// GET - 获取所有任务
export async function GET() {
  const taskList = Array.from(tasks.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(({ token, ...task }) => task) // 不返回token信息

  return NextResponse.json({ tasks: taskList })
}

// POST - 创建新任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { urls } = body

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    const taskId = generateId()
    const task = {
      id: taskId,
      status: "pending" as const,
      urls,
      createdAt: new Date().toISOString(),
    }

    tasks.set(taskId, task)

    // 异步启动抓取任务
    startScraping(taskId)

    return NextResponse.json({
      taskId,
      message: "任务创建成功",
    })
  } catch (error) {
    return NextResponse.json({ error: "创建任务失败" }, { status: 500 })
  }
}

// 后台抓取函数
async function startScraping(taskId: string) {
  const task = tasks.get(taskId)
  if (!task) return

  // 更新状态为处理中
  task.status = "processing"
  tasks.set(taskId, task)

  try {
    // 模拟数据抓取过程
    const scrapedData: Array<{ url: string; title: string; content: string; timestamp: string }> = []

    for (const url of task.urls) {
      try {
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const html = await response.text()

        // 简单提取标题（实际应用中应使用更复杂的解析）
        const titleMatch = html.match(/<title>(.*?)<\/title>/i)
        const title = titleMatch ? titleMatch[1] : "No title"

        scrapedData.push({
          url,
          title,
          content: html.substring(0, 500), // 截取前500字符
          timestamp: new Date().toISOString(),
        })

        // 模拟处理延迟
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        scrapedData.push({
          url,
          title: "Error",
          content: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        })
      }
    }

    // 生成CSV
    const csvContent = generateCSV(scrapedData)
    const csvUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`

    // 更新任务状态
    task.status = "completed"
    task.completedAt = new Date().toISOString()
    task.csvUrl = csvUrl
    tasks.set(taskId, task)
  } catch (error) {
    task.status = "failed"
    task.error = error instanceof Error ? error.message : "未知错误"
    task.completedAt = new Date().toISOString()
    tasks.set(taskId, task)
  }
}

// 生成CSV内容
function generateCSV(data: Array<{ url: string; title: string; content: string; timestamp: string }>) {
  const headers = ["URL", "Title", "Content", "Timestamp"]
  const rows = data.map((item) => [
    item.url,
    item.title.replace(/"/g, '""'), // 转义双引号
    item.content.replace(/"/g, '""'),
    item.timestamp,
  ])

  const csvLines = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))]

  return csvLines.join("\n")
}
