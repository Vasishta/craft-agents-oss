import * as React from 'react'
import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { Box } from 'lucide-react'
import { LinkedCountCard } from '../LinkedCountCard'

describe('LinkedCountCard', () => {
  it('renders the label and count in a stable compact card', () => {
    const markup = renderToStaticMarkup(<LinkedCountCard icon={<Box className="h-4 w-4" />} label="Outputs" count={3} />)
    expect(markup).toContain('Outputs')
    expect(markup).toContain('>3<')
  })
})
