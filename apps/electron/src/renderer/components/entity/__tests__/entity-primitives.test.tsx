import * as React from 'react'
import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { BookOpen, Box } from 'lucide-react'
import { EntityListCard } from '../EntityListCard'
import { EntityEmptyState, EntityLoadingState, EntityNotFoundState } from '../EntityPageState'
import { LinkedCountGrid } from '../LinkedCountGrid'
import { RelationshipBadgeRow } from '../RelationshipBadgeRow'

describe('entity primitives', () => {
  it('renders a keyboard-accessible list card shell', () => {
    const markup = renderToStaticMarkup(
      <EntityListCard
        title="Notebook"
        description="Curated durable collection"
        badges={<RelationshipBadgeRow items={[{ label: 'Docs', count: 2, icon: BookOpen }]} />}
        meta={<span>Updated 2 hours ago</span>}
        icon={<BookOpen className="h-4 w-4" />}
        trailing={<span>Actions</span>}
        onOpen={() => {}}
      />,
    )

    expect(markup).toContain('role="button"')
    expect(markup).toContain('Notebook')
    expect(markup).toContain('Curated durable collection')
    expect(markup).toContain('Docs')
    expect(markup).toContain('Actions')
  })

  it('renders shared loading, empty, and not-found states', () => {
    const loadingMarkup = renderToStaticMarkup(<EntityLoadingState />)
    const emptyMarkup = renderToStaticMarkup(
      <EntityEmptyState
        icon={<BookOpen className="h-5 w-5" />}
        title="No notebooks yet"
        description="Create one."
        action={<button type="button">New notebook</button>}
      />,
    )
    const notFoundMarkup = renderToStaticMarkup(
      <EntityNotFoundState title="Notebook not found" description="It may have been deleted." />,
    )

    expect(loadingMarkup).toContain('animate-spin')
    expect(emptyMarkup).toContain('No notebooks yet')
    expect(emptyMarkup).toContain('Create one.')
    expect(emptyMarkup).toContain('New notebook')
    expect(notFoundMarkup).toContain('Notebook not found')
  })

  it('renders linked counts as a reusable grid', () => {
    const markup = renderToStaticMarkup(
      <LinkedCountGrid
        items={[
          { icon: <Box className="h-4 w-4" />, label: 'Outputs', count: 2 },
          { icon: <BookOpen className="h-4 w-4" />, label: 'Sources', count: 5 },
        ]}
      />,
    )

    expect(markup).toContain('Outputs')
    expect(markup).toContain('Sources')
    expect(markup).toContain('>2<')
    expect(markup).toContain('>5<')
  })
})
