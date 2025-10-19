// FastMoss 数据抓取服务
import { scrapingResultQueries, taskProgressQueries } from './db'

interface LoginCredentials {
  phone: string
  password: string
  account: string
  area_code: string
  action: number
  source: string
  type: string
}

interface AuthInfo {
  fd_tk: string
  fm_sign: string
  cookies: string
  timestamp: number
}

interface ScrapingResult {
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
}


// 认证信息管理类
class AuthManager {
  private static instance: AuthManager
  private authInfo: AuthInfo | null = null
  private loginPromise: Promise<AuthInfo> | null = null

  private constructor() {}

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager()
    }
    return AuthManager.instance
  }

  // 检查认证信息是否有效
  isAuthValid(): boolean {
    if (!this.authInfo) return false
    const now = Date.now()
    return (now - this.authInfo.timestamp) < 3600000 // 1小时
  }

  // 检查用户是否真正登录（调用用户信息API）
  async checkUserLogin(): Promise<boolean> {
    if (!this.authInfo) return false

    try {
      const timestamp = Math.floor(Date.now() / 1000)
      const cnonce = Math.floor(Math.random() * 100000000)
      
      const userInfoUrl = `https://www.fastmoss.com/api/user/index/userInfo?_time=${timestamp}&cnonce=${cnonce}`
      
      const response = await fetch(userInfoUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'accept-language': 'zh-CN,zh;q=0.9',
          'fm-sign': this.authInfo.fm_sign,
          'lang': 'ZH_CN',
          'priority': 'u=1, i',
          'referer': 'https://www.fastmoss.com/zh/influencer/detail/6578241618637668353',
          'region': 'US',
          'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-origin',
          'source': 'pc',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
          'cookie': this.authInfo.cookies
        }
      })

      if (!response.ok) {
        console.log('用户信息API请求失败:', response.status)
        return false
      }

      const data = await response.json()
      
      // 检查是否返回登录错误
      if (data.code === 'MSG_30001' && data.msg === '请登录') {
        console.log('用户未登录，需要重新登录')
        return false
      }

      // 检查是否有用户数据
      if (data.code === 0 && data.data) {
        console.log('用户已登录，认证有效')
        return true
      }

      console.log('用户信息API返回未知状态:', data)
      return false
    } catch (error) {
      console.error('检查用户登录状态失败:', error)
      return false
    }
  }

  // 获取认证信息（如果无效则重新登录）
  async getAuthInfo(): Promise<AuthInfo> {
    // 首先检查时间有效性
    if (this.isAuthValid()) {
      // 然后检查用户是否真正登录
      const isUserLoggedIn = await this.checkUserLogin()
      if (isUserLoggedIn) {
        console.log('使用缓存的认证信息')
        return this.authInfo!
      } else {
        console.log('认证信息已过期，需要重新登录')
        this.authInfo = null
      }
    }

    // 如果正在登录，等待登录完成
    if (this.loginPromise) {
      console.log('等待正在进行的登录...')
      return await this.loginPromise
    }

    // 开始新的登录流程
    this.loginPromise = this.performLogin()
    try {
      const authInfo = await this.loginPromise
      this.authInfo = authInfo
      console.log('认证信息已更新并缓存')
      return authInfo
    } finally {
      this.loginPromise = null
    }
  }

  // 执行登录
  private async performLogin(): Promise<AuthInfo> {
    try {
      const timestamp = Math.floor(Date.now() / 1000)
      const cnonce = Math.floor(Math.random() * 100000000)
      
      const loginUrl = `https://www.fastmoss.com/api/user/login?_time=${timestamp}&cnonce=${cnonce}`
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          ...BASE_HEADERS,
          'fm-sign': 'a4ebed93bde423e8c0034504e0925295',
          'referer': 'https://www.fastmoss.com/zh/influencer/detail/6578241618637668353',
          'cookie': BASE_COOKIES
        },
        body: JSON.stringify(DEFAULT_CREDENTIALS)
      })

      if (!response.ok) {
        throw new Error(`登录请求失败: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      // 从响应头获取set-cookie中的fd_tk
      const setCookie = response.headers.get('set-cookie')
      if (!setCookie) {
        throw new Error('登录响应中未找到set-cookie')
      }

      // 提取fd_tk
      const fdTkMatch = setCookie.match(/fd_tk=([^;]+)/)
      if (!fdTkMatch) {
        throw new Error('登录响应中未找到fd_tk')
      }

      const fd_tk = fdTkMatch[1]
      
      // 从请求头获取fm-sign（这里使用固定的，实际应该动态生成）
      const fm_sign = '0f0f42573e31afcead7ef68ac0d0e56o'
      
      // 构建完整的cookie
      const cookies = `${BASE_COOKIES};fd_tk=${fd_tk}`

      const authInfo: AuthInfo = {
        fd_tk,
        fm_sign,
        cookies,
        timestamp: Date.now()
      }

      console.log('FastMoss登录成功，认证信息已保存到全局内存')
      return authInfo
    } catch (error) {
      console.error('FastMoss登录失败:', error)
      throw error
    }
  }

  // 清除认证信息（用于强制重新登录）
  clearAuth(): void {
    this.authInfo = null
    this.loginPromise = null
    console.log('认证信息已清除')
  }

  // 获取当前认证信息（不触发登录）
  getCurrentAuth(): AuthInfo | null {
    return this.authInfo
  }
}

// 默认登录凭据
const DEFAULT_CREDENTIALS: LoginCredentials = {
  phone: "13516638758",
  password: "Lft2024@",
  account: "13516638758",
  area_code: "86",
  action: 0,
  source: "1",
  type: "1"
}

// 抓取配置
const SCRAPING_CONFIG = {
  DEFAULT_MAX_PAGES: 1000000, // 默认最大页数：100万页 1000000
  PAGE_SIZE: 10, // 每页数据量
  REQUEST_DELAY: 1000, // 请求间延迟（毫秒）
  FAILURE_DELAY: 2000, // 失败后延迟（毫秒）
  MAX_CONSECUTIVE_FAILURES: 3, // 最大连续失败次数
  CONCURRENT_URLS: 50, // 并行执行的URL数量
  CONCURRENT_PAGES: 20 // 并行执行的页数数量
}

// 基础请求头
const BASE_HEADERS = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'zh-CN,zh;q=0.9',
  'content-type': 'application/json',
  'lang': 'ZH_CN',
  'origin': 'https://www.fastmoss.com',
  'priority': 'u=1, i',
  'region': 'Global',
  'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'source': 'pc',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
}

// 基础Cookie
const BASE_COOKIES = 'NEXT_LOCALE=zh; region=Global; fp_visid=81c8de7260074a94af3f7653ec74a5d6; userTimeZone=Asia%2FShanghai; Hm_lvt_6ada669245fc6950ae4a2c0a86931766=1760703916; HMACCOUNT=F257B08FD1056FE1; _fbp=fb.1.1760703917599.291653884849515518; _clck=1b9ok2i%5E2%5Eg09%5E0%5E2116; Hm_lpvt_6ada669245fc6950ae4a2c0a86931766=1760768843; _uetsid=5726ffa0ab5411f0b1379b30f5d0e56o|1aql2el|2|g09|0|2116; _uetvid=572701a0ab5411f09136230e4edc0036|1qtqbij|1760771940606|1|1|bat.bing.com/p/insights/c/d'

// 获取认证管理器实例
const authManager = AuthManager.getInstance()

// 获取或刷新认证信息（兼容旧接口）
async function getAuthInfo(): Promise<AuthInfo> {
  return await authManager.getAuthInfo()
}

// 导出认证管理器实例供外部使用
export { authManager }

// 从URL中提取product_id
function extractProductId(url: string): string | null {
  // 匹配各种可能的product_id格式
  const patterns = [
    /product_id=(\d+)/,
    /\/detail\/(\d+)/,
    /\/goods\/(\d+)/,
    /\/product\/(\d+)/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}

// 获取最大页数和第1页数据
async function getMaxPagesAndFirstPageData(productId: string, authInfo: AuthInfo): Promise<{ maxPages: number, firstPageData: any }> {
  const timestamp = Math.floor(Date.now() / 1000)
  const cnonce = Math.floor(Math.random() * 100000000)
  
  // 先访问第1页获取总页数信息
  const apiUrl = `https://www.fastmoss.com/api/goods/v3/author?product_id=${productId}&order=2,2&pagesize=${SCRAPING_CONFIG.PAGE_SIZE}&ecommerce_type=all&page=1&_time=${timestamp}&cnonce=${cnonce}`
  
  console.log(`获取商品 ${productId} 的最大页数: ${apiUrl}`)
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      ...BASE_HEADERS,
      'fm-sign': authInfo.fm_sign,
      'referer': `https://www.fastmoss.com/zh/e-commerce/detail/${productId}`,
      'cookie': authInfo.cookies
    }
  })

  if (!response.ok) {
    throw new Error(`获取页数信息失败: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  
  // 检查响应结构
  if (!data.data) {
    console.warn(`商品 ${productId} 没有数据，返回0页`)
    return { maxPages: 0, firstPageData: data }
  }

  // 尝试从响应中获取总页数
  let maxPages = 0
  
  // 方法1: 从总数和每页大小计算（主要方法）
  if (data.data.total) {
    const total = parseInt(data.data.total) || 0
    const pageSize = SCRAPING_CONFIG.PAGE_SIZE
    maxPages = Math.ceil(total / pageSize)
    console.log(`从总数计算得到总页数: ${maxPages} (总数: ${total}, 每页: ${pageSize})`)
  }
  // 方法2: 从page字段直接获取总页数（备用方法）
  else if (data.data.page) {
    maxPages = parseInt(data.data.page) || 0
    console.log(`从page字段获取到总页数: ${maxPages}`)
  }
  // 方法3: 从分页信息中获取
  else if (data.data.pagination && data.data.pagination.total_pages) {
    maxPages = data.data.pagination.total_pages
    console.log(`从分页信息获取到总页数: ${maxPages}`)
  }
  // 方法4: 默认值
  else {
    maxPages = data.data.list && data.data.list.length > 0 ? 1 : 0
    console.log(`使用默认方法确定总页数: ${maxPages}`)
  }

  console.log(`商品 ${productId} 的最大页数: ${maxPages}`)
  return { maxPages, firstPageData: data }
}

// 抓取单页数据
async function scrapeSinglePage(productId: string, authInfo: AuthInfo, page: number, firstPageData?: any): Promise<ScrapingResult[]> {
  let data: any
  
  // 如果是第1页且已经有数据，直接使用
  if (page === 1 && firstPageData) {
    console.log(`使用第1页的缓存数据`)
    data = firstPageData
  } else {
    // 其他页数正常请求
    const timestamp = Math.floor(Date.now() / 1000)
    const cnonce = Math.floor(Math.random() * 100000000)
    
    const apiUrl = `https://www.fastmoss.com/api/goods/v3/author?product_id=${productId}&order=2,2&pagesize=${SCRAPING_CONFIG.PAGE_SIZE}&ecommerce_type=all&page=${page}&_time=${timestamp}&cnonce=${cnonce}`
    
    console.log(`抓取第 ${page} 页数据: ${apiUrl}`)
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        ...BASE_HEADERS,
        'fm-sign': authInfo.fm_sign,
        'referer': `https://www.fastmoss.com/zh/e-commerce/detail/${productId}`,
        'cookie': authInfo.cookies
      }
    })

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`)
    }

    data = await response.json()
  }
  
  // 检查是否有数据
  if (!data.data || !data.data.list || !Array.isArray(data.data.list) || data.data.list.length === 0) {
    return []
  }

  // 转换销售额显示格式为数字
  const convertSaleAmount = (saleAmountShow: string | null | undefined): number => {
    // 处理空值、null、undefined或空字符串
    if (!saleAmountShow || saleAmountShow.trim() === '') return 0
    
    // 去掉英文前缀（如RM、$等）
    let amount = saleAmountShow.replace(/^[A-Za-z$]+\s*/, '')
    
    // 如果去掉前缀后为空，返回0
    if (amount.trim() === '') return 0
    
    // 处理万、千等单位
    if (amount.includes('万')) {
      const num = parseFloat(amount.replace('万', ''))
      return isNaN(num) ? 0 : num * 10000
    } else if (amount.includes('千')) {
      const num = parseFloat(amount.replace('千', ''))
      return isNaN(num) ? 0 : num * 1000
    } else {
      // 直接是数字
      const num = parseFloat(amount)
      return isNaN(num) ? 0 : num
    }
  }

  // 解析当前页数据
  const pageResults: ScrapingResult[] = []
    for (const item of data.data.list) {
      // 处理销量数据，确保没有数据或为0时记录为0
      const salesCount = item.sold_count !== null && item.sold_count !== undefined 
        ? Number(item.sold_count) || 0 
        : 0

      // 处理销售额数据，确保没有数据或为0时记录为0
      const salesAmount = item.sale_amount !== null && item.sale_amount !== undefined
        ? Number(item.sale_amount) || 0
        : 0

      const result: ScrapingResult = {
        taskId: '', // 将在调用处设置
        taskUrl: `https://www.fastmoss.com/zh/e-commerce/detail/${productId}`,
        influencerName: item.nickname || '',
        influencerFollowers: item.follower_count !== null && item.follower_count !== undefined 
          ? Number(item.follower_count) || 0 
          : 0,
        countryRegion: item.region || '',
        fastmossDetailUrl: `https://www.fastmoss.com/zh/influencer/detail/${item.uid || ''}`,
        productSalesCount: salesCount,
        productSalesAmount: salesAmount,
        influencerId: item.unique_id || '',
        saleAmountShow: item.sale_amount_show || '',
        rawData: item,
        status: 'active'
      }

      pageResults.push(result)
    }

  return pageResults
}

// 抓取商品作者数据（支持并行翻页，实时写入数据库，进度跟踪）
async function scrapeProductAuthors(productId: string, authInfo: AuthInfo, taskId: string, url: string, maxPages: number = SCRAPING_CONFIG.DEFAULT_MAX_PAGES): Promise<ScrapingResult[]> {
  const allResults: ScrapingResult[] = []
  let currentPage = 1
  let hasMoreData = true
  let totalPages = 0
  
  try {
    console.log(`开始抓取商品 ${productId} 的作者数据（最多${maxPages}页，并行${SCRAPING_CONFIG.CONCURRENT_PAGES}页）...`)
    
    // 先获取最大页数和第1页数据
    let actualMaxPages = 0
    let firstPageData: any = null
    try {
      const result = await getMaxPagesAndFirstPageData(productId, authInfo)
      actualMaxPages = result.maxPages
      firstPageData = result.firstPageData
      console.log(`商品 ${productId} 的实际最大页数: ${actualMaxPages}`)
      
      // 使用实际页数和配置的最大页数中的较小值
      const finalMaxPages = Math.min(actualMaxPages, maxPages)
      console.log(`使用最终最大页数: ${finalMaxPages} (实际: ${actualMaxPages}, 配置: ${maxPages})`)
      
      // 更新maxPages为实际值
      maxPages = finalMaxPages
    } catch (error) {
      console.warn(`获取商品 ${productId} 的最大页数失败，使用配置的最大页数: ${maxPages}`, error)
    }
    
    // 初始化进度记录，使用实际的最大页数
    await taskProgressQueries.upsertProgress({
      taskId,
      url,
      currentPage: 0,
      totalPages: maxPages, // 使用实际的最大页数
      status: 'processing',
      startedAt: new Date().toISOString()
    })
    
    console.log(`任务进度已初始化，总页数: ${maxPages}`)
    
    while (hasMoreData) {
      // 确定当前批次的页数范围
      const batchSize = Math.min(SCRAPING_CONFIG.CONCURRENT_PAGES, maxPages - currentPage + 1)
      const pageNumbers = Array.from({ length: batchSize }, (_, i) => currentPage + i)
      console.log(`开始并行抓取第 ${currentPage} 到 ${currentPage + batchSize - 1} 页，共 ${batchSize} 页`)
      
      // 并行抓取当前批次的页数
      const batchPromises = pageNumbers.map(async (pageNum) => {
        try {
          // 如果是第1页且有缓存数据，传递缓存数据
          const pageResults = await scrapeSinglePage(
            productId, 
            authInfo, 
            pageNum, 
            pageNum === 1 ? firstPageData : undefined
          )
          
          // 设置taskId
          pageResults.forEach(result => {
            result.taskId = taskId
          })
          
          return { page: pageNum, results: pageResults, success: true }
        } catch (error) {
          console.error(`抓取第 ${pageNum} 页失败:`, error)
          return { page: pageNum, results: [], success: false, error }
        }
      })
      
      // 等待当前批次的所有页数处理完成
      const batchResults = await Promise.all(batchPromises)
      
      // 处理批次结果
      let batchHasData = false
      let lastSuccessfulPage = 0
      
      for (const batchResult of batchResults) {
        if (batchResult.success && batchResult.results.length > 0) {
          batchHasData = true
          lastSuccessfulPage = Math.max(lastSuccessfulPage, batchResult.page)
          
          // 立即将当前页数据写入数据库
          try {
            await scrapingResultQueries.createResults(batchResult.results)
            console.log(`第 ${batchResult.page} 页数据已写入数据库，${batchResult.results.length} 条记录`)
          } catch (dbError) {
            console.error(`第 ${batchResult.page} 页数据写入数据库失败:`, dbError)
            // 数据库写入失败不影响抓取继续
          }
          
          allResults.push(...batchResult.results)
          console.log(`第 ${batchResult.page} 页抓取完成，获得 ${batchResult.results.length} 条记录`)
          
          // 如果当前页数据少于页面大小，说明是最后一页
          if (batchResult.results.length < SCRAPING_CONFIG.PAGE_SIZE) {
            console.log(`第 ${batchResult.page} 页数据不足${SCRAPING_CONFIG.PAGE_SIZE}条（${batchResult.results.length}/${SCRAPING_CONFIG.PAGE_SIZE}），停止翻页`)
            hasMoreData = false
            totalPages = batchResult.page
            break
          }
        } else if (batchResult.success && batchResult.results.length === 0) {
          // 页面返回空数据，说明没有更多数据
          console.log(`第 ${batchResult.page} 页没有数据，停止翻页`)
          hasMoreData = false
          totalPages = batchResult.page - 1
          break
        }
      }
      
      // 更新进度页数
      if (lastSuccessfulPage > 0) {
        await taskProgressQueries.updatePageProgress(taskId, url, lastSuccessfulPage)
      }
      
      // 检查是否应该停止
      if (!batchHasData) {
        console.log(`当前批次没有获取到数据，停止翻页`)
        hasMoreData = false
        totalPages = lastSuccessfulPage
      } else if (currentPage + batchSize - 1 >= maxPages) {
        console.log(`已达到最大页数限制（${maxPages}页），停止翻页`)
        hasMoreData = false
        totalPages = maxPages
      } else {
        currentPage += batchSize
        console.log(`准备抓取第 ${currentPage} 页开始的下一批次...`)
        // 批次间添加延迟避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, SCRAPING_CONFIG.REQUEST_DELAY))
      }
    }
    
    // 更新进度状态为完成
    await taskProgressQueries.updateProgressStatus(
      taskId, 
      url, 
      'completed', 
      new Date().toISOString()
    )
    // 更新最终页数为实际抓取的页数
    await taskProgressQueries.updatePageProgress(taskId, url, totalPages, totalPages)
    
    console.log(`商品 ${productId} 抓取完成，共获得 ${allResults.length} 条记录，实际抓取页数: ${totalPages}`)
    
    return allResults
  } catch (error) {
    console.error(`抓取商品 ${productId} 的作者数据失败:`, error)
    // 更新进度状态为失败，并设置总页数为当前页数
    await taskProgressQueries.updateProgressStatus(
      taskId, 
      url, 
      'failed', 
      undefined,
      new Date().toISOString(),
      error instanceof Error ? error.message : '未知错误'
    )
    // 更新总页数为当前页数
    await taskProgressQueries.updatePageProgress(taskId, url, totalPages, totalPages)
    console.log(`任务 ${taskId} 的 URL ${url} 因异常而停止，已抓取页数: ${totalPages}`)
    throw error
  }
}

// 主要抓取函数
export async function scrapeFastMossData(taskId: string, urls: string[]): Promise<ScrapingResult[]> {
  try {
    // 获取认证信息
    const authInfo = await getAuthInfo()
    
    const allResults: ScrapingResult[] = []
    
    // 将URLs分批处理，每批最多5个并行执行
    const batchSize = SCRAPING_CONFIG.CONCURRENT_URLS
    
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize)
      
      console.log(`开始处理第 ${Math.floor(i / batchSize) + 1} 批URLs，共 ${batch.length} 个URL`)
      
      // 并行处理当前批次的URLs
      const batchPromises = batch.map(async (url) => {
        try {
          // 从URL中提取product_id
          const productId = extractProductId(url)
          if (!productId) {
            console.warn(`无法从URL中提取product_id: ${url}`)
            return []
          }

          // 抓取该商品的数据（默认最多100万页）
          const results = await scrapeProductAuthors(productId, authInfo, taskId, url)
          
          console.log(`URL ${url} 抓取完成，获得 ${results.length} 条数据`)
          return results
        } catch (error) {
          console.error(`抓取URL失败 ${url}:`, error)
          return []
        }
      })
      
      // 等待当前批次的所有URL处理完成
      const batchResults = await Promise.all(batchPromises)
      
      // 合并结果
      for (const results of batchResults) {
        allResults.push(...results)
      }
      
      console.log(`第 ${Math.floor(i / batchSize) + 1} 批处理完成，当前总计 ${allResults.length} 条数据`)
      
      // 批次间添加延迟，避免请求过于频繁
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    console.log(`所有URLs处理完成，总计获得 ${allResults.length} 条数据`)
    return allResults
  } catch (error) {
    console.error('FastMoss数据抓取失败:', error)
    throw error
  }
}

// 清除认证信息（用于测试或重新登录）
export function clearAuthInfo() {
  authManager.clearAuth()
}
