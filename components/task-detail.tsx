"use client"

import { useEffect, useState } from "react"
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
  Check
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface TaskProgress {
  id: number
  taskId: string
  url: string
  currentPage: number
  totalPages: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  startedAt?: string
  completedAt?: string
  errorAt?: string
  errorMessage?: string
  createdAt: string
  updatedAt: string
}

interface TaskProgressSummary {
  totalUrls: number
  completedUrls: number
  failedUrls: number
  processingUrls: number
  pendingUrls: number
  totalPages: number
  maxPages: number
  completionRate: number
}

interface TaskDetailProps {
  taskId: string
  onBack: () => void
}

export function TaskDetail({ taskId, onBack }: TaskDetailProps) {
  const [progress, setProgress] = useState<TaskProgress[]>([])
  const [summary, setSummary] = useState<TaskProgressSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copiedUrls, setCopiedUrls] = useState<Set<number>>(new Set())
  const { toast } = useToast()

  const fetchProgress = async (showSuccessToast = false) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/progress`)
      if (!response.ok) throw new Error("获取任务进度失败")
      const data = await response.json()
      setProgress(data.progress)
      setSummary(data.summary)
      
      // 如果是手动刷新，显示成功提示
      if (showSuccessToast) {
        toast({
          title: "刷新成功",
          description: "任务进度数据已更新",
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

  const handleCopyUrl = async (url: string, itemId: number) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrls(prev => new Set(prev).add(itemId))
      
      toast({
        title: "复制成功",
        description: "URL已复制到剪贴板",
      })
      
      // 2秒后重置复制状态
      setTimeout(() => {
        setCopiedUrls(prev => {
          const newSet = new Set(prev)
          newSet.delete(itemId)
          return newSet
        })
      }, 2000)
    } catch (error) {
      console.error("复制失败:", error)
      toast({
        title: "复制失败",
        description: "无法复制URL到剪贴板",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchProgress()
    
    // 每5秒自动刷新进度
    const interval = setInterval(fetchProgress, 5000)
    
    return () => clearInterval(interval)
  }, [taskId])

  const getStatusIcon = (status: TaskProgress['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />
      case 'failed':
        return <XCircle className="h-4 w-4" />
    }
  }

  const getStatusVariant = (status: TaskProgress['status']) => {
    switch (status) {
      case 'pending':
        return "secondary"
      case 'processing':
        return "default"
      case 'completed':
        return "default"
      case 'failed':
        return "destructive"
    }
  }

  const getStatusText = (status: TaskProgress['status']) => {
    switch (status) {
      case 'pending':
        return "等待中"
      case 'processing':
        return "处理中"
      case 'completed':
        return "已完成"
      case 'failed':
        return "失败"
    }
  }

  const formatTime = (timeString?: string) => {
    if (!timeString) return "未开始"
    return new Date(timeString).toLocaleString("zh-CN")
  }

  const getPageProgress = (currentPage: number, totalPages: number) => {
    if (totalPages === 0) return 0
    return Math.round((currentPage / totalPages) * 100)
  }


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-lg text-muted-foreground">加载任务详情中...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* 头部导航 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="hover:bg-white/50">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回任务列表
              </Button>
              <div className="h-8 w-px bg-border" />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                  任务进度详情
                </h1>
                <p className="text-muted-foreground mt-1">
                  <span className="font-mono text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                    {taskId}
                  </span>
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchProgress(true)} className="hover:bg-white/50 cursor-pointer">
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新数据
            </Button>
          </div>

          {/* 总体进度统计 */}
          {summary && (
            <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">总体进度概览</CardTitle>
                    <CardDescription>任务整体执行情况统计</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 统计卡片 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <Globe className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.totalUrls}</div>
                        <div className="text-sm text-blue-600/70 dark:text-blue-400/70">总URL数</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.completedUrls}</div>
                        <div className="text-sm text-green-600/70 dark:text-green-400/70">已完成</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500 rounded-lg">
                        <XCircle className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.failedUrls}</div>
                        <div className="text-sm text-red-600/70 dark:text-red-400/70">失败</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-500 rounded-lg">
                        <Activity className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.processingUrls}</div>
                        <div className="text-sm text-orange-600/70 dark:text-orange-400/70">处理中</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 完成率进度条 */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 p-6 rounded-xl border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      <span className="font-semibold">整体完成率</span>
                    </div>
                    <span className="text-2xl font-bold text-primary">{summary.completionRate}%</span>
                  </div>
                  <Progress value={summary.completionRate} className="h-3 bg-slate-200 dark:bg-slate-700" />
                </div>
                
                {/* 页数统计 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">已抓取页数</div>
                        <div className="text-xl font-bold">{summary.totalPages}</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Timer className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">预估总页数</div>
                        <div className="text-xl font-bold">{summary.maxPages}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* URL进度列表 */}
          <Card className="border-0 shadow-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">URL进度详情</CardTitle>
                  <CardDescription>每个URL的详细抓取进度和状态</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {progress.map((item, index) => (
                  <div key={item.id} className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge 
                            variant={getStatusVariant(item.status)} 
                            className="gap-2 px-3 py-1 text-sm font-medium"
                          >
                            {getStatusIcon(item.status)}
                            {getStatusText(item.status)}
                          </Badge>
                          <span className="text-sm text-muted-foreground bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full">
                            #{index + 1}
                          </span>
                        </div>
                        
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border mb-4">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-sm text-muted-foreground">目标URL</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyUrl(item.url, item.id)}
                              className="h-6 px-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              {copiedUrls.has(item.id) ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <div className="text-sm font-mono break-all text-slate-700 dark:text-slate-300">
                            {item.url}
                          </div>
                        </div>
                        
                        {/* 页数进度 */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">抓取进度</span>
                            <span className="text-sm font-bold text-primary">
                              {item.currentPage} / {item.totalPages}
                            </span>
                          </div>
                          <Progress 
                            value={getPageProgress(item.currentPage, item.totalPages)} 
                            className="h-2 bg-slate-200 dark:bg-slate-700" 
                          />
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(item.url, '_blank')}
                        className="ml-4 hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        访问
                      </Button>
                    </div>
                    
                    {/* 时间信息 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span className="font-medium text-slate-700 dark:text-slate-300">开始时间</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{formatTime(item.startedAt)}</div>
                      </div>
                      
                      {item.completedAt && (
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">完成时间</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{formatTime(item.completedAt)}</div>
                        </div>
                      )}
                      
                      {item.errorAt && (
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border">
                          <div className="flex items-center gap-2 mb-1">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">错误时间</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{formatTime(item.errorAt)}</div>
                        </div>
                      )}
                    </div>
                    
                    {/* 错误信息 */}
                    {item.errorMessage && (
                      <div className="mt-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">错误详情</div>
                            <div className="text-sm text-red-700 dark:text-red-400 bg-white dark:bg-slate-800 p-3 rounded border">
                              {item.errorMessage}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
