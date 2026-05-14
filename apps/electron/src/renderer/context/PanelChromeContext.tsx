import * as React from 'react'

export interface PanelChromeContextType {
  rightSidebarButton?: React.ReactNode
  leadingAction?: React.ReactNode
  isFocusedPanel?: boolean
}

const DEFAULT_PANEL_CHROME: PanelChromeContextType = {
  rightSidebarButton: null,
  leadingAction: undefined,
  isFocusedPanel: true,
}

const PanelChromeContext = React.createContext<PanelChromeContextType>(DEFAULT_PANEL_CHROME)

export function PanelChromeProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: PanelChromeContextType
}) {
  return <PanelChromeContext.Provider value={value}>{children}</PanelChromeContext.Provider>
}

export function usePanelChrome(): PanelChromeContextType {
  return React.useContext(PanelChromeContext)
}

export function useOptionalPanelChrome(): PanelChromeContextType {
  return React.useContext(PanelChromeContext)
}

export function createPanelChromeValue(
  rightSidebarButton?: React.ReactNode,
  leadingAction?: React.ReactNode,
  isFocusedPanel: boolean = true,
): PanelChromeContextType {
  return {
    rightSidebarButton,
    leadingAction,
    isFocusedPanel,
  }
}
