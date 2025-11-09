"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft, 
  RefreshCw, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  ExternalLink,
  AlertCircle,
  BarChart3,
  Globe,
  Timer,
  TrendingUp,
  Activity,
  Target,
  Copy,
  Check,
  MessageSquare,
  Download
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SubTask {
  id: string
  taskId: string
  url: string
  productId?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  currentPage: number
  totalPages: number
  totalReviews: number
  startedAt?: string
  completedAt?: string
  errorAt?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

interface TaskSummary {
  totalSubTasks: number
  completedSubTasks: number
  failedSubTasks: number
  processingSubTasks: number
  pendingSubTasks: number
  totalReviews: number
  completionRate: number
}

interface TikTokReviewTaskDetailProps {
  taskId: string
  onBack: () => void
}

export function TikTokReviewTaskDetail({ taskId, onBack }: TikTokReviewTaskDetailProps) {
  const [subTasks, setSubTasks] = useState<SubTask[]>([])
  const [summary, setSummary] = useState<TaskSummary | null>(null)
  const [taskInfo, setTaskInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copiedUrls, setCopiedUrls] = useState<Set<string>>(new Set())
  const router = useRouter()
  const { toast } = useToast()

  const fetchData = async (showSuccessToast = false) => {
    try {
      // 获取任务信息
      const taskResponse = await fetch(`/api/tiktok-reviews/tasks/${taskId}`)
      if (!taskResponse.ok) throw new Error("获取任务信息失败")
      const task = await taskResponse.json()
      setTaskInfo(task)

      // 获取子任务列表
      const subTaskResponse = await fetch(`/api/tiktok-reviews/tasks/${taskId}/sub-tasks`)
      if (!subTaskResponse.ok) throw new Error("获取子任务列表失败")
      const subTaskData = await subTaskResponse.json()
      setSubTasks(subTaskData.subTasks || [])

      // 计算汇总信息
      const totalSubTasks = subTaskData.subTasks?.length || 0
      const completedSubTasks = subTaskData.subTasks?.filter((st: SubTask) => st.status === 'completed').length || 0
      const failedSubTasks = subTaskData.subTasks?.filter((st: SubTask) => st.status === 'failed').length || 0
      const processingSubTasks = subTaskData.subTasks?.filter((st: SubTask) => st.status === 'processing').length || 0
      const pendingSubTasks = subTaskData.subTasks?.filter((st: SubTask) => st.status === 'pending').length || 0
      const totalReviews = subTaskData.subTasks?.reduce((sum: number, st: SubTask) => sum + (st.totalReviews || 0), 0) || 0
      const completionRate = totalSubTasks > 0 ? (completedSubTasks / totalSubTasks) * 100 : 0

      setSummary({
        totalSubTasks,
        completedSubTasks,
        failedSubTasks,
        processingSubTasks,
        pendingSubTasks,
        totalReviews,
        completionRate
      })
      
      if (showSuccessToast) {
        toast({
          title: "刷新成功",
          description: "子任务数据已更新",
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

  const handleCopyUrl = async (url: string, subTaskId: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrls(prev => new Set(prev).add(subTaskId))
      
      toast({
        title: "复制成功",
        description: "URL已复制到剪贴板",
      })

      setTimeout(() => {
        setCopiedUrls(prev => {
          const newSet = new Set(prev)
          newSet.delete(subTaskId)
          return newSet
        })
      }, 2000)
    } catch (error) {
      toast({
        title: "复制失败",
        description: "无法复制到剪贴板",
        variant: "destructive",
      })
    }
  }

  const handleDownloadCSV = async (subTaskId: string, e: React.MouseEvent) => {
    e.stopPropagation() // 阻止事件冒泡，避免触发卡片点击
    
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

  useEffect(() => {
    fetchData()
    const interval = setInterval(() => fetchData(), 5000)
    return () => clearInterval(interval)
  }, [taskId])

  const getStatusIcon = (status: SubTask['status']) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin" />
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />
      case "failed":
        return <XCircle className="h-4 w-4" />
    }
  }

  const getStatusVariant = (status: SubTask['status']) => {
    switch (status) {
      case "pending":
        return "secondary"
      case "processing":
        return "default"
      case "completed":
        return "default"
      case "failed":
        return "destructive"
    }
  }

  const getStatusText = (status: SubTask['status']) => {
    switch (status) {
      case "pending":
        return "等待中"
      case "processing":
        return "处理中"
      case "completed":
        return "已完成"
      case "failed":
        return "失败"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
              <h1 className="text-3xl font-bold">任务详情</h1>
              <p className="text-sm text-muted-foreground mt-1">
                任务ID: {taskId}
              </p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={() => fetchData(true)}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* 任务信息卡片 */}
        {taskInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                任务信息
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">状态</p>
                  <Badge variant={getStatusVariant(taskInfo.status)} className="mt-1">
                    {getStatusText(taskInfo.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">创建时间</p>
                  <p className="text-sm font-medium mt-1">
                    {new Date(taskInfo.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                {taskInfo.completedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">完成时间</p>
                    <p className="text-sm font-medium mt-1">
                      {new Date(taskInfo.completedAt).toLocaleString("zh-CN")}
                    </p>
                  </div>
                )}
                {taskInfo.remark && (
                  <div>
                    <p className="text-sm text-muted-foreground">备注</p>
                    <p className="text-sm font-medium mt-1">{taskInfo.remark}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 汇总统计 */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">总子任务数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.totalSubTasks}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">已完成</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{summary.completedSubTasks}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">总评论数</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.totalReviews}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">完成率</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.completionRate.toFixed(1)}%</div>
                <Progress value={summary.completionRate} className="mt-2" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 子任务列表 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              子任务列表
            </CardTitle>
            <CardDescription>
              每个商品URL对应一个子任务，显示抓取进度和状态
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subTasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>暂无子任务</p>
              </div>
            ) : (
              <div className="space-y-4">
                {subTasks.map((subTask) => (
                  <Card 
                    key={subTask.id} 
                    className="border-l-4 border-l-primary cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => router.push(`/tiktok-reviews/${taskId}/${subTask.id}`)}
                  >
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* 子任务头部 */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={getStatusVariant(subTask.status)} className="gap-1">
                                {getStatusIcon(subTask.status)}
                                {getStatusText(subTask.status)}
                              </Badge>
                              {subTask.productId && (
                                <Badge variant="outline">商品ID: {subTask.productId}</Badge>
                              )}
                              <Badge variant="secondary" className="gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {subTask.totalReviews || 0} 条评论
                              </Badge>
                              {subTask.status === 'completed' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-6 gap-1"
                                  onClick={(e) => handleDownloadCSV(subTask.id, e)}
                                >
                                  <Download className="h-3 w-3" />
                                  下载CSV
                                </Button>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-muted-foreground">URL:</span>
                              <a
                                href={subTask.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1 truncate max-w-md"
                              >
                                {subTask.url}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleCopyUrl(subTask.url, subTask.id)}
                              >
                                {copiedUrls.has(subTask.id) ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* 进度信息 */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">当前页数</p>
                            <p className="font-medium">{subTask.currentPage} / {subTask.totalPages || '?'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">已抓取评论</p>
                            <p className="font-medium">{subTask.totalReviews}</p>
                          </div>
                          {subTask.startedAt && (
                            <div>
                              <p className="text-muted-foreground">开始时间</p>
                              <p className="font-medium">
                                {new Date(subTask.startedAt).toLocaleString("zh-CN")}
                              </p>
                            </div>
                          )}
                          {subTask.completedAt && (
                            <div>
                              <p className="text-muted-foreground">完成时间</p>
                              <p className="font-medium">
                                {new Date(subTask.completedAt).toLocaleString("zh-CN")}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* 进度条 */}
                        {subTask.status === 'processing' && subTask.totalPages > 0 && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">抓取进度</span>
                              <span className="font-medium">
                                {subTask.currentPage} / {subTask.totalPages} 页
                              </span>
                            </div>
                            <Progress 
                              value={(subTask.currentPage / subTask.totalPages) * 100} 
                              className="h-2"
                            />
                          </div>
                        )}

                        {/* 错误信息 */}
                        {subTask.status === 'failed' && subTask.errorMessage && (
                          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-destructive">错误信息</p>
                                <p className="text-sm text-muted-foreground mt-1">{subTask.errorMessage}</p>
                                {subTask.errorAt && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    错误时间: {new Date(subTask.errorAt).toLocaleString("zh-CN")}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

