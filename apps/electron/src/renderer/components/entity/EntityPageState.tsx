import * as React from 'react'
import { Loader2 } from 'lucide-react'

interface EntityPageStateProps {
  icon?: React.ReactNode
  title: string
  description?: React.ReactNode
}

export function EntityLoadingState() {
  return (
    <section className="flex min-h-[calc(100vh-180px)] items-center justify-center text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
    </section>
  )
}

export function EntityEmptyState({ icon, title, description }: EntityPageStateProps) {
  return (
    <section className="flex min-h-[calc(100vh-180px)] items-center justify-center">
      <div className="max-w-[400px] text-center">
        {icon ? (
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
            {icon}
          </div>
        ) : null}
        <h1 className="text-[22px] font-semibold tracking-normal text-foreground">{title}</h1>
        {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
    </section>
  )
}

export function EntityNotFoundState({ title, description }: EntityPageStateProps) {
  return (
    <section className="flex min-h-[320px] items-center justify-center text-center">
      <div>
        <h1 className="text-[22px] font-semibold tracking-normal text-foreground">{title}</h1>
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      </div>
    </section>
  )
}
