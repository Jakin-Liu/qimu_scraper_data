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
  PAGE_SIZE: 5, // 每页数据量
  REQUEST_DELAY: 1000, // 请求间延迟（毫秒）
  FAILURE_DELAY: 2000, // 失败后延迟（毫秒）
  MAX_CONSECUTIVE_FAILURES: 3 // 最大连续失败次数
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

// 抓取商品作者数据（支持翻页，实时写入数据库，进度跟踪）
async function scrapeProductAuthors(productId: string, authInfo: AuthInfo, taskId: string, url: string, maxPages: number = SCRAPING_CONFIG.DEFAULT_MAX_PAGES): Promise<ScrapingResult[]> {
  const allResults: ScrapingResult[] = []
  let page = 1
  let hasMoreData = true
  let consecutiveFailures = 0
  const maxConsecutiveFailures = SCRAPING_CONFIG.MAX_CONSECUTIVE_FAILURES
  
  try {
    
    console.log(`开始抓取商品 ${productId} 的作者数据（最多${maxPages}页）...`)
    
    // 初始化进度记录
    await taskProgressQueries.upsertProgress({
      taskId,
      url,
      currentPage: 0,
      totalPages: 0, // 初始时设为0，完成时更新为实际页数
      status: 'processing',
      startedAt: new Date().toISOString()
    })
    
    while (hasMoreData) {
      try {
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

        const data = await response.json()
        
        // 检查是否有数据
        if (!data.data || !data.data.list || !Array.isArray(data.data.list) || data.data.list.length === 0) {
          console.log(`第 ${page} 页没有数据，停止翻页`)
          hasMoreData = false
          break
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
          const salesAmount = convertSaleAmount(item.sale_amount_show)

          const result: ScrapingResult = {
            taskId: taskId,
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

        // 立即将当前页数据写入数据库
        if (pageResults.length > 0) {
          try {
            await scrapingResultQueries.createResults(pageResults)
            console.log(`第 ${page} 页数据已写入数据库，${pageResults.length} 条记录`)
          } catch (dbError) {
            console.error(`第 ${page} 页数据写入数据库失败:`, dbError)
            // 数据库写入失败不影响抓取继续
          }
        }

        allResults.push(...pageResults)
        console.log(`第 ${page} 页抓取完成，获得 ${pageResults.length} 条记录，累计 ${allResults.length} 条`)

        // 更新进度页数
        await taskProgressQueries.updatePageProgress(taskId, url, page)

        // 重置连续失败计数
        consecutiveFailures = 0

        // 如果当前页数据少于页面大小，说明是最后一页
        if (pageResults.length < SCRAPING_CONFIG.PAGE_SIZE) {
          console.log(`第 ${page} 页数据不足${SCRAPING_CONFIG.PAGE_SIZE}条（${pageResults.length}/${SCRAPING_CONFIG.PAGE_SIZE}），停止翻页`)
          hasMoreData = false
          // 更新进度状态为完成，并设置最终页数为实际抓取的页数
          await taskProgressQueries.updateProgressStatus(
            taskId, 
            url, 
            'completed', 
            new Date().toISOString()
          )
          // 更新最终页数为实际抓取的页数
          await taskProgressQueries.updatePageProgress(taskId, url, page, page)
          console.log(`任务 ${taskId} 的 URL ${url} 已完成，实际抓取页数: ${page}`)
        } else if (page >= maxPages) {
          console.log(`已达到最大页数限制（${maxPages}页），停止翻页`)
          hasMoreData = false
          // 更新进度状态为完成，并设置最终页数为最大页数限制
          await taskProgressQueries.updateProgressStatus(
            taskId, 
            url, 
            'completed', 
            new Date().toISOString()
          )
          // 更新最终页数为最大页数限制
          await taskProgressQueries.updatePageProgress(taskId, url, page, maxPages)
          console.log(`任务 ${taskId} 的 URL ${url} 已完成，达到最大页数限制: ${maxPages}`)
        } else {
          page++
          console.log(`准备抓取第 ${page} 页...`)
          // 添加延迟避免请求过于频繁
          await new Promise(resolve => setTimeout(resolve, SCRAPING_CONFIG.REQUEST_DELAY))
        }

      } catch (error) {
        console.error(`抓取第 ${page} 页数据失败:`, error)
        consecutiveFailures++
        
        // 如果连续失败次数过多，停止抓取
        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.log(`连续失败 ${consecutiveFailures} 次，停止抓取`)
          hasMoreData = false
          // 更新进度状态为失败，并设置总页数为失败时的页数
          await taskProgressQueries.updateProgressStatus(
            taskId, 
            url, 
            'failed', 
            undefined,
            new Date().toISOString(),
            `连续失败 ${consecutiveFailures} 次: ${error instanceof Error ? error.message : '未知错误'}`
          )
          // 更新总页数为失败时的页数
          await taskProgressQueries.updatePageProgress(taskId, url, page, page)
          console.log(`任务 ${taskId} 的 URL ${url} 因连续失败而停止，已抓取页数: ${page}`)
          break
        }
        
        // 如果单页失败，继续尝试下一页
        page++
        console.log(`第 ${page-1} 页失败，尝试第 ${page} 页... (连续失败 ${consecutiveFailures}/${maxConsecutiveFailures})`)
        // 添加延迟后继续
        await new Promise(resolve => setTimeout(resolve, SCRAPING_CONFIG.FAILURE_DELAY))
      }
    }

    // 如果循环正常结束（没有因为错误而停止），确保设置完成状态
    if (hasMoreData === false) {
      console.log(`商品 ${productId} 抓取正常完成，共获得 ${allResults.length} 条记录`)
    } else {
      console.log(`商品 ${productId} 抓取完成，共获得 ${allResults.length} 条记录`)
    }
    
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
    // 更新总页数为当前页数（如果page未定义则设为1）
    const currentPage = page || 1
    await taskProgressQueries.updatePageProgress(taskId, url, currentPage, currentPage)
    console.log(`任务 ${taskId} 的 URL ${url} 因异常而停止，已抓取页数: ${currentPage}`)
    throw error
  }
}

// 主要抓取函数
export async function scrapeFastMossData(taskId: string, urls: string[]): Promise<ScrapingResult[]> {
  try {
    // 获取认证信息
    const authInfo = await getAuthInfo()
    
    const allResults: ScrapingResult[] = []
    
    for (const url of urls) {
      try {
        // 从URL中提取product_id
        const productId = extractProductId(url)
        if (!productId) {
          console.warn(`无法从URL中提取product_id: ${url}`)
          continue
        }

        // 抓取该商品的数据（默认最多100万页）
        const results = await scrapeProductAuthors(productId, authInfo, taskId, url)
        
        allResults.push(...results)
        
        // 添加延迟避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`抓取URL失败 ${url}:`, error)
        // 继续处理其他URL
      }
    }

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
