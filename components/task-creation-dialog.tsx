"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface TaskCreationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskCreationDialog({ open, onOpenChange }: TaskCreationDialogProps) {
  const [urlsText, setUrlsText] = useState("")
  const [remark, setRemark] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const urls = urlsText
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url !== "")

    if (urls.length === 0) {
      toast({
        title: "错误",
        description: "请至少添加一个URL",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          urls,
          remark: remark.trim() || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("创建任务失败")
      }

      const data = await response.json()

      toast({
        title: "任务创建成功",
        description: `任务ID: ${data.taskId}，请在任务列表中点击启动按钮开始处理`,
      })

      setUrlsText("")
      setRemark("")

      onOpenChange(false)

      window.dispatchEvent(new CustomEvent("task-created"))
    } catch (error) {
      toast({
        title: "创建失败",
        description: error instanceof Error ? error.message : "未知错误",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">创建抓取任务</DialogTitle>
              <DialogDescription className="text-base mt-1">
                输入目标URLs开始数据抓取，支持批量处理多个商品页面
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* URL输入区域 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="urls" className="text-base font-semibold flex items-center gap-2">
                <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                目标URLs
              </Label>
              <div className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
                {urlsText.split('\n').filter(url => url.trim()).length} 个URL
              </div>
            </div>
            <div className="relative">
              <Textarea
                id="urls"
                placeholder="每行输入一个FastMoss商品页面URL&#10;https://www.fastmoss.com/zh/e-commerce/detail/123456789&#10;https://www.fastmoss.com/zh/e-commerce/detail/987654321&#10;https://www.fastmoss.com/zh/e-commerce/detail/456789123"
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
                disabled={isSubmitting}
                rows={8}
                className="font-mono text-sm border-2 focus:border-primary/50 transition-colors resize-none"
              />
              {urlsText && (
                <div className="absolute top-2 right-2">
                  <div className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-medium">
                    {urlsText.split('\n').filter(url => url.trim()).length} URLs
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <svg className="h-4 w-4 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p>• 每行输入一个FastMoss商品页面URL</p>
                <p>• 支持同时处理多个商品页面</p>
                <p>• 系统会自动提取商品ID并开始抓取</p>
              </div>
            </div>
          </div>

          {/* 备注输入区域 */}
          <div className="space-y-3">
            <Label htmlFor="remark" className="text-base font-semibold flex items-center gap-2">
              <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              任务备注
              <span className="text-sm font-normal text-muted-foreground">（可选）</span>
            </Label>
            <Textarea
              id="remark"
              placeholder="为这个任务添加备注信息，比如：&#10;• 测试环境数据抓取&#10;• 重点关注销量数据&#10;• 仅抓取前10页数据"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              disabled={isSubmitting}
              rows={4}
              className="border-2 focus:border-primary/50 transition-colors resize-none"
            />
            <p className="text-sm text-muted-foreground">
              添加备注可以帮助您更好地管理和识别不同的抓取任务
            </p>
          </div>

          {/* 操作按钮区域 */}
          <div className="flex gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 text-base font-medium"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button 
              type="submit" 
              className="flex-1 h-11 text-base font-medium bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  创建任务
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
