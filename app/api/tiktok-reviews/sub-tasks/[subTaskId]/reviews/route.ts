import { type NextRequest, NextResponse } from "next/server"
import { tiktokReviewQueries, tiktokSubTaskQueries } from "@/lib/db"
import pool from "@/lib/db"

// GET - 获取子任务的所有评论（分页，按 review_time 排序）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subTaskId: string }> }
) {
  try {
    const { subTaskId } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!subTaskId) {
      return NextResponse.json({ error: "缺少子任务ID" }, { status: 400 })
    }

    // 检查子任务是否存在
    const subTask = await tiktokSubTaskQueries.getSubTaskById(subTaskId)
    if (!subTask) {
      return NextResponse.json({ error: "子任务不存在" }, { status: 404 })
    }

    // 获取评论（按 review_time_parsed 降序排序，如果没有则按 review_time 降序）
    const offset = (page - 1) * limit
    const client = await pool.connect()
    try {
      // 先获取总数
      const countResult = await client.query(`
        SELECT COUNT(*) as count
        FROM tiktok_reviews
        WHERE sub_task_id = $1
      `, [subTaskId])
      const total = parseInt(countResult.rows[0].count)

      // 获取评论列表，按 review_time 降序排序（最新的在前）
      const result = await client.query(`
        SELECT * FROM tiktok_reviews
        WHERE sub_task_id = $1
        ORDER BY 
          COALESCE(review_time_parsed, TO_TIMESTAMP(review_time / 1000)) DESC NULLS LAST,
          review_time DESC NULLS LAST,
          created_at DESC
        LIMIT $2 OFFSET $3
      `, [subTaskId, limit, offset])

      const reviews = result.rows.map(review => ({
        id: review.id,
        subTaskId: review.sub_task_id,
        taskId: review.task_id,
        reviewId: review.review_id,
        productId: review.product_id,
        skuId: review.sku_id,
        productName: review.product_name,
        reviewerId: review.reviewer_id,
        reviewerName: review.reviewer_name,
        reviewerAvatarUrl: review.reviewer_avatar_url,
        reviewRating: review.review_rating,
        reviewText: review.review_text,
        reviewImages: review.review_images,
        displayImageUrl: review.display_image_url,
        reviewTime: review.review_time,
        reviewTimeParsed: review.review_time_parsed,
        reviewCountry: review.review_country,
        skuSpecification: review.sku_specification,
        isVerifiedPurchase: review.is_verified_purchase,
        isIncentivizedReview: review.is_incentivized_review,
        rawData: review.raw_data,
        status: review.status,
        createdAt: review.created_at,
        updatedAt: review.updated_at
      }))

      return NextResponse.json({
        reviews,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        subTask: {
          id: subTask.id,
          taskId: subTask.task_id,
          url: subTask.url,
          productId: subTask.product_id,
          status: subTask.status,
          totalReviews: subTask.total_reviews
        }
      })
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('获取子任务评论失败:', error)
    return NextResponse.json({ error: "获取评论列表失败" }, { status: 500 })
  }
}

