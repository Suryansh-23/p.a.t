import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/navigation"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 pt-32">
        <h1 className="mb-4 text-4xl font-bold">Pool Not Found</h1>
        <p className="mb-8 text-lg text-muted-foreground">The AMM pool you're looking for doesn't exist.</p>
        <Button asChild size="lg">
          <Link href="/explorer">Back to Explorer</Link>
        </Button>
      </div>
    </div>
  )
}
