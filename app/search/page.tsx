"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ListTodo, Search, MessageSquare } from "lucide-react"
import InfluencerSearch from "@/components/influencer-search"

export default function SearchPage() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 mb-1">
            <ListTodo className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-balance">七木科技后台管理系统</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">任务管理系统</p>
        </div>

        <div className="flex-1 p-4">
          <nav className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => router.push('/')}
            >
              <ListTodo className="h-4 w-4" />
              TK带货达人任务管理
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={() => router.push('/tiktok-reviews')}
            >
              <MessageSquare className="h-4 w-4" />
              TK 商品评论任务管理
            </Button>
            <Button
              variant="default"
              className="w-full justify-start gap-2"
            >
              <Search className="h-4 w-4" />
              TK带货达人数据检索
            </Button>
          </nav>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-8 py-8 max-w-6xl">
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">TK带货达人数据检索</h2>
            <InfluencerSearch />
          </div>
        </div>
      </main>
    </div>
  )
}
