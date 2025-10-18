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

export default pool
