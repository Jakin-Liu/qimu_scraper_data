import { type NextRequest, NextResponse } from "next/server"
import { taskQueries, scrapingResultQueries } from "@/lib/db"

// GET - 生成并下载任务的CSV文件
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params

    // 检查任务是否存在
    const task = await taskQueries.getTaskById(taskId)
    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 })
    }

    // 检查任务状态 - 只有已完成的任务可以下载CSV
    if (task.status !== 'completed') {
      return NextResponse.json({ 
        error: `任务状态为 ${task.status}，只有已完成的任务可以下载CSV` 
      }, { status: 400 })
    }
    
    console.log(`任务 ${taskId} 状态: ${task.status}，开始生成CSV数据`)

    // 获取任务的抓取结果
    const results = await scrapingResultQueries.getResultsByTaskId(taskId)
    
    // 即使没有数据也生成CSV文件（包含表头）
    console.log(`任务 ${taskId} 找到 ${results.length} 条抓取结果`)

    // 生成CSV内容
    const csvContent = generateCSVFromResults(results)

    // 设置响应头
    const headers = new Headers()
    headers.set('Content-Type', 'text/csv; charset=utf-8')
    headers.set('Content-Disposition', `attachment; filename="task-${taskId}-results.csv"`)
    headers.set('Cache-Control', 'no-cache')

    return new NextResponse(csvContent, {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('生成CSV失败:', error)
    return NextResponse.json({ error: "生成CSV失败" }, { status: 500 })
  }
}

// 生成CSV内容（从抓取结果）
function generateCSVFromResults(results: Array<{
  id: number
  task_id: string
  task_url: string
  influencer_name: string | null
  influencer_followers: number | null
  country_region: string | null
  fastmoss_detail_url: string | null
  product_sales_count: number | null
  product_sales_amount: number | null
  influencer_id: string | null
  sale_amount_show: string | null
  raw_data: any
  status: string
  created_at: string
  updated_at: string
}>) {
  const headers = [
    "任务ID", "商品URL", "达人昵称", "达人粉丝数", "国家/地区", 
    "FastMoss详情页链接", "商品销量", "商品销售额", "达人ID", "原始销售额"
  ]
  
  // 转义CSV字段，处理包含逗号、引号或换行符的内容
  const escapeCsvField = (field: any): string => {
    if (field === null || field === undefined) return ""
    const str = String(field)
    // 如果包含逗号、引号或换行符，需要用引号包围并转义内部引号
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  
  const rows = results.map((result) => [
    escapeCsvField(result.task_id),
    escapeCsvField(result.task_url),
    escapeCsvField(result.influencer_name),
    escapeCsvField(result.influencer_followers),
    escapeCsvField(result.country_region),
    escapeCsvField(result.fastmoss_detail_url),
    escapeCsvField(result.product_sales_count),
    escapeCsvField(result.product_sales_amount),
    escapeCsvField(result.influencer_id),
    escapeCsvField(result.sale_amount_show)
  ])

  // 生成CSV内容，即使没有数据也包含表头
  const csvLines = [
    headers.map(escapeCsvField).join(","),
    ...rows.map((row) => row.join(","))
  ]

  return csvLines.join("\n")
}
