"use client"

import { useParams, useRouter } from "next/navigation"
import { TikTokReviewTaskDetail } from "@/components/tiktok-review-task-detail"

export default function TikTokReviewTaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.taskId as string

  const handleBack = () => {
    router.push("/tiktok-reviews")
  }

  return <TikTokReviewTaskDetail taskId={taskId} onBack={handleBack} />
}

