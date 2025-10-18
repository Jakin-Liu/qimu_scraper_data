"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function TaskCreationForm() {
  const [token, setToken] = useState("")
  const [urls, setUrls] = useState<string[]>([""])
  const [remark, setRemark] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const addUrlField = () => {
    setUrls([...urls, ""])
  }

  const removeUrlField = (index: number) => {
    setUrls(urls.filter((_, i) => i !== index))
  }

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls]
    newUrls[index] = value
    setUrls(newUrls)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validUrls = urls.filter((url) => url.trim() !== "")

    if (!token.trim()) {
      toast({
        title: "错误",
        description: "请输入访问Token",
        variant: "destructive",
      })
      return
    }

    if (validUrls.length === 0) {
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
          token,
          urls: validUrls,
          remark: remark.trim() || undefined,
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

      // 重置表单
      setToken("")
      setUrls([""])

      // 触发任务列表刷新
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
    <Card className="shadow-lg border-border/50">
      <CardHeader>
        <CardTitle className="text-2xl">创建抓取任务</CardTitle>
        <CardDescription>输入访问凭证和目标URLs开始数据抓取</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="token">访问Token</Label>
            <Input
              id="token"
              type="password"
              placeholder="输入您的访问Token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>目标URLs</Label>
              <Button type="button" variant="outline" size="sm" onClick={addUrlField} disabled={isSubmitting}>
                <Plus className="h-4 w-4 mr-1" />
                添加URL
              </Button>
            </div>

            <div className="space-y-2">
              {urls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`URL ${index + 1}`}
                    value={url}
                    onChange={(e) => updateUrl(index, e.target.value)}
                    disabled={isSubmitting}
                  />
                  {urls.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeUrlField(index)}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remark">备注（可选）</Label>
            <Textarea
              id="remark"
              placeholder="输入任务备注信息..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                创建中...
              </>
            ) : (
              "创建任务"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
