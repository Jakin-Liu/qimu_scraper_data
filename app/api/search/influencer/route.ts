import { type NextRequest, NextResponse } from "next/server"
import { scrapingResultQueries } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const influencerId = searchParams.get('influencerId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    let results, total

    if (influencerId) {
      // 搜索指定达人的商品数据
      results = await scrapingResultQueries.searchByInfluencerId(influencerId, limit, (page - 1) * limit)
      total = await scrapingResultQueries.countByInfluencerId(influencerId)
    } else {
      // 获取所有数据
      results = await scrapingResultQueries.getAllResults(limit, (page - 1) * limit)
      total = await scrapingResultQueries.countAllResults()
    }

    return NextResponse.json({
      results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('获取数据失败:', error)
    return NextResponse.json({ error: "获取数据失败" }, { status: 500 })
  }
}
