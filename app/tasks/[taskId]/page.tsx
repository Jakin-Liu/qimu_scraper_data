"use client"

import { useParams, useRouter } from "next/navigation"
import { TaskDetail } from "@/components/task-detail"

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const taskId = params.taskId as string

  const handleBack = () => {
    router.push("/")
  }

  return <TaskDetail taskId={taskId} onBack={handleBack} />
}
