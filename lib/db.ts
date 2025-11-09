import { Pool } from 'pg'

// 数据库连接配置
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_bP4uCxh9izmG@ep-snowy-cake-a18k96av-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: {
    rejectUnauthorized: false
  }
})

// 任务相关数据库操作
export const taskQueries = {
  // 获取所有任务
  async getAllTasks() {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT id, status, urls, created_at, completed_at, csv_url, error, remark
        FROM tasks
        ORDER BY created_at DESC
      `)
      return result.rows
    } finally {
      client.release()
    }
  },

  // 根据ID获取任务
  async getTaskById(id: string) {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT id, status, urls, created_at, completed_at, csv_url, error, remark
        FROM tasks
        WHERE id = $1
      `, [id])
      return result.rows[0]
    } finally {
      client.release()
    }
  },

  // 创建新任务
  async createTask(id: string, urls: string[], remark?: string) {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        INSERT INTO tasks (id, status, urls, remark)
        VALUES ($1, 'pending', $2, $3)
        RETURNING id, status, urls, created_at, remark
      `, [id, urls, remark || null])
      return result.rows[0]
    } finally {
      client.release()
    }
  },

  // 更新任务状态
  async updateTaskStatus(id: string, status: string, csvUrl?: string, error?: string) {
    const client = await pool.connect()
    try {
      const completedAt = status === 'completed' || status === 'failed' ? new Date().toISOString() : null
      
      const result = await client.query(`
        UPDATE tasks 
        SET status = $2, completed_at = $3, csv_url = $4, error = $5
        WHERE id = $1
        RETURNING id, status, urls, created_at, completed_at, csv_url, error
      `, [id, status, completedAt, csvUrl, error])
      
      return result.rows[0]
    } finally {
      client.release()
    }
  },

  // 删除任务
  async deleteTask(id: string) {
    const client = await pool.connect()
    try {
      await client.query(`
        DELETE FROM tasks WHERE id = $1
      `, [id])
    } finally {
      client.release()
    }
  }
}

// 抓取结果相关数据库操作
export const scrapingResultQueries = {
  // 创建抓取结果记录
  async createResult(data: {
    taskId: string
    taskUrl: string
    influencerName?: string
    influencerFollowers?: number
    countryRegion?: string
    fastmossDetailUrl?: string
    productSalesCount?: number
    productSalesAmount?: number
    influencerId?: string
    saleAmountShow?: string
    rawData?: any
    status?: 'active' | 'inactive' | 'deleted'
  }) {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        INSERT INTO scraping_results (
          task_id, task_url, influencer_name, influencer_followers, 
          country_region, fastmoss_detail_url, product_sales_count, 
          product_sales_amount, influencer_id, sale_amount_show, raw_data, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, task_id, task_url, influencer_name, influencer_followers, 
                  country_region, fastmoss_detail_url, product_sales_count, 
                  product_sales_amount, influencer_id, sale_amount_show, raw_data, status, created_at, updated_at
      `, [
        data.taskId,
        data.taskUrl,
        data.influencerName || null,
        data.influencerFollowers || null,
        data.countryRegion || null,
        data.fastmossDetailUrl || null,
        data.productSalesCount || null,
        data.productSalesAmount || null,
        data.influencerId || null,
        data.saleAmountShow || null,
        data.rawData ? JSON.stringify(data.rawData) : null,
        data.status || 'active'
      ])
      return result.rows[0]
    } finally {
      client.release()
    }
  },

  // 批量创建抓取结果记录
  async createResults(results: Array<{
    taskId: string
    taskUrl: string
    influencerName?: string
    influencerFollowers?: number
    countryRegion?: string
    fastmossDetailUrl?: string
    productSalesCount?: number
    productSalesAmount?: number
    influencerId?: string
    saleAmountShow?: string
    rawData?: any
    status?: 'active' | 'inactive' | 'deleted'
  }>) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      
      for (const data of results) {
        await client.query(`
          INSERT INTO scraping_results (
            task_id, task_url, influencer_name, influencer_followers, 
            country_region, fastmoss_detail_url, product_sales_count, 
            product_sales_amount, influencer_id, sale_amount_show, raw_data, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          data.taskId,
          data.taskUrl,
          data.influencerName || null,
          data.influencerFollowers ?? null,
          data.countryRegion || null,
          data.fastmossDetailUrl || null,
          data.productSalesCount ?? null,
          data.productSalesAmount ?? null,
          data.influencerId || null,
          data.saleAmountShow || null,
          data.rawData ? JSON.stringify(data.rawData) : null,
          data.status || 'active'
        ])
      }
      
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  // 根据任务ID获取抓取结果
  async getResultsByTaskId(taskId: string) {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT id, task_id, task_url, influencer_name, influencer_followers, 
               country_region, fastmoss_detail_url, product_sales_count, 
               product_sales_amount, influencer_id, sale_amount_show, raw_data, status, created_at, updated_at
        FROM scraping_results 
        WHERE task_id = $1
        ORDER BY created_at DESC
      `, [taskId])
      return result.rows
    } finally {
      client.release()
    }
  },

  // 获取所有抓取结果（分页）
  async getAllResults(limit = 100, offset = 0, status?: string) {
    const client = await pool.connect()
    try {
      let query = `
        SELECT id, task_id, task_url, influencer_name, influencer_followers, 
               country_region, fastmoss_detail_url, product_sales_count, 
               product_sales_amount, influencer_id, status, created_at, updated_at
        FROM scraping_results
      `
      const params: any[] = []
      let paramCount = 0

      if (status) {
        paramCount++
        query += ` WHERE status = $${paramCount}`
        params.push(status)
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      params.push(limit, offset)

      const result = await client.query(query, params)
      return result.rows
    } finally {
      client.release()
    }
  },

  // 更新抓取结果状态
  async updateResultStatus(id: number, status: 'active' | 'inactive' | 'deleted') {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        UPDATE scraping_results 
        SET status = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING id, task_id, task_url, influencer_name, influencer_followers, 
                  country_region, fastmoss_detail_url, product_sales_count, 
                  product_sales_amount, influencer_id, status, created_at, updated_at
      `, [id, status])
      return result.rows[0]
    } finally {
      client.release()
    }
  },

  // 删除抓取结果
  async deleteResult(id: number) {
    const client = await pool.connect()
    try {
      await client.query(`
        DELETE FROM scraping_results WHERE id = $1
      `, [id])
    } finally {
      client.release()
    }
  },

  // 根据任务ID删除所有相关结果
  async deleteResultsByTaskId(taskId: string) {
    const client = await pool.connect()
    try {
      await client.query(`
        DELETE FROM scraping_results WHERE task_id = $1
      `, [taskId])
    } finally {
      client.release()
    }
  },

  // 根据达人ID搜索商品数据
  async searchByInfluencerId(influencerId: string, limit = 20, offset = 0) {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT id, task_id, task_url, influencer_name, influencer_followers, 
               country_region, fastmoss_detail_url, product_sales_count, 
               product_sales_amount, influencer_id, sale_amount_show, 
               raw_data, status, created_at, updated_at
        FROM scraping_results
        WHERE influencer_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [influencerId, limit, offset])
      return result.rows
    } finally {
      client.release()
    }
  },

  // 根据达人ID统计总数
  async countByInfluencerId(influencerId: string) {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT COUNT(*) as count
        FROM scraping_results
        WHERE influencer_id = $1
      `, [influencerId])
      return parseInt(result.rows[0].count)
    } finally {
      client.release()
    }
  },

  async countAllResults() {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT COUNT(*) as count
        FROM scraping_results
      `)
      return parseInt(result.rows[0].count)
    } finally {
      client.release()
    }
  }
}

// 任务进度相关数据库操作
export const taskProgressQueries = {
  // 创建或更新任务进度
  async upsertProgress(data: {
    taskId: string
    url: string
    currentPage?: number
    totalPages?: number
    status?: 'pending' | 'processing' | 'completed' | 'failed'
    startedAt?: string
    completedAt?: string
    errorAt?: string
    errorMessage?: string
  }) {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        INSERT INTO task_progress (
          task_id, url, current_page, total_pages, status, 
          started_at, completed_at, error_at, error_message
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (task_id, url) 
        DO UPDATE SET
          current_page = COALESCE(EXCLUDED.current_page, task_progress.current_page),
          total_pages = COALESCE(EXCLUDED.total_pages, task_progress.total_pages),
          status = COALESCE(EXCLUDED.status, task_progress.status),
          started_at = COALESCE(EXCLUDED.started_at, task_progress.started_at),
          completed_at = COALESCE(EXCLUDED.completed_at, task_progress.completed_at),
          error_at = COALESCE(EXCLUDED.error_at, task_progress.error_at),
          error_message = COALESCE(EXCLUDED.error_message, task_progress.error_message),
          updated_at = NOW()
        RETURNING id, task_id, url, current_page, total_pages, status, 
                  started_at, completed_at, error_at, error_message, created_at, updated_at
      `, [
        data.taskId,
        data.url,
        data.currentPage || 0,
        data.totalPages || 0,
        data.status || 'pending',
        data.startedAt || null,
        data.completedAt || null,
        data.errorAt || null,
        data.errorMessage || null
      ])
      return result.rows[0]
    } finally {
      client.release()
    }
  },

  // 更新进度页数
  async updatePageProgress(taskId: string, url: string, currentPage: number, totalPages?: number) {
    const client = await pool.connect()
    try {
      let query = `
        UPDATE task_progress 
        SET current_page = $3, updated_at = NOW()
      `
      let params = [taskId, url, currentPage]
      
      // 如果提供了总页数，也更新总页数
      if (totalPages !== undefined) {
        query = `
          UPDATE task_progress 
          SET current_page = $3, total_pages = $4, updated_at = NOW()
        `
        params = [taskId, url, currentPage, totalPages]
      }
      
      query += `
        WHERE task_id = $1 AND url = $2
        RETURNING id, task_id, url, current_page, total_pages, status, 
                  started_at, completed_at, error_at, error_message, created_at, updated_at
      `
      
      const result = await client.query(query, params)
      return result.rows[0]
    } finally {
      client.release()
    }
  },

  // 更新进度状态
  async updateProgressStatus(
    taskId: string, 
    url: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed',
    completedAt?: string,
    errorAt?: string,
    errorMessage?: string
  ) {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        UPDATE task_progress 
        SET status = $3, 
            completed_at = $4,
            error_at = $5,
            error_message = $6,
            updated_at = NOW()
        WHERE task_id = $1 AND url = $2
        RETURNING id, task_id, url, current_page, total_pages, status, 
                  started_at, completed_at, error_at, error_message, created_at, updated_at
      `, [taskId, url, status, completedAt || null, errorAt || null, errorMessage || null])
      return result.rows[0]
    } finally {
      client.release()
    }
  },

  // 根据任务ID获取所有进度
  async getProgressByTaskId(taskId: string) {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT id, task_id, url, current_page, total_pages, status, 
               started_at, completed_at, error_at, error_message, created_at, updated_at
        FROM task_progress
        WHERE task_id = $1
        ORDER BY created_at ASC
      `, [taskId])
      return result.rows
    } finally {
      client.release()
    }
  },

  // 根据任务ID和URL获取进度
  async getProgressByTaskIdAndUrl(taskId: string, url: string) {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT id, task_id, url, current_page, total_pages, status, 
               started_at, completed_at, error_at, error_message, created_at, updated_at
        FROM task_progress
        WHERE task_id = $1 AND url = $2
      `, [taskId, url])
      return result.rows[0]
    } finally {
      client.release()
    }
  },

  // 删除任务的所有进度记录
  async deleteProgressByTaskId(taskId: string) {
    const client = await pool.connect()
    try {
      await client.query(`
        DELETE FROM task_progress WHERE task_id = $1
      `, [taskId])
    } finally {
      client.release()
    }
  }
}

// TikTok 任务相关数据库操作
export const tiktokTaskQueries = {
  // 获取所有 TikTok 任务
  async getAllTasks() {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT id, status, urls, created_at, completed_at, csv_url, error, remark
        FROM tiktok_tasks
        ORDER BY created_at DESC
      `)
      return result.rows
    } finally {
      client.release()
    }
  },

  // 根据ID获取 TikTok 任务
  async getTaskById(id: string) {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT id, status, urls, created_at, completed_at, csv_url, error, remark
        FROM tiktok_tasks
        WHERE id = $1
      `, [id])
      return result.rows[0]
    } finally {
      client.release()
    }
  },

  // 创建新的 TikTok 任务
  async createTask(id: string, urls: string[], remark?: string) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      
      // 创建主任务
      const taskResult = await client.query(`
        INSERT INTO tiktok_tasks (id, status, urls, remark)
        VALUES ($1, 'pending', $2, $3)
        RETURNING id, status, urls, created_at, remark
      `, [id, urls, remark || null])
      
      // 为每个 URL 创建子任务
      const { v4: uuidv4 } = await import('uuid')
      for (const url of urls) {
        const subTaskId = uuidv4()
        // 从 URL 中提取 product_id
        const productIdMatch = url.match(/\/product\/(\d+)/)
        const productId = productIdMatch ? productIdMatch[1] : null
        
        await client.query(`
          INSERT INTO tiktok_sub_tasks (id, task_id, url, product_id, status)
          VALUES ($1, $2, $3, $4, 'pending')
        `, [subTaskId, id, url, productId])
      }
      
      await client.query('COMMIT')
      return taskResult.rows[0]
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  // 更新 TikTok 任务状态
  async updateTaskStatus(id: string, status: string, csvUrl?: string, error?: string) {
    const client = await pool.connect()
    try {
      const completedAt = status === 'completed' || status === 'failed' ? new Date().toISOString() : null
      
      const result = await client.query(`
        UPDATE tiktok_tasks 
        SET status = $2, completed_at = $3, csv_url = $4, error = $5
        WHERE id = $1
        RETURNING id, status, urls, created_at, completed_at, csv_url, error
      `, [id, status, completedAt, csvUrl, error])
      
      return result.rows[0]
    } finally {
      client.release()
    }
  },

  // 删除 TikTok 任务
  async deleteTask(id: string) {
    const client = await pool.connect()
    try {
      await client.query(`
        DELETE FROM tiktok_tasks WHERE id = $1
      `, [id])
    } finally {
      client.release()
    }
  }
}

// TikTok 子任务相关数据库操作
export const tiktokSubTaskQueries = {
  // 根据任务ID获取所有子任务
  async getSubTasksByTaskId(taskId: string) {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT id, task_id, url, product_id, status, current_page, total_pages, 
               total_reviews, started_at, completed_at, error_at, error_message,
               created_at, updated_at
        FROM tiktok_sub_tasks
        WHERE task_id = $1
        ORDER BY created_at ASC
      `, [taskId])
      return result.rows
    } finally {
      client.release()
    }
  },

  // 根据ID获取子任务
  async getSubTaskById(id: string) {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT id, task_id, url, product_id, status, current_page, total_pages,
               total_reviews, started_at, completed_at, error_at, error_message,
               created_at, updated_at
        FROM tiktok_sub_tasks
        WHERE id = $1
      `, [id])
      return result.rows[0]
    } finally {
      client.release()
    }
  },

  // 更新子任务状态
  async updateSubTaskStatus(
    id: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    startedAt?: string,
    completedAt?: string,
    errorAt?: string,
    errorMessage?: string
  ) {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        UPDATE tiktok_sub_tasks 
        SET status = $2, 
            started_at = COALESCE($3, started_at),
            completed_at = COALESCE($4, completed_at),
            error_at = COALESCE($5, error_at),
            error_message = COALESCE($6, error_message),
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, task_id, url, product_id, status, current_page, total_pages,
                  total_reviews, started_at, completed_at, error_at, error_message,
                  created_at, updated_at
      `, [id, status, startedAt || null, completedAt || null, errorAt || null, errorMessage || null])
      return result.rows[0]
    } finally {
      client.release()
    }
  },

  // 更新子任务进度
  async updateSubTaskProgress(
    id: string,
    currentPage: number,
    totalPages?: number,
    totalReviews?: number
  ) {
    const client = await pool.connect()
    try {
      let query = `
        UPDATE tiktok_sub_tasks 
        SET current_page = $2, updated_at = NOW()
      `
      let params: any[] = [id, currentPage]
      
      if (totalPages !== undefined) {
        query = `
          UPDATE tiktok_sub_tasks 
          SET current_page = $2, total_pages = $3, updated_at = NOW()
        `
        params = [id, currentPage, totalPages]
      }
      
      if (totalReviews !== undefined) {
        query = `
          UPDATE tiktok_sub_tasks 
          SET current_page = $2, total_pages = COALESCE($3, total_pages), 
              total_reviews = $4, updated_at = NOW()
        `
        params = [id, currentPage, totalPages || null, totalReviews]
      }
      
      query += ` WHERE id = $1 RETURNING *`
      
      const result = await client.query(query, params)
      return result.rows[0]
    } finally {
      client.release()
    }
  }
}

// TikTok 评论相关数据库操作
export const tiktokReviewQueries = {
  // 创建评论记录
  async createReview(data: {
    subTaskId: string
    taskId: string
    // 新字段
    reviewId?: string
    productId?: string
    skuId?: string
    productName?: string
    reviewerId?: string
    reviewerName?: string
    reviewerAvatarUrl?: string
    reviewRating?: number
    reviewText?: string
    reviewImages?: string[]
    displayImageUrl?: string
    reviewTime?: number | string // 时间戳
    reviewCountry?: string
    skuSpecification?: string
    isVerifiedPurchase?: boolean
    isIncentivizedReview?: boolean
    // 兼容旧字段
    userName?: string
    userAvatar?: string
    userId?: string
    rating?: number
    commentText?: string
    commentImages?: string[]
    commentVideos?: string[]
    likeCount?: number
    replyCount?: number
    createdTime?: string
    rawData?: any
    status?: 'active' | 'inactive' | 'deleted'
  }) {
    const client = await pool.connect()
    try {
      // 解析 review_time 时间戳
      let reviewTimeParsed: Date | null = null
      if (data.reviewTime) {
        const timestamp = typeof data.reviewTime === 'string' ? parseInt(data.reviewTime) : data.reviewTime
        if (!isNaN(timestamp) && timestamp > 0) {
          reviewTimeParsed = new Date(timestamp)
        }
      }

      // 如果 review_id 为空，直接插入；否则使用 ON CONFLICT 进行 upsert
      if (!data.reviewId) {
        const result = await client.query(`
          INSERT INTO tiktok_reviews (
            sub_task_id, task_id, review_id, product_id, sku_id, product_name,
            reviewer_id, reviewer_name, reviewer_avatar_url, review_rating,
            review_text, review_images, display_image_url, review_time, review_time_parsed,
            review_country, sku_specification, is_verified_purchase, is_incentivized_review,
            user_name, user_avatar, user_id, rating, comment_text, comment_images, comment_videos,
            like_count, reply_count, created_time, raw_data, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
          RETURNING *
        `, [
          data.subTaskId,
          data.taskId,
          data.reviewId || null,
          data.productId || null,
          data.skuId || null,
          data.productName || null,
          data.reviewerId || null,
          data.reviewerName || null,
          data.reviewerAvatarUrl || null,
          data.reviewRating || null,
          data.reviewText || null,
          data.reviewImages || null,
          data.displayImageUrl || null,
          data.reviewTime ? (typeof data.reviewTime === 'string' ? parseInt(data.reviewTime) : data.reviewTime) : null,
          reviewTimeParsed,
          data.reviewCountry || null,
          data.skuSpecification || null,
          data.isVerifiedPurchase ?? false,
          data.isIncentivizedReview ?? false,
          data.userName || null,
          data.userAvatar || null,
          data.userId || null,
          data.rating || null,
          data.commentText || null,
          data.commentImages || null,
          data.commentVideos || null,
          data.likeCount || 0,
          data.replyCount || 0,
          data.createdTime || null,
          data.rawData ? JSON.stringify(data.rawData) : null,
          data.status || 'active'
        ])
        return result.rows[0]
      }

      // 使用 ON CONFLICT 进行 upsert（当 review_id 不为空时）
      const result = await client.query(`
        INSERT INTO tiktok_reviews (
          sub_task_id, task_id, review_id, product_id, sku_id, product_name,
          reviewer_id, reviewer_name, reviewer_avatar_url, review_rating,
          review_text, review_images, display_image_url, review_time, review_time_parsed,
          review_country, sku_specification, is_verified_purchase, is_incentivized_review,
          user_name, user_avatar, user_id, rating, comment_text, comment_images, comment_videos,
          like_count, reply_count, created_time, raw_data, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
        ON CONFLICT (task_id, sub_task_id, review_id) 
        DO UPDATE SET
          product_id = EXCLUDED.product_id,
          sku_id = EXCLUDED.sku_id,
          product_name = EXCLUDED.product_name,
          reviewer_id = EXCLUDED.reviewer_id,
          reviewer_name = EXCLUDED.reviewer_name,
          reviewer_avatar_url = EXCLUDED.reviewer_avatar_url,
          review_rating = EXCLUDED.review_rating,
          review_text = EXCLUDED.review_text,
          review_images = EXCLUDED.review_images,
          display_image_url = EXCLUDED.display_image_url,
          review_time = EXCLUDED.review_time,
          review_time_parsed = EXCLUDED.review_time_parsed,
          review_country = EXCLUDED.review_country,
          sku_specification = EXCLUDED.sku_specification,
          is_verified_purchase = EXCLUDED.is_verified_purchase,
          is_incentivized_review = EXCLUDED.is_incentivized_review,
          user_name = EXCLUDED.user_name,
          user_avatar = EXCLUDED.user_avatar,
          user_id = EXCLUDED.user_id,
          rating = EXCLUDED.rating,
          comment_text = EXCLUDED.comment_text,
          comment_images = EXCLUDED.comment_images,
          comment_videos = EXCLUDED.comment_videos,
          like_count = EXCLUDED.like_count,
          reply_count = EXCLUDED.reply_count,
          created_time = EXCLUDED.created_time,
          raw_data = EXCLUDED.raw_data,
          status = EXCLUDED.status,
          updated_at = NOW()
        RETURNING *
      `, [
        data.subTaskId,
        data.taskId,
        data.reviewId || null,
        data.productId || null,
        data.skuId || null,
        data.productName || null,
        data.reviewerId || null,
        data.reviewerName || null,
        data.reviewerAvatarUrl || null,
        data.reviewRating || null,
        data.reviewText || null,
        data.reviewImages || null,
        data.displayImageUrl || null,
        data.reviewTime ? (typeof data.reviewTime === 'string' ? parseInt(data.reviewTime) : data.reviewTime) : null,
        reviewTimeParsed,
        data.reviewCountry || null,
        data.skuSpecification || null,
        data.isVerifiedPurchase ?? false,
        data.isIncentivizedReview ?? false,
        data.userName || null,
        data.userAvatar || null,
        data.userId || null,
        data.rating || null,
        data.commentText || null,
        data.commentImages || null,
        data.commentVideos || null,
        data.likeCount || 0,
        data.replyCount || 0,
        data.createdTime || null,
        data.rawData ? JSON.stringify(data.rawData) : null,
        data.status || 'active'
      ])
      return result.rows[0]
    } finally {
      client.release()
    }
  },

  // 批量创建评论记录
  async createReviews(reviews: Array<{
    subTaskId: string
    taskId: string
    // 新字段
    reviewId?: string
    productId?: string
    skuId?: string
    productName?: string
    reviewerId?: string
    reviewerName?: string
    reviewerAvatarUrl?: string
    reviewRating?: number
    reviewText?: string
    reviewImages?: string[]
    displayImageUrl?: string
    reviewTime?: number | string // 时间戳
    reviewCountry?: string
    skuSpecification?: string
    isVerifiedPurchase?: boolean
    isIncentivizedReview?: boolean
    // 兼容旧字段
    userName?: string
    userAvatar?: string
    userId?: string
    rating?: number
    commentText?: string
    commentImages?: string[]
    commentVideos?: string[]
    likeCount?: number
    replyCount?: number
    createdTime?: string
    rawData?: any
    status?: 'active' | 'inactive' | 'deleted'
  }>) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      
      for (const data of reviews) {
        // 解析 review_time 时间戳
        let reviewTimeParsed: Date | null = null
        if (data.reviewTime) {
          const timestamp = typeof data.reviewTime === 'string' ? parseInt(data.reviewTime) : data.reviewTime
          if (!isNaN(timestamp) && timestamp > 0) {
            reviewTimeParsed = new Date(timestamp)
          }
        }

        // 如果 review_id 为空，直接插入；否则使用 ON CONFLICT 进行 upsert
        if (!data.reviewId) {
          await client.query(`
            INSERT INTO tiktok_reviews (
              sub_task_id, task_id, review_id, product_id, sku_id, product_name,
              reviewer_id, reviewer_name, reviewer_avatar_url, review_rating,
              review_text, review_images, display_image_url, review_time, review_time_parsed,
              review_country, sku_specification, is_verified_purchase, is_incentivized_review,
              user_name, user_avatar, user_id, rating, comment_text, comment_images, comment_videos,
              like_count, reply_count, created_time, raw_data, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
          `, [
            data.subTaskId,
            data.taskId,
            data.reviewId || null,
            data.productId || null,
            data.skuId || null,
            data.productName || null,
            data.reviewerId || null,
            data.reviewerName || null,
            data.reviewerAvatarUrl || null,
            data.reviewRating || null,
            data.reviewText || null,
            data.reviewImages || null,
            data.displayImageUrl || null,
            data.reviewTime ? (typeof data.reviewTime === 'string' ? parseInt(data.reviewTime) : data.reviewTime) : null,
            reviewTimeParsed,
            data.reviewCountry || null,
            data.skuSpecification || null,
            data.isVerifiedPurchase ?? false,
            data.isIncentivizedReview ?? false,
            data.userName || null,
            data.userAvatar || null,
            data.userId || null,
            data.rating || null,
            data.commentText || null,
            data.commentImages || null,
            data.commentVideos || null,
            data.likeCount || 0,
            data.replyCount || 0,
            data.createdTime || null,
            data.rawData ? JSON.stringify(data.rawData) : null,
            data.status || 'active'
          ])
        } else {
          // 使用 ON CONFLICT 进行 upsert（当 review_id 不为空时）
          await client.query(`
            INSERT INTO tiktok_reviews (
              sub_task_id, task_id, review_id, product_id, sku_id, product_name,
              reviewer_id, reviewer_name, reviewer_avatar_url, review_rating,
              review_text, review_images, display_image_url, review_time, review_time_parsed,
              review_country, sku_specification, is_verified_purchase, is_incentivized_review,
              user_name, user_avatar, user_id, rating, comment_text, comment_images, comment_videos,
              like_count, reply_count, created_time, raw_data, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
            ON CONFLICT (task_id, sub_task_id, review_id) 
            DO UPDATE SET
              product_id = EXCLUDED.product_id,
              sku_id = EXCLUDED.sku_id,
              product_name = EXCLUDED.product_name,
              reviewer_id = EXCLUDED.reviewer_id,
              reviewer_name = EXCLUDED.reviewer_name,
              reviewer_avatar_url = EXCLUDED.reviewer_avatar_url,
              review_rating = EXCLUDED.review_rating,
              review_text = EXCLUDED.review_text,
              review_images = EXCLUDED.review_images,
              display_image_url = EXCLUDED.display_image_url,
              review_time = EXCLUDED.review_time,
              review_time_parsed = EXCLUDED.review_time_parsed,
              review_country = EXCLUDED.review_country,
              sku_specification = EXCLUDED.sku_specification,
              is_verified_purchase = EXCLUDED.is_verified_purchase,
              is_incentivized_review = EXCLUDED.is_incentivized_review,
              user_name = EXCLUDED.user_name,
              user_avatar = EXCLUDED.user_avatar,
              user_id = EXCLUDED.user_id,
              rating = EXCLUDED.rating,
              comment_text = EXCLUDED.comment_text,
              comment_images = EXCLUDED.comment_images,
              comment_videos = EXCLUDED.comment_videos,
              like_count = EXCLUDED.like_count,
              reply_count = EXCLUDED.reply_count,
              created_time = EXCLUDED.created_time,
              raw_data = EXCLUDED.raw_data,
              status = EXCLUDED.status,
              updated_at = NOW()
          `, [
            data.subTaskId,
            data.taskId,
            data.reviewId || null,
            data.productId || null,
            data.skuId || null,
            data.productName || null,
            data.reviewerId || null,
            data.reviewerName || null,
            data.reviewerAvatarUrl || null,
            data.reviewRating || null,
            data.reviewText || null,
            data.reviewImages || null,
            data.displayImageUrl || null,
            data.reviewTime ? (typeof data.reviewTime === 'string' ? parseInt(data.reviewTime) : data.reviewTime) : null,
            reviewTimeParsed,
            data.reviewCountry || null,
            data.skuSpecification || null,
            data.isVerifiedPurchase ?? false,
            data.isIncentivizedReview ?? false,
            data.userName || null,
            data.userAvatar || null,
            data.userId || null,
            data.rating || null,
            data.commentText || null,
            data.commentImages || null,
            data.commentVideos || null,
            data.likeCount || 0,
            data.replyCount || 0,
            data.createdTime || null,
            data.rawData ? JSON.stringify(data.rawData) : null,
            data.status || 'active'
          ])
        }
      }
      
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  },

  // 根据任务ID获取评论
  async getReviewsByTaskId(taskId: string, limit = 100, offset = 0) {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT * FROM tiktok_reviews
        WHERE task_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [taskId, limit, offset])
      return result.rows
    } finally {
      client.release()
    }
  },

  // 根据子任务ID获取评论
  async getReviewsBySubTaskId(subTaskId: string, limit = 100, offset = 0) {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT * FROM tiktok_reviews
        WHERE sub_task_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [subTaskId, limit, offset])
      return result.rows
    } finally {
      client.release()
    }
  },

  // 统计任务评论数量
  async countReviewsByTaskId(taskId: string) {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT COUNT(*) as count
        FROM tiktok_reviews
        WHERE task_id = $1
      `, [taskId])
      return parseInt(result.rows[0].count)
    } finally {
      client.release()
    }
  },

  // 统计子任务评论数量
  async countReviewsBySubTaskId(subTaskId: string) {
    const client = await pool.connect()
    try {
      const result = await client.query(`
        SELECT COUNT(*) as count
        FROM tiktok_reviews
        WHERE sub_task_id = $1
      `, [subTaskId])
      return parseInt(result.rows[0].count)
    } finally {
      client.release()
    }
  }
}

export default pool
