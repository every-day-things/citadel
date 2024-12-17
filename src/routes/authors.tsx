import { Authors } from '@/components/pages/Authors'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/authors')({
  component: Authors
})
