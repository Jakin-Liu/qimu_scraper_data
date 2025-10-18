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
        }),
      })

      if (!response.ok) {
        throw new Error("创建任务失败")
      }

      const data = await response.json()

      toast({
        title: "任务创建成功",
        description: `任务ID: ${data.taskId}`,
      })

      setUrlsText("")

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>创建抓取任务</DialogTitle>
          <DialogDescription>输入目标URLs开始数据抓取</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="urls">目标URLs</Label>
            <Textarea
              id="urls"
              placeholder="每行输入一个URL&#10;https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              disabled={isSubmitting}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">每行输入一个URL，支持多个URL</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  创建中...
                </>
              ) : (
                "创建任务"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
