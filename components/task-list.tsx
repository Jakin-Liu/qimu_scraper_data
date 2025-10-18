"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, Loader2, RefreshCw, Clock, CheckCircle2, XCircle } from "lucide-react"
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

  const handleDownload = (csvUrl: string, taskId: string) => {
    const link = document.createElement("a")
    link.href = csvUrl
    link.download = `task-${taskId}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
              <Tooltip key={task.id} delayDuration={300}>
                <TooltipTrigger asChild>
                  <div className="border rounded-lg p-5 space-y-3 hover:bg-muted/30 transition-colors bg-card cursor-pointer">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant={getStatusVariant(task.status)} className="gap-1">
                            {getStatusIcon(task.status)}
                            {getStatusText(task.status)}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">ID: {task.id.slice(0, 8)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>URLs: {task.urls.length} 个</p>
                          <p>创建时间: {new Date(task.createdAt).toLocaleString("zh-CN")}</p>
                          {task.completedAt && <p>完成时间: {new Date(task.completedAt).toLocaleString("zh-CN")}</p>}
                          {task.error && <p className="text-destructive">错误: {task.error}</p>}
                        </div>
                      </div>
                      {task.status === "completed" && task.csvUrl && (
                        <Button size="sm" onClick={() => handleDownload(task.csvUrl!, task.id)}>
                          <Download className="h-4 w-4 mr-1" />
                          下载CSV
                        </Button>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-md max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    <p className="font-semibold text-sm mb-2">抓取的URLs ({task.urls.length}):</p>
                    <ul className="space-y-1 text-xs">
                      {task.urls.map((url, index) => (
                        <li key={index} className="break-all text-muted-foreground">
                          {index + 1}. {url}
                        </li>
                      ))}
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      )}
    </div>
  )
}
