"use client"

import { useParams, useRouter } from "next/navigation"
import { TikTokSubTaskDetail } from "@/components/tiktok-sub-task-detail"

export default function TikTokSubTaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.taskId as string
  const subTaskId = params.subTaskId as string

  const handleBack = () => {
    router.push(`/tiktok-reviews/${taskId}`)
  }

  return <TikTokSubTaskDetail subTaskId={subTaskId} taskId={taskId} onBack={handleBack} />
}

