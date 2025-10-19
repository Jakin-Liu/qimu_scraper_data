"use client"

import { useState } from "react"
import { TaskList } from "@/components/task-list"
import { TaskCreationDialog } from "@/components/task-creation-dialog"
import { Button } from "@/components/ui/button"
import { Plus, ListTodo, Search } from "lucide-react"
import InfluencerSearch from "@/components/influencer-search"

export default function Home() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "processing" | "completed" | "failed">("all")
  const [activeTab, setActiveTab] = useState("tasks")

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

        <div className="flex-1 p-4">
          <nav className="space-y-2">
            <Button
              variant={activeTab === "tasks" ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab("tasks")}
            >
              <ListTodo className="h-4 w-4" />
              任务管理
            </Button>
            <Button
              variant={activeTab === "search" ? "default" : "ghost"}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab("search")}
            >
              <Search className="h-4 w-4" />
              数据检索
            </Button>
          </nav>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-8 py-8 max-w-6xl">
          {activeTab === "tasks" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
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
                <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  新建任务
                </Button>
              </div>
              <TaskList filterStatus={filterStatus} />
            </div>
          )}

          {activeTab === "search" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">数据检索</h2>
              <InfluencerSearch />
            </div>
          )}
        </div>
      </main>

      <TaskCreationDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  )
}
