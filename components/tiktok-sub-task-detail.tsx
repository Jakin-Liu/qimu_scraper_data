"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Pagination } from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  ArrowLeft, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  ExternalLink,
  Star,
  Globe,
  User,
  Image as ImageIcon,
  MessageSquare,
  Download
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Review {
  id: number
  subTaskId: string
  taskId: string
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
  reviewTime?: number | string
  reviewTimeParsed?: string
  reviewCountry?: string
  skuSpecification?: string
  isVerifiedPurchase?: boolean
  isIncentivizedReview?: boolean
  rawData?: any
  status: string
  createdAt: string
  updatedAt: string
}

interface SubTask {
  id: string
  taskId: string
  url: string
  productId?: string
  status: string
  totalReviews: number
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface TikTokSubTaskDetailProps {
  subTaskId: string
  taskId: string
  onBack: () => void
}

export function TikTokSubTaskDetail({ subTaskId, taskId, onBack }: TikTokSubTaskDetailProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [subTask, setSubTask] = useState<SubTask | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  const fetchReviews = async (page = 1, showToast = false) => {
    try {
      setIsLoading(true)
      const limit = pagination.limit || 20
      const response = await fetch(`/api/tiktok-reviews/sub-tasks/${subTaskId}/reviews?page=${page}&limit=${limit}`)
      
      if (!response.ok) {
        throw new Error("获取评论列表失败")
      }

      const data = await response.json()
      setReviews(data.reviews || [])
      setPagination(data.pagination || pagination)
      setSubTask(data.subTask || null)

      if (showToast) {
        toast({
          title: "刷新成功",
          description: "评论数据已更新",
        })
      }
    } catch (error) {
      toast({
        title: "加载失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReviews(1)
  }, [subTaskId])

  const formatReviewTime = (review: Review) => {
    if (review.reviewTimeParsed) {
      return new Date(review.reviewTimeParsed).toLocaleString("zh-CN")
    } else if (review.reviewTime) {
      const timestamp = typeof review.reviewTime === 'string' ? parseInt(review.reviewTime) : review.reviewTime
      if (!isNaN(timestamp) && timestamp > 0) {
        return new Date(timestamp).toLocaleString("zh-CN")
      }
    }
    return '未知时间'
  }

  const handleDownloadCSV = async () => {
    try {
      const response = await fetch(`/api/tiktok-reviews/sub-tasks/${subTaskId}/csv`)
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '下载失败')
      }

      // 获取文件名
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `tiktok-subtask-${subTaskId}-results.csv`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // 下载文件
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "下载成功",
        description: "CSV文件已下载",
      })
    } catch (error) {
      toast({
        title: "下载失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    }
  }

  const renderStars = (rating?: number) => {
    if (!rating) return null
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-muted-foreground">({rating})</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-8 py-8 max-w-7xl">
      <div className="space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">子任务评论详情</h1>
              <p className="text-sm text-muted-foreground mt-1">
                子任务ID: {subTaskId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {subTask && subTask.status === 'completed' && (
              <Button variant="default" onClick={handleDownloadCSV}>
                <Download className="h-4 w-4 mr-2" />
                下载CSV
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={() => fetchReviews(pagination.page, true)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 子任务信息 */}
        {subTask && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                子任务信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">商品URL</p>
                  <a
                    href={subTask.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 mt-1 inline-flex"
                  >
                    查看商品页面
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {subTask.productId && (
                  <div>
                    <p className="text-sm text-muted-foreground">商品ID</p>
                    <p className="text-sm font-medium mt-1">{subTask.productId}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">总评论数</p>
                  <p className="text-sm font-medium mt-1">{subTask.totalReviews}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 评论列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              评论列表
            </CardTitle>
            <CardDescription>
              共 {pagination.total} 条评论，按评论时间排序（最新在前）
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-20 w-full" />
                  </div>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>暂无评论数据</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id} className="border-l-4 border-l-primary">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          {/* 评论头部 */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              {review.reviewerAvatarUrl && (
                                <img
                                  src={review.reviewerAvatarUrl}
                                  alt={review.reviewerName || '用户头像'}
                                  className="w-10 h-10 rounded-full"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none'
                                  }}
                                />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium">{review.reviewerName || '匿名用户'}</p>
                                  {review.isVerifiedPurchase && (
                                    <Badge variant="outline" className="text-xs">
                                      已验证购买
                                    </Badge>
                                  )}
                                  {review.isIncentivizedReview && (
                                    <Badge variant="outline" className="text-xs">
                                      激励评论
                                    </Badge>
                                  )}
                                  {review.reviewCountry && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Globe className="h-3 w-3 mr-1" />
                                      {review.reviewCountry}
                                    </Badge>
                                  )}
                                </div>
                                {renderStars(review.reviewRating)}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                  <Clock className="h-3 w-3" />
                                  <span>{formatReviewTime(review)}</span>
                                </div>
                              </div>
                            </div>
                            {review.reviewId && (
                              <Badge variant="outline" className="text-xs">
                                ID: {review.reviewId}
                              </Badge>
                            )}
                          </div>

                          <Separator />

                          {/* 评论内容 */}
                          {review.reviewText && (
                            <div>
                              <p className="text-sm whitespace-pre-wrap">{review.reviewText}</p>
                            </div>
                          )}

                          {/* 商品信息 */}
                          {review.skuSpecification && (
                            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                              <p className="text-xs text-muted-foreground">
                                规格: {review.skuSpecification}
                              </p>
                            </div>
                          )}

                          {/* 评论图片 */}
                          {review.reviewImages && review.reviewImages.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />
                                评论图片 ({review.reviewImages.length})
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {review.reviewImages.map((img, idx) => (
                                  <img
                                    key={idx}
                                    src={img}
                                    alt={`评论图片 ${idx + 1}`}
                                    className="w-full h-auto rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => window.open(img, '_blank')}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none'
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
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
                      onPageChange={(page) => fetchReviews(page)}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

