/**
 * Pages Index
 *
 * Export all page components for use in MainContentPanel.
 */

export { default as ChatPage } from './ChatPage'
export { default as DocsHome } from './DocsHome'
export { default as OutputDetailPage } from './OutputDetailPage'
export { default as OutputsPage } from './OutputsPage'
export { default as PageCanvas } from './PageCanvas'
export { default as SearchPage } from './SearchPage'
export { default as SourceInfoPage } from './SourceInfoPage'
export { default as WorkspaceHome } from './WorkspaceHome'
// Settings pages
export {
  SettingsNavigator,
  AppSettingsPage,
  AiSettingsPage,
  AppearanceSettingsPage,
  InputSettingsPage,
  WorkspaceSettingsPage,
  PermissionsSettingsPage,
  LabelsSettingsPage,
  ShortcutsPage,
  PreferencesPage,
} from './settings'
