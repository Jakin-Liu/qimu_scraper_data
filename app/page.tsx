"use client"

import { useState } from "react"
import { TaskList } from "@/components/task-list"
import { TaskCreationDialog } from "@/components/task-creation-dialog"
import { Button } from "@/components/ui/button"
import { Plus, ListTodo } from "lucide-react"

export default function Home() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "processing" | "completed" | "failed">("all")

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 mb-1">
            <ListTodo className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-balance">数据抓取</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">任务管理系统</p>
        </div>

        <div className="flex-1" />
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-8 py-8 max-w-6xl">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">任务列表</h2>
              <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                新建任务
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("all")}
              >
                全部
              </Button>
              <Button
                variant={filterStatus === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("pending")}
              >
                等待中
              </Button>
              <Button
                variant={filterStatus === "processing" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("processing")}
              >
                处理中
              </Button>
              <Button
                variant={filterStatus === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("completed")}
              >
                已完成
              </Button>
              <Button
                variant={filterStatus === "failed" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("failed")}
              >
                失败
              </Button>
            </div>
          </div>

          <TaskList filterStatus={filterStatus} />
        </div>
      </main>

      <TaskCreationDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  )
}
