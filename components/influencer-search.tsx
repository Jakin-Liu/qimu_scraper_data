"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, User, ExternalLink, Calendar, TrendingUp, Users, MapPin, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { Pagination } from "@/components/ui/pagination"

interface SearchResult {
  id: number
  task_id: string
  task_url: string
  influencer_name: string
  influencer_followers: number
  country_region: string
  fastmoss_detail_url: string
  product_sales_count: number
  product_sales_amount: number
  influencer_id: string
  sale_amount_show: string
  raw_data: any
  status: string
  created_at: string
  updated_at: string
}

interface SearchResponse {
  results: SearchResult[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  error?: string
}

export default function InfluencerSearch() {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  })
  const [copiedItems, setCopiedItems] = useState<Set<number>>(new Set())
  const [copiedTaskIds, setCopiedTaskIds] = useState<Set<number>>(new Set())
  const { toast } = useToast()

  const handleSearch = useCallback(async (page = 1, showToast = true) => {
    if (!searchTerm.trim()) {
      if (showToast) {
        toast({
          title: "请输入达人ID",
          description: "请输入要搜索的达人ID",
          variant: "destructive"
        })
      }
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/search/influencer?influencerId=${encodeURIComponent(searchTerm.trim())}&page=${page}&limit=${pagination.limit}`)
      const data: SearchResponse = await response.json()
      
      if (response.ok) {
        setSearchResults(data.results)
        setPagination(data.pagination)
        if (showToast && data.results.length > 0) {
          toast({
            title: "搜索成功",
            description: `找到 ${data.pagination.total} 条数据`
          })
        }
      } else {
        if (showToast) {
          toast({
            title: "搜索失败",
            description: data.error || "搜索时发生错误",
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      console.error('搜索失败:', error)
      if (showToast) {
        toast({
          title: "搜索失败",
          description: "网络错误，请稍后重试",
          variant: "destructive"
        })
      }
    } finally {
      setLoading(false)
    }
  }, [searchTerm, pagination.limit, toast])

  // 页面加载时获取所有数据
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/search/influencer?page=1&limit=${pagination.limit}`)
        const data: SearchResponse = await response.json()
        
        if (response.ok) {
          setSearchResults(data.results)
          setPagination(data.pagination)
        } else {
          console.error('加载数据失败:', data.error)
        }
      } catch (error) {
        console.error('加载数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAllData()
  }, [pagination.limit])

  // 防抖搜索：用户输入后500ms自动搜索
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch(1, false) // 自动搜索时不显示toast
      } else {
        // 重新加载所有数据
        const loadAllData = async () => {
          setLoading(true)
          try {
            const response = await fetch(`/api/search/influencer?page=1&limit=${pagination.limit}`)
            const data: SearchResponse = await response.json()
            
            if (response.ok) {
              setSearchResults(data.results)
              setPagination(data.pagination)
            }
          } catch (error) {
            console.error('加载数据失败:', error)
          } finally {
            setLoading(false)
          }
        }
        loadAllData()
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, handleSearch, pagination.limit])

  const handleCopy = async (text: string, itemId: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItems(prev => new Set([...prev, itemId]))
      toast({
        title: "复制成功",
        description: "内容已复制到剪贴板"
      })
      
      // 2秒后清除复制状态
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(itemId)
          return newSet
        })
      }, 2000)
    } catch (error) {
      toast({
        title: "复制失败",
        description: "无法复制到剪贴板",
        variant: "destructive"
      })
    }
  }

  const handleCopyTaskId = async (taskId: string, itemId: number) => {
    try {
      await navigator.clipboard.writeText(taskId)
      setCopiedTaskIds(prev => new Set([...prev, itemId]))
      toast({
        title: "复制成功",
        description: "任务ID已复制到剪贴板"
      })
      
      // 2秒后清除复制状态
      setTimeout(() => {
        setCopiedTaskIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(itemId)
          return newSet
        })
      }, 2000)
    } catch (error) {
      toast({
        title: "复制失败",
        description: "无法复制到剪贴板",
        variant: "destructive"
      })
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + '万'
    }
    return num.toLocaleString()
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 10000) {
      return 'RM' + (amount / 10000).toFixed(1) + '万'
    }
    return 'RM' + amount.toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* 搜索框 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            数据检索
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="输入达人ID搜索，或留空查看所有数据..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch(1, true)}
              className="flex-1"
            />
            <Button onClick={() => handleSearch(1, true)} disabled={loading}>
              {loading ? "搜索中..." : "搜索"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 搜索结果 */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{searchTerm.trim() ? `搜索结果: ${searchTerm}` : '所有数据'}</span>
              <Badge variant="secondary">
                共 {pagination.total} 条记录
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {searchResults.map((item) => (
                <Card key={item.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* 达人信息 */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">{item.influencer_name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(item.influencer_id, item.id)}
                            className="h-6 px-2"
                          >
                            {copiedItems.has(item.id) ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ID: {item.influencer_id}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {formatNumber(item.influencer_followers)} 粉丝
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.country_region}
                          </div>
                        </div>
                      </div>

                      {/* 商品信息 */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="font-medium">商品数据</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">销量:</span>
                            <span className="ml-1 font-medium">{item.product_sales_count}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">销售额:</span>
                            <span className="ml-1 font-medium">{formatCurrency(item.product_sales_amount)}</span>
                          </div>
                        </div>
                        {item.sale_amount_show && (
                          <div className="text-xs text-muted-foreground">
                            原始显示: {item.sale_amount_show}
                          </div>
                        )}
                      </div>

                      {/* 链接信息 */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4 text-purple-500" />
                          <span className="font-medium">相关链接</span>
                        </div>
                        <div className="space-y-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(item.fastmoss_detail_url, '_blank')}
                            className="w-full justify-start text-xs"
                          >
                            <ExternalLink className="h-3 w-3 mr-2" />
                            达人详情页
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(item.task_url, '_blank')}
                            className="w-full justify-start text-xs"
                          >
                            <ExternalLink className="h-3 w-3 mr-2" />
                            商品页面
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* 任务信息 */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">任务ID:</span>
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {item.task_id}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyTaskId(item.task_id, item.id)}
                            className="h-6 px-2"
                          >
                            {copiedTaskIds.has(item.id) ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                      </div>
                      
                      {/* 时间信息 */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          创建时间: {new Date(item.created_at).toLocaleString("zh-CN")}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 分页 */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={(page) => handleSearch(page, false)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 加载状态 */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 无结果 */}
      {!loading && searchResults.length === 0 && searchTerm && (
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>未找到相关数据</p>
              <p className="text-sm">请检查达人ID是否正确</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
