"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Loader2, RefreshCw, Clock, CheckCircle2, XCircle, Play, Copy, Check, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface Task {
  id: string
  status: "pending" | "processing" | "completed" | "failed"
  urls: string[]
  createdAt: string
  completedAt?: string
  csvUrl?: string
  error?: string
}

interface TaskListProps {
  filterStatus: "all" | "pending" | "processing" | "completed" | "failed"
}

export function TaskList({ filterStatus }: TaskListProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [startingTasks, setStartingTasks] = useState<Set<string>>(new Set())
  const [copiedTasks, setCopiedTasks] = useState<Set<string>>(new Set())
  const router = useRouter()
  const { toast } = useToast()

  const fetchTasks = async () => {
    try {
      const response = await fetch("/api/tasks")
      if (!response.ok) throw new Error("获取任务列表失败")
      const data = await response.json()
      setTasks(data.tasks)
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
    fetchTasks()

    const handleTaskCreated = () => {
      fetchTasks()
    }
    window.addEventListener("task-created", handleTaskCreated)

    const interval = setInterval(fetchTasks, 5000)

    return () => {
      window.removeEventListener("task-created", handleTaskCreated)
      clearInterval(interval)
    }
  }, [])

  const filteredTasks = filterStatus === "all" ? tasks : tasks.filter((task) => task.status === filterStatus)

  const getStatusIcon = (status: Task["status"]) => {
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

  const getStatusVariant = (status: Task["status"]) => {
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

  const getStatusText = (status: Task["status"]) => {
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

  const handleDownload = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/csv`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "下载CSV失败")
      }

      // 获取文件名
      const contentDisposition = response.headers.get('content-disposition')
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
        : `task-${taskId}-results.csv`

      // 创建下载链接
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "下载成功",
        description: "CSV文件已开始下载",
      })
    } catch (error) {
      toast({
        title: "下载失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    }
  }

  const handleStartTask = async (taskId: string) => {
    setStartingTasks(prev => new Set(prev).add(taskId))
    
    try {
      const response = await fetch("/api/tasks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "启动任务失败")
      }

      toast({
        title: "任务启动成功",
        description: "任务已开始处理",
      })

      // 刷新任务列表
      fetchTasks()
    } catch (error) {
      toast({
        title: "启动失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setStartingTasks(prev => {
        const newSet = new Set(prev)
        newSet.delete(taskId)
        return newSet
      })
    }
  }

  const handleCopyTaskId = async (taskId: string) => {
    try {
      await navigator.clipboard.writeText(taskId)
      setCopiedTasks(prev => new Set(prev).add(taskId))
      
      toast({
        title: "复制成功",
        description: "任务ID已复制到剪贴板",
      })

      // 2秒后移除复制状态
      setTimeout(() => {
        setCopiedTasks(prev => {
          const newSet = new Set(prev)
          newSet.delete(taskId)
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

  const handleViewDetail = (taskId: string) => {
    router.push(`/tasks/${taskId}`)
  }

  const getTitle = () => {
    switch (filterStatus) {
      case "all":
        return "全部任务"
      case "pending":
        return "等待中的任务"
      case "processing":
        return "处理中的任务"
      case "completed":
        return "已完成的任务"
      case "failed":
        return "失败的任务"
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{getTitle()}</h2>
          <p className="text-muted-foreground mt-1">共 {filteredTasks.length} 个任务</p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchTasks}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
          <p className="text-lg">暂无任务</p>
          <p className="text-sm mt-1">创建第一个抓取任务开始</p>
        </div>
      ) : (
        <div className="space-y-4">
          <TooltipProvider>
            {filteredTasks.map((task) => (
              <div 
                key={task.id} 
                className="border rounded-lg p-5 space-y-3 hover:bg-muted/30 transition-colors bg-card cursor-pointer"
                onClick={() => handleViewDetail(task.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* 左侧区域 - 包含hover时显示的URL明细 */}
                  <div className="flex-1 min-w-0 group relative">
                    <div className="flex items-start gap-2 mb-3">
                      <Badge variant={getStatusVariant(task.status)} className="gap-1 flex-shrink-0">
                        {getStatusIcon(task.status)}
                        {getStatusText(task.status)}
                      </Badge>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-xs text-muted-foreground font-mono break-all">ID: {task.id}</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCopyTaskId(task.id)
                              }}
                            >
                              {copiedTasks.has(task.id) ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {copiedTasks.has(task.id) ? "已复制" : "复制任务ID"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    
                    {/* 基本信息 - 始终显示 */}
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>URLs: {task.urls.length} 个</p>
                      <p>创建时间: {new Date(task.createdAt).toLocaleString("zh-CN")}</p>
                      {task.completedAt && <p>完成时间: {new Date(task.completedAt).toLocaleString("zh-CN")}</p>}
                      {task.error && <p className="text-destructive">错误: {task.error}</p>}
                    </div>
                    
                    {/* URL明细 - 只在hover左侧区域时显示，绝对定位在卡片外部 */}
                    <div className="absolute left-0 top-full mt-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                      <div className="bg-popover border rounded-lg shadow-lg p-4 w-96 max-w-[90vw]">
                        <p className="font-semibold text-sm mb-3 text-foreground">抓取的URLs ({task.urls.length}):</p>
                        <ul className="space-y-2 text-xs max-h-64 overflow-y-auto">
                          {task.urls.map((url, index) => (
                            <li key={index} className="break-all text-muted-foreground hover:text-foreground transition-colors">
                              <span className="text-muted-foreground mr-2">{index + 1}.</span>
                              {url}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  {/* 右侧按钮区域 */}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetail(task.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      查看详情
                    </Button>
                    {task.status === "pending" && (
                      <Button 
                        size="sm" 
                        onClick={() => handleStartTask(task.id)}
                        disabled={startingTasks.has(task.id)}
                      >
                        {startingTasks.has(task.id) ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-1" />
                        )}
                        启动
                      </Button>
                    )}
                    {task.status === "completed" && (
                      <Button size="sm" onClick={() => handleDownload(task.id)}>
                        <Download className="h-4 w-4 mr-1" />
                        下载CSV
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </TooltipProvider>
        </div>
      )}
    </div>
  )
}
