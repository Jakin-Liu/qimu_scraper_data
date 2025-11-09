import { type NextRequest, NextResponse } from "next/server"
import { tiktokSubTaskQueries, tiktokReviewQueries } from "@/lib/db"
import pool from "@/lib/db"

// GET - 下载TikTok子任务的CSV文件
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subTaskId: string }> }
) {
  try {
    const { subTaskId } = await params

    if (!subTaskId) {
      return NextResponse.json({ error: "缺少子任务ID" }, { status: 400 })
    }

    // 检查子任务是否存在
    const subTask = await tiktokSubTaskQueries.getSubTaskById(subTaskId)
    if (!subTask) {
      return NextResponse.json({ error: "子任务不存在" }, { status: 404 })
    }

    // 检查子任务状态
    if (subTask.status !== 'completed') {
      return NextResponse.json({ 
        error: `子任务状态为 ${subTask.status}，无法下载。只有已完成的子任务可以下载` 
      }, { status: 400 })
    }

    // 获取子任务的所有评论（不分页，获取全部）
    const client = await pool.connect()
    let results
    try {
      const result = await client.query(`
        SELECT * FROM tiktok_reviews
        WHERE sub_task_id = $1
        ORDER BY 
          COALESCE(review_time_parsed, TO_TIMESTAMP(review_time / 1000)) DESC NULLS LAST,
          review_time DESC NULLS LAST,
          created_at DESC
      `, [subTaskId])
      
      results = result.rows
    } finally {
      client.release()
    }

    if (results.length === 0) {
      return NextResponse.json({ error: "子任务没有数据" }, { status: 404 })
    }

      // 生成CSV内容
      const csvHeaders = [
        'ID',
        '任务ID',
        '子任务ID',
        '评论ID',
        '商品ID',
        'SKU ID',
        '商品名称',
        '评论者ID',
        '评论者昵称',
        '评分',
        '评论文本',
        '评论图片',
        '显示图片URL',
        '评论时间(时间戳)',
        '评论时间(解析)',
        '评论国家',
        'SKU规格',
        '是否已验证购买',
        '是否激励评论',
        '创建时间'
      ]

      const csvRows = results.map((result, index) => {
        // 格式化评论时间
        let reviewTimeParsed = ''
        if (result.review_time_parsed) {
          reviewTimeParsed = new Date(result.review_time_parsed).toLocaleString("zh-CN")
        } else if (result.review_time) {
          const timestamp = typeof result.review_time === 'string' ? parseInt(result.review_time) : result.review_time
          if (!isNaN(timestamp) && timestamp > 0) {
            reviewTimeParsed = new Date(timestamp).toLocaleString("zh-CN")
          }
        }

        // 格式化评论图片数组（多张图片时换行显示）
        const reviewImages = result.review_images || []
        const reviewImagesStr = Array.isArray(reviewImages) ? reviewImages.join('\n') : ''

        return [
          index + 1,
          result.task_id || '',
          result.sub_task_id || '',
          result.review_id || '',
          result.product_id || '',
          result.sku_id || '',
          result.product_name || '',
          result.reviewer_id || '',
          result.reviewer_name || '',
          result.review_rating || result.rating || '',
          result.review_text || result.comment_text || '',
          reviewImagesStr,
          result.display_image_url || '',
          result.review_time || '',
          reviewTimeParsed,
          result.review_country || '',
          result.sku_specification || '',
          result.is_verified_purchase ? '是' : '否',
          result.is_incentivized_review ? '是' : '否',
          result.created_at || ''
        ]
      })

      // 构建CSV内容
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => 
          row.map(cell => {
            // 处理包含逗号、引号或换行符的单元格
            const cellStr = String(cell || '')
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`
            }
            return cellStr
          }).join(',')
        )
      ].join('\n')

      // 添加BOM以支持中文Excel
      const BOM = '\uFEFF'
      const csvWithBOM = BOM + csvContent

      // 返回CSV文件
      return new NextResponse(csvWithBOM, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="tiktok-subtask-${subTaskId}-results.csv"`,
        },
      })
  } catch (error) {
    console.error('生成CSV文件失败:', error)
    return NextResponse.json({ error: "生成CSV文件失败" }, { status: 500 })
  }
}

