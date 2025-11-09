// TikTok 评论数据抓取服务
import { tiktokSubTaskQueries, tiktokReviewQueries } from './db'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

interface TikTokReviewResponse {
  has_more: boolean
  total_reviews: string
  product_reviews: Array<{
    review_id: string
    product_id: string
    sku_id: string
    reviewer_id: string
    review_rating: number
    review_time: string
    is_verified_purchase: boolean
    is_incentivized_review: boolean
    product_name: string
    reviewer_name: string
    reviewer_avatar_url: string
    review_text: string
    display_image_url: string
    review_images: string[]
    sku_specification: string
    review_country: string
  }>
  review_ratings?: {
    review_count: string
    overall_score: number
    rating_result: Record<string, string>
  }
  base_resp: {
    StatusCode: number
    StatusMessage: string
  }
}

// 抓取配置
const SCRAPING_CONFIG = {
  PAGE_SIZE: 100, // 固定每页 100 条
  REQUEST_DELAY: 1000, // 请求间延迟（毫秒）
  FAILURE_DELAY: 2000, // 失败后延迟（毫秒）
  MAX_CONSECUTIVE_FAILURES: 3, // 最大连续失败次数
}

// 基础 Cookie（可以从环境变量获取，如果没有则使用默认值）
const BASE_COOKIES = process.env.TIKTOK_SHOP_COOKIES || 'passport_csrf_token=b258f8cbff778e723b00ecc45f6d1866; passport_csrf_token_default=b258f8cbff778e723b00ecc45f6d1866; tt_chain_token=9YEbY2SRN2gd7J68R5kHxg==; d_ticket=e34024158624152cdf1690517325c640b800e; multi_sids=7564989956658480144%3Acd562a2c279fcaa498faa0215ec01d1f; cmpl_token=AgQQAPNUF-RO0rjC0O9QNB0p8p2nojRKv5bfYNxo9g; passport_auth_status=70e447b6827c6c72986cca78662cf6d1%2C; passport_auth_status_ss=70e447b6827c6c72986cca78662cf6d1%2C; sid_guard=cd562a2c279fcaa498faa0215ec01d1f%7C1761362089%7C15552000%7CThu%2C+23-Apr-2026+03%3A14%3A49+GMT; uid_tt=4af40fbfac34be823103438b3d8f110243ccfe32ca84495c3c072fb4d370fe5a; uid_tt_ss=4af40fbfac34be823103438b3d8f110243ccfe32ca84495c3c072fb4d370fe5a; sid_tt=cd562a2c279fcaa498faa0215ec01d1f; sessionid=cd562a2c279fcaa498faa0215ec01d1f; sessionid_ss=cd562a2c279fcaa498faa0215ec01d1f; tt_session_tlb_tag=sttt%7C4%7CzVYqLCefyqSY-qAhXsAdH_________-8IrOhhhR8sjq4k2ebXm-ayWELZxbyvSACxB9Y4PUOFyY%3D; sid_ucp_v1=1.0.0-KDI5NmU0ZTczOGI3MTk2M2FkOWI1YmE4NjIxYThmZGMxNmZkNWU5ZDMKIgiQiJvAjcmP_mgQqYHxxwYYswsgDDCX_fDHBjgCQOwHSAQQAxoDc2cxIiBjZDU2MmEyYzI3OWZjYWE0OThmYWEwMjE1ZWMwMWQxZg; ssid_ucp_v1=1.0.0-KDI5NmU0ZTczOGI3MTk2M2FkOWI1YmE4NjIxYThmZGMxNmZkNWU5ZDMKIgiQiJvAjcmP_mgQqYHxxwYYswsgDDCX_fDHBjgCQOwHSAQQAxoDc2cxIiBjZDU2MmEyYzI3OWZjYWE0OThmYWEwMjE1ZWMwMWQxZg; store-idc=alisg; store-country-code=ae; store-country-code-src=uid; tt-target-idc=alisg; tt-target-idc-sign=SHhrhIUAwzgZGea3KyEtDb727Q6kzZPy4HDAneZMua6zWQX3bbVm0PJzqFOF4Yqse-LttmDpOUkDJ4EdZUSnDBJPzo-SgOBEJAogrhVvam67QbjP33HgDHUvYsPBybMy5fB0y7F_VukjDB_P-fjIKEYU8xY2WeUiCUVr4Dr_wRYKTHNAXoOdyI007V_Xj2x-Y1EG3HswTRFhSbrwEh3f_eBxvhNVwUh2raG0hqdB6oZGQ944Os39vCAumr0Bw_cQBpZUMRKhhHszNZAoGNHNZMy2D5-pFOBOTRroWhUGNY7rAhZ-vU4u1Mtb8ixDXMpsmi4Xjj5geZWkk4MnxixPhahlfV3JCbFSnC5kHjHBqa3--8Vf966IwLjAmuA4JjaybzN0USCtHRsHyvvuHIV9zyKS94bCpnmcBf1bVNpECFx85rIOaV4uWOkwox-HQyyHHtHpvFa-lpX0Bmeyxox0l6ElTtes0FzaLqsuwWEf3zD6HQOtka8iI8-2VmlY9fRS; _ga=GA1.1.577689209.1761381649; _fbp=fb.1.1761381649604.1640540731; tta_attr_id_mirror=0.1762268458.7568885393215471624; _ga_HV1FL86553=GS2.1.s1762268561$o1$g1$t1762268561$j60$l0$h1139544813; _tt_enable_cookie=1; _ga_Y2RSHPPW88=GS2.1.s1762268563$o1$g1$t1762268563$j60$l0$h1997141982; FPID=FPID2.2.%2BXM3aio64K66NDWf0kOmNXMYxe4RL8fhWeyXAeNBbcU%3D.1761381649; FPAU=1.2.1082480070.1762268564; ttcsid=1762268562540::6FucUPHzvEpTru5WDUp_.1.1762268565296.0; ttcsid_C97F14JC77U63IDI7U40=1762268562540::yqh2-N3WPLgW0pBUVs3W.1.1762268565296.0; ttwid=1%7C1df4v1kSJWaG6o3k4egwx3_4OfVfAmapsHNo9UIj6fY%7C1762268921%7Ce606ddbde774957b7e91c85cb45d234f9a5dac5f155ebf1dd6f096d501754d8e; _ttp=352iezLSIuvJKOWoZ6pkcY557y2; tt_csrf_token=5dBRdan5-P5SfGdFHaLjN7I4AaTbQG4v4qdk; s_v_web_id=verify_mhr3rphf_UlHNBJkQ_Gefj_4MEK_9ezO_RJBs2qXnbhSO; ttwid=1%7C1df4v1kSJWaG6o3k4egwx3_4OfVfAmapsHNo9UIj6fY%7C1762655841%7Cf7c77a62ea05ff4f119f3bb4e668d4e43171908e236007d784f74a6e3e2eb5cb; store-country-sign=MEIEDHJqAZMbV2oIv6C_ygQgIdLcNo0HG9oiFFwVWsWIRXpo68BPE4QV3XBf6mO__E4EEF3T_hKptVzRmaK57ho9YJ4; dkms-type=0; FPLC=WwIzCV5G%2FYmd4%2Fvj5FxqgoigljDvykb7m1Ive754d06qVixnoI11gl%2FK3cU2Ma9AZhKDjcWvNAOrwOqAC7fDwQ6pJ3OeJ9fQ8b%2BVBS0nyYc896F7r9ELdjzQEOpvrw%3D%3D; odin_tt=32295041f13c66c28605dbf7bbe57f7c284c97442986f551c419bca4e5d1d04bc43af2d7a7e14448b5aa4dc87191d525c6311c8f5fad0b595e6341087ba18f5b680dd3f6e40ef369c01cf625e027ca56; webID=7564990269181232660; dkms-token=MIGPBAymjXwHJXBtbFGjBoIEbZPjrEnGCwDYHC49Atcr4H3l0LUia1oeCCQnhe8SV61O33xCUb9Lyb+VeOIGdz8CnLI8Nf2bPXQ8n42MYq7yQXaZSS17FnhmL6BiHdZzsfRRDcS29uCrOl09Iv3mC6k1I0ofUjxXuqYM3+9c2zUEEOA2xRfSwT+/XF1SDJUxqJE=; _ga_NBFTJ2P3P3=GS1.1.1762656087.3.1.1762658299.0.0.1615842262; msToken=1oRZZxcnD0yoPn7RzIuuQrbnhEACqQSMdgm5pxM_waSyUKSnPKw26uPLgIxIQ5AelxJLeILHXxC5PZ3Co2kEJlMkWF0jDtmUA1Sx-AMeD-Zdk6fISpd5BPyH9Usuz4R59dUDYR1ZWg==; msToken=1oRZZxcnD0yoPn7RzIuuQrbnhEACqQSMdgm5pxM_waSyUKSnPKw26uPLgIxIQ5AelxJLeILHXxC5PZ3Co2kEJlMkWF0jDtmUA1Sx-AMeD-Zdk6fISpd5BPyH9Usuz4R59dUDYR1ZWg=='

// 从 URL 中提取 product_id
function extractProductId(url: string): string | null {
  // 匹配 https://shop.tiktok.com/view/product/商品ID 或 https://www.tiktok.com/view/product/商品ID
  const match = url.match(/\/product\/(\d+)/)
  return match ? match[1] : null
}

// 抓取单页评论数据
async function scrapeSinglePage(
  productId: string,
  pageStart: number,
  refererUrl: string
): Promise<TikTokReviewResponse> {
  const apiUrl = 'https://shop.tiktok.com/api/shop/pdp_h5/get_product_reviews'
  
  const requestBody = {
    product_id: productId,
    page_start: pageStart,
    page_size: SCRAPING_CONFIG.PAGE_SIZE,
    sort_rule: 2,
    review_filter: {
      filter_type: 1,
      filter_value: 6
    }
  }

  console.log(`抓取商品 ${productId} 第 ${pageStart} 页评论: ${JSON.stringify(requestBody)}`)

  // 转义函数：将单引号转义为 '\''（在单引号字符串中插入单引号的方式）
  const escapeForShell = (str: string): string => {
    return str.replace(/'/g, "'\\''")
  }
  
  // 转义 JSON 字符串中的单引号，以便在 shell 中使用
  const requestBodyStr = escapeForShell(JSON.stringify(requestBody))
  
  // 转义 referer URL 中的特殊字符
  const escapedReferer = escapeForShell(refererUrl)
  
  // 转义 Cookie 字符串中的特殊字符
  const escapedCookies = escapeForShell(BASE_COOKIES)

  // 构建 curl 命令（使用单引号包裹需要转义的字符串）
  const curlCmd = `curl '${apiUrl}' \\
    -H 'accept: application/json,*/*;q=0.8' \\
    -H 'accept-language: zh-CN,zh;q=0.9' \\
    -H 'content-type: application/json' \\
    -H 'origin: https://shop.tiktok.com' \\
    -H 'priority: u=1, i' \\
    -H 'referer: ${escapedReferer}' \\
    -H 'sec-ch-ua: "Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"' \\
    -H 'sec-ch-ua-mobile: ?0' \\
    -H 'sec-ch-ua-platform: "macOS"' \\
    -H 'sec-fetch-dest: empty' \\
    -H 'sec-fetch-mode: cors' \\
    -H 'sec-fetch-site: same-origin' \\
    -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' \\
    -b '${escapedCookies}' \\
    --data-raw '${requestBodyStr}'`

  try {
    const { stdout, stderr } = await execAsync(curlCmd)

    if (stderr) {
      console.warn(`curl stderr: ${stderr}`)
    }

    // 解析 JSON 响应
    const data: TikTokReviewResponse = JSON.parse(stdout.trim())

    // 检查响应状态
    if (data.base_resp?.StatusCode !== 0) {
      throw new Error(`API返回错误: ${data.base_resp?.StatusMessage || '未知错误'}`)
    }

    return data
  } catch (error: any) {
    if (error.stdout) {
      // 尝试解析错误响应
      try {
        const errorData = JSON.parse(error.stdout.trim())
        throw new Error(`API请求失败: ${errorData.base_resp?.StatusMessage || error.message}`)
      } catch (parseError) {
        throw new Error(`API请求失败: ${error.message || '未知错误'}`)
      }
    }
    throw new Error(`curl执行失败: ${error.message || '未知错误'}`)
  }
}

// 将评论数据转换为数据库格式
function convertReviewToDbFormat(
  review: TikTokReviewResponse['product_reviews'][0],
  subTaskId: string,
  taskId: string
) {
  return {
    subTaskId,
    taskId,
    reviewId: review.review_id,
    productId: review.product_id,
    skuId: review.sku_id,
    productName: review.product_name,
    reviewerId: review.reviewer_id,
    reviewerName: review.reviewer_name,
    reviewerAvatarUrl: review.reviewer_avatar_url,
    reviewRating: review.review_rating,
    reviewText: review.review_text || '',
    reviewImages: review.review_images || [],
    displayImageUrl: review.display_image_url || '',
    reviewTime: review.review_time,
    reviewCountry: review.review_country,
    skuSpecification: review.sku_specification || '',
    isVerifiedPurchase: review.is_verified_purchase,
    isIncentivizedReview: review.is_incentivized_review,
    rawData: review,
    status: 'active' as const
  }
}

// 2024年1月1日 00:00:00 的时间戳（毫秒）
const CUTOFF_TIMESTAMP = new Date('2024-01-01T00:00:00Z').getTime()

// 检查评论时间是否在2024年之后
function isReviewAfter2024(reviewTime: string | number): boolean {
  const timestamp = typeof reviewTime === 'string' ? parseInt(reviewTime) : reviewTime
  if (isNaN(timestamp) || timestamp <= 0) {
    return true // 如果时间戳无效，默认保留
  }
  return timestamp >= CUTOFF_TIMESTAMP
}

// 抓取商品的所有评论
export async function scrapeTikTokReviews(
  subTaskId: string,
  taskId: string,
  url: string
): Promise<number> {
  try {
    // 从 URL 中提取 product_id
    const productId = extractProductId(url)
    if (!productId) {
      throw new Error(`无法从URL中提取product_id: ${url}`)
    }

    console.log(`开始抓取商品 ${productId} 的评论数据（子任务: ${subTaskId}），只抓取2024年1月1日之后的数据...`)

    // 更新子任务状态为处理中
    await tiktokSubTaskQueries.updateSubTaskStatus(
      subTaskId,
      'processing',
      new Date().toISOString()
    )

    let pageStart = 1
    let hasMore = true
    let totalReviews = 0
    let totalPages = 0
    let consecutiveFailures = 0
    let shouldStop = false // 是否应该停止抓取（遇到2024年之前的数据）

    // 获取第一页以确定总评论数
    try {
      const firstPageData = await scrapeSinglePage(productId, 1, url)
      const totalReviewsCount = parseInt(firstPageData.total_reviews || '0')
      totalPages = Math.ceil(totalReviewsCount / SCRAPING_CONFIG.PAGE_SIZE)
      
      console.log(`商品 ${productId} 总评论数: ${totalReviewsCount}, 预计页数: ${totalPages}`)

      // 更新子任务总页数
      await tiktokSubTaskQueries.updateSubTaskProgress(
        subTaskId,
        0,
        totalPages,
        0
      )

      // 处理第一页数据
      if (firstPageData.product_reviews && firstPageData.product_reviews.length > 0) {
        // 过滤出2024年之后的数据
        const validReviews = firstPageData.product_reviews.filter(review => {
          if (!review.review_time) return true // 如果没有时间戳，默认保留
          return isReviewAfter2024(review.review_time)
        })

        // 检查是否有2024年之前的数据
        if (validReviews.length < firstPageData.product_reviews.length) {
          console.log(`第 1 页发现 ${firstPageData.product_reviews.length - validReviews.length} 条2024年之前的数据，将在处理完当前页后停止抓取`)
          shouldStop = true
        }

        if (validReviews.length > 0) {
          const reviews = validReviews.map(review =>
            convertReviewToDbFormat(review, subTaskId, taskId)
          )
          
          await tiktokReviewQueries.createReviews(reviews)
          totalReviews += reviews.length
          console.log(`第 1 页数据已写入数据库，${reviews.length} 条记录（过滤后）`)

          // 更新子任务进度
          await tiktokSubTaskQueries.updateSubTaskProgress(
            subTaskId,
            1,
            totalPages,
            totalReviews
          )
        }

        // 如果发现2024年之前的数据，停止抓取
        if (shouldStop) {
          console.log(`已遇到2024年之前的数据，停止抓取`)
          hasMore = false
        } else {
          hasMore = firstPageData.has_more
          pageStart = 2 // 从第2页开始
        }
      } else {
        hasMore = firstPageData.has_more
        pageStart = 2 // 从第2页开始
      }
    } catch (error) {
      console.error(`获取第1页数据失败:`, error)
      consecutiveFailures++
      if (consecutiveFailures >= SCRAPING_CONFIG.MAX_CONSECUTIVE_FAILURES) {
        throw new Error(`连续失败 ${consecutiveFailures} 次，停止抓取`)
      }
    }

    // 继续抓取后续页面
    while (hasMore && !shouldStop && consecutiveFailures < SCRAPING_CONFIG.MAX_CONSECUTIVE_FAILURES) {
      try {
        await new Promise(resolve => setTimeout(resolve, SCRAPING_CONFIG.REQUEST_DELAY))

        const pageData = await scrapeSinglePage(productId, pageStart, url)

        if (pageData.product_reviews && pageData.product_reviews.length > 0) {
          // 过滤出2024年之后的数据
          const validReviews = pageData.product_reviews.filter(review => {
            if (!review.review_time) return true // 如果没有时间戳，默认保留
            return isReviewAfter2024(review.review_time)
          })

          // 检查是否有2024年之前的数据
          if (validReviews.length < pageData.product_reviews.length) {
            console.log(`第 ${pageStart} 页发现 ${pageData.product_reviews.length - validReviews.length} 条2024年之前的数据，将在处理完当前页后停止抓取`)
            shouldStop = true
          }

          if (validReviews.length > 0) {
            const reviews = validReviews.map(review =>
              convertReviewToDbFormat(review, subTaskId, taskId)
            )
            
            await tiktokReviewQueries.createReviews(reviews)
            totalReviews += reviews.length
            console.log(`第 ${pageStart} 页数据已写入数据库，${reviews.length} 条记录（过滤后），累计 ${totalReviews} 条`)

            // 更新子任务进度
            await tiktokSubTaskQueries.updateSubTaskProgress(
              subTaskId,
              pageStart,
              totalPages,
              totalReviews
            )
          }

          // 如果发现2024年之前的数据，停止抓取
          if (shouldStop) {
            console.log(`已遇到2024年之前的数据，停止抓取`)
            hasMore = false
          } else {
            hasMore = pageData.has_more
            pageStart++
            consecutiveFailures = 0 // 重置失败计数
          }
        } else {
          console.log(`第 ${pageStart} 页没有数据，停止抓取`)
          hasMore = false
        }
      } catch (error) {
        console.error(`抓取第 ${pageStart} 页失败:`, error)
        consecutiveFailures++
        
        if (consecutiveFailures >= SCRAPING_CONFIG.MAX_CONSECUTIVE_FAILURES) {
          console.error(`连续失败 ${consecutiveFailures} 次，停止抓取`)
          await tiktokSubTaskQueries.updateSubTaskStatus(
            subTaskId,
            'failed',
            undefined,
            undefined,
            new Date().toISOString(),
            error instanceof Error ? error.message : '连续失败次数过多'
          )
          throw error
        }

        // 失败后延迟更长时间
        await new Promise(resolve => setTimeout(resolve, SCRAPING_CONFIG.FAILURE_DELAY))
        pageStart++ // 跳过当前页，继续下一页
      }
    }

    // 更新子任务状态为完成
    await tiktokSubTaskQueries.updateSubTaskStatus(
      subTaskId,
      'completed',
      undefined,
      new Date().toISOString()
    )

    // 更新最终进度
    await tiktokSubTaskQueries.updateSubTaskProgress(
      subTaskId,
      pageStart - 1,
      totalPages,
      totalReviews
    )

    console.log(`商品 ${productId} 抓取完成，共获得 ${totalReviews} 条评论，实际抓取页数: ${pageStart - 1}`)
    
    return totalReviews
  } catch (error) {
    console.error(`抓取商品评论失败（子任务: ${subTaskId}）:`, error)
    // 更新子任务状态为失败
    await tiktokSubTaskQueries.updateSubTaskStatus(
      subTaskId,
      'failed',
      undefined,
      undefined,
      new Date().toISOString(),
      error instanceof Error ? error.message : '未知错误'
    )
    throw error
  }
}

// 主要抓取函数 - 处理任务的所有子任务
export async function scrapeTikTokReviewsTask(taskId: string): Promise<void> {
  try {
    // 获取所有子任务
    const subTasks = await tiktokSubTaskQueries.getSubTasksByTaskId(taskId)

    if (subTasks.length === 0) {
      console.log(`任务 ${taskId} 没有子任务`)
      return
    }

    console.log(`开始处理任务 ${taskId}，共 ${subTasks.length} 个子任务`)

    // 并行处理子任务（可以调整并发数）
    const CONCURRENT_SUB_TASKS = 3 // 同时处理3个子任务
    for (let i = 0; i < subTasks.length; i += CONCURRENT_SUB_TASKS) {
      const batch = subTasks.slice(i, i + CONCURRENT_SUB_TASKS)
      
      console.log(`开始处理第 ${Math.floor(i / CONCURRENT_SUB_TASKS) + 1} 批子任务，共 ${batch.length} 个`)

      // 并行处理当前批次的子任务
      const batchPromises = batch.map(async (subTask) => {
        try {
          await scrapeTikTokReviews(subTask.id, taskId, subTask.url)
          console.log(`子任务 ${subTask.id} 处理完成`)
        } catch (error) {
          console.error(`子任务 ${subTask.id} 处理失败:`, error)
        }
      })

      await Promise.all(batchPromises)

      // 批次间添加延迟
      if (i + CONCURRENT_SUB_TASKS < subTasks.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    // 检查所有子任务状态
    const finalSubTasks = await tiktokSubTaskQueries.getSubTasksByTaskId(taskId)
    const completedCount = finalSubTasks.filter(st => st.status === 'completed').length
    const failedCount = finalSubTasks.filter(st => st.status === 'failed').length

    // 如果所有子任务都完成，更新主任务状态为完成
    if (completedCount === finalSubTasks.length) {
      const { tiktokTaskQueries } = await import('./db')
      await tiktokTaskQueries.updateTaskStatus(taskId, 'completed')
      console.log(`任务 ${taskId} 所有子任务已完成`)
    } else if (failedCount === finalSubTasks.length) {
      // 如果所有子任务都失败，更新主任务状态为失败
      const { tiktokTaskQueries } = await import('./db')
      await tiktokTaskQueries.updateTaskStatus(taskId, 'failed', undefined, '所有子任务都失败')
      console.log(`任务 ${taskId} 所有子任务都失败`)
    } else {
      // 部分完成，保持处理中状态
      console.log(`任务 ${taskId} 部分完成：${completedCount}/${finalSubTasks.length} 个子任务已完成`)
    }
  } catch (error) {
    console.error(`处理任务 ${taskId} 失败:`, error)
    const { tiktokTaskQueries } = await import('./db')
    await tiktokTaskQueries.updateTaskStatus(taskId, 'failed', undefined, error instanceof Error ? error.message : '未知错误')
    throw error
  }
}

