import * as React from 'react'
import { describe, expect, it } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { PanelChromeProvider, createPanelChromeValue, usePanelChrome } from '../PanelChromeContext'

function Probe() {
  const { leadingAction, rightSidebarButton, isFocusedPanel } = usePanelChrome()
  return (
    <div
      data-leading={leadingAction ? 'yes' : 'no'}
      data-right={rightSidebarButton ? 'yes' : 'no'}
      data-focused={isFocusedPanel ? 'yes' : 'no'}
    />
  )
}

describe('PanelChromeContext', () => {
  it('provides focused defaults outside nested panel overrides', () => {
    const markup = renderToStaticMarkup(<Probe />)
    expect(markup).toContain('data-leading="no"')
    expect(markup).toContain('data-right="no"')
    expect(markup).toContain('data-focused="yes"')
  })

  it('renders nested chrome overrides without touching app-shell context', () => {
    const markup = renderToStaticMarkup(
      <PanelChromeProvider value={createPanelChromeValue(<span>R</span>, <span>L</span>, false)}>
        <Probe />
      </PanelChromeProvider>,
    )
    expect(markup).toContain('data-leading="yes"')
    expect(markup).toContain('data-right="yes"')
    expect(markup).toContain('data-focused="no"')
  })
})
