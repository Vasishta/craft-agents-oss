/**
 * PageCanvas Component
 */

import * as React from 'react'
import { useAtomValue, useSetAtom, atom } from 'jotai'
import { BookOpen, Check, Copy, FileText, PanelRightOpen, PenLine, Undo2, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Markdown, CollapsibleMarkdownProvider } from '@/components/markdown'
import { TiptapMarkdownEditor } from '@craft-agent/ui'
import { PanelHeader } from '@/components/app-shell/PanelHeader'
import { PanelHeaderCenterButton } from '@/components/ui/PanelHeaderCenterButton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAppShellContext, useSession as useSessionData } from '@/context/AppShellContext'
import { ensureSessionMessagesLoadedAtom, sessionMetaMapAtom } from '@/atoms/sessions'
import { activePageIdAtom, pageAtomFamily, pageDirtyAtom, pageErrorAtom, pageLoadingStateAtom } from '@/atoms/pages'
import { useCreatePage, useDebouncedPageSave } from '@/hooks/usePages'
import { useNavigation } from '@/contexts/NavigationContext'
import { routes } from '@/lib/navigate'
import { cn } from '@/lib/utils'
import { stripMarkdown } from '@/utils/text'
import type { Message } from '../../shared/types'

export type PageCanvasMode = 'message' | 'page'

export interface PageCanvasProps {
  mode: PageCanvasMode
  workspaceId: string
  sessionId?: string
  messageId?: string
  pageId?: string
}

function getArtifactTitle(content: string, fallback: string): string {
  const heading = content.match(/^\s{0,3}#{1,2}\s+(.+)$/m)?.[1]?.trim()
  if (heading) return stripMarkdown(heading).slice(0, 80) || fallback
  const plain = stripMarkdown(content)
  if (plain) return plain.slice(0, 80)
  return fallback
}

function findMessage(sessionMessages: Message[] | undefined, messageId: string): Message | undefined {
  return sessionMessages?.find((message) => message.id === messageId)
}

export default function PageCanvas({
  mode,
  workspaceId,
  sessionId,
  messageId,
  pageId,
}: PageCanvasProps) {
  const { onOpenFile, onOpenUrl, rightSidebarButton, leadingAction } = useAppShellContext()

  const { navigate } = useNavigation()
  const setActivePageId = useSetAtom(activePageIdAtom)
  const { createFromMessage } = useCreatePage(workspaceId)
  const isSavingAsPageRef = React.useRef(false)
  const [isSavingAsPage, setIsSavingAsPage] = React.useState(false)

  const page = useAtomValue(pageId ? pageAtomFamily(pageId) : atom(null))
  const pageLoadingState = useAtomValue(pageId ? pageLoadingStateAtom(pageId) : atom('idle' as const))
  const pageError = useAtomValue(pageId ? pageErrorAtom(pageId) : atom(null))
  const isPageDirty = useAtomValue(pageId ? pageDirtyAtom(pageId) : atom(false))
  const { save, cancelPendingSave, isSaving, isDirty: hasLocalEdits } = useDebouncedPageSave(workspaceId, pageId ?? null, 500)

  const sessionData = useSessionData(sessionId ?? '')
  const session = mode === 'message' ? sessionData : null
  const sessionMetaMap = useAtomValue(sessionMetaMapAtom)
  const ensureMessagesLoaded = useSetAtom(ensureSessionMessagesLoadedAtom)

  const [copied, setCopied] = React.useState(false)
  const [editMode, setEditMode] = React.useState<'read' | 'edit'>(() => mode === 'page' ? 'edit' : 'read')
  const [draftContent, setDraftContent] = React.useState('')

  React.useEffect(() => {
    if (mode === 'message' && sessionId) {
      ensureMessagesLoaded(sessionId)
    }
  }, [mode, sessionId, ensureMessagesLoaded])

  React.useEffect(() => {
    if (mode === 'page' && pageId) {
      setActivePageId(pageId)
    }
  }, [mode, pageId, setActivePageId])

  const message = mode === 'message' && session && messageId
    ? findMessage(session.messages, messageId)
    : undefined

  const sourceContent = mode === 'page'
    ? (page?.content ?? '')
    : (message?.content ?? '')

  const title = mode === 'page'
    ? (page?.title || getArtifactTitle(sourceContent, 'Untitled Doc'))
    : getArtifactTitle(sourceContent, session?.name || 'Session')

  const subtitle = mode === 'page'
    ? 'Doc'
    : message?.role === 'plan'
      ? (message?.isStreaming ? 'Live plan' : 'Plan')
      : (message?.isStreaming ? 'Live response' : 'Response')

  const sessionTitle = mode === 'message'
    ? (session?.name || sessionMetaMap.get(sessionId || '')?.name || 'Session')
    : 'Workspace Doc'

  React.useEffect(() => {
    if (!hasLocalEdits) {
      setDraftContent(sourceContent)
    }
  }, [sourceContent, hasLocalEdits])

  React.useEffect(() => {
    setEditMode(mode === 'page' ? 'edit' : 'read')
    setDraftContent(sourceContent)
  }, [mode, pageId, messageId])

  React.useEffect(() => {
    if (mode === 'message' && message?.isStreaming && editMode === 'edit') {
      setEditMode('read')
    }
  }, [mode, message?.isStreaming, editMode])

  const handleEditorUpdate = React.useCallback((markdown: string) => {
    setDraftContent(markdown)
    if (mode === 'page' && pageId) {
      save(markdown)
    }
  }, [mode, pageId, save])

  const handleCopy = React.useCallback(async () => {
    if (!draftContent) return
    await navigator.clipboard.writeText(draftContent)
    setCopied(true)
    toast.success(mode === 'page' ? 'Doc copied' : 'Canvas copied')
    window.setTimeout(() => setCopied(false), 1400)
  }, [draftContent, mode])

  const handleResetDraft = React.useCallback(() => {
    cancelPendingSave()
    setDraftContent(sourceContent)
    toast.success(mode === 'page' ? 'Doc reset' : 'Canvas reset')
  }, [cancelPendingSave, mode, sourceContent])

  const isLoading = mode === 'page' && pageLoadingState === 'loading'
  const isPageNotFound = mode === 'page' && pageLoadingState === 'error' && !!pageError
  const canEdit = mode === 'page'
  const content = draftContent
  const isEditablePage = mode === 'page' && editMode === 'edit'

  const handleSaveAsPage = React.useCallback(async () => {
    if (isSavingAsPageRef.current || !content || mode !== 'message' || !sessionId || !messageId) return

    isSavingAsPageRef.current = true
    setIsSavingAsPage(true)
    try {
      const savedPage = await createFromMessage(sessionId, messageId, content, title)
      if (savedPage) {
        toast.success('Saved as doc')
        navigate(routes.view.savedPage(savedPage.id))
      }
    } catch (err) {
      console.error('Failed to save as doc:', err)
      toast.error('Failed to save as doc')
    } finally {
      setIsSavingAsPage(false)
      isSavingAsPageRef.current = false
    }
  }, [content, mode, sessionId, messageId, createFromMessage, title, navigate])

  const actions = (
    <div className="flex items-center gap-1">
      {mode === 'message' && content && !message?.isStreaming && (
        <PanelHeaderCenterButton
          icon={isSavingAsPage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          tooltip="Save as Doc"
          onClick={handleSaveAsPage}
          disabled={isSavingAsPage}
        />
      )}
      <PanelHeaderCenterButton
        icon={<BookOpen className="h-4 w-4" />}
        tooltip={mode === 'page' ? 'Read-only' : 'Read'}
        onClick={() => setEditMode('read')}
        className={editMode === 'read' ? 'opacity-100 ring-1 ring-border/70' : undefined}
      />
      <PanelHeaderCenterButton
        icon={<PenLine className="h-4 w-4" />}
        tooltip={canEdit ? 'Edit doc' : 'Save as Doc to edit'}
        onClick={() => setEditMode('edit')}
        disabled={!canEdit}
        className={editMode === 'edit' ? 'opacity-100 ring-1 ring-border/70' : undefined}
      />
      {hasLocalEdits && (
        <PanelHeaderCenterButton
          icon={<Undo2 className="h-4 w-4" />}
          tooltip="Reset edits"
          onClick={handleResetDraft}
        />
      )}
      <PanelHeaderCenterButton
        icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        tooltip={copied ? 'Copied' : mode === 'page' ? 'Copy doc' : 'Copy canvas'}
        onClick={handleCopy}
        disabled={!content}
      />
    </div>
  )

  const badgeText = isSaving
    ? 'Saving...'
    : isPageDirty
      ? 'Unsaved'
      : hasLocalEdits
        ? 'Edited draft'
        : mode === 'page'
          ? (isEditablePage ? 'Editing' : 'Read-only')
          : subtitle

  return (
    <div className="h-full flex flex-col bg-background">
      <PanelHeader
        title={mode === 'page' ? 'Doc Editor' : 'Canvas'}
        badge={(
          <span className="ml-1 rounded-[4px] bg-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground flex items-center gap-1">
            {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
            {badgeText}
          </span>
        )}
        leadingAction={leadingAction}
        actions={actions}
        rightSidebarButton={rightSidebarButton}
      />

      <ScrollArea className="flex-1 min-h-0">
        <div className="min-h-full bg-background px-5 py-8 sm:px-8">
          <article className="mx-auto min-h-[calc(100vh-104px)] w-full max-w-[920px]">
            <div className="mb-7 border-b border-border/35 pb-5">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] bg-foreground/[0.04] text-muted-foreground">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : content ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <PanelRightOpen className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-[26px] font-semibold leading-tight tracking-normal text-foreground">{title}</h1>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {mode === 'page' ? sessionTitle : `${subtitle} from ${sessionTitle}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="pb-12">
              {isLoading ? (
                <div className="flex min-h-[280px] items-center justify-center text-center text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading doc...
                </div>
              ) : isPageNotFound ? (
                <div className="flex min-h-[280px] items-center justify-center text-center text-sm text-muted-foreground">
                  Doc not found.
                </div>
              ) : content || mode === 'page' ? (
                mode === 'page' ? (
                  <TiptapMarkdownEditor
                    key={`${pageId}-canvas-editor`}
                    content={content}
                    onUpdate={handleEditorUpdate}
                    editable={isEditablePage}
                    placeholder="Start writing..."
                    markdownEngine="official"
                    className={cn(
                      "canvas-page-editor text-sm leading-relaxed text-foreground",
                      !isEditablePage && "canvas-page-editor--readonly"
                    )}
                  />
                ) : (
                  <div className="text-sm">
                    <CollapsibleMarkdownProvider>
                      <Markdown
                        mode="full"
                        id={pageId || messageId || 'canvas'}
                        onUrlClick={onOpenUrl}
                        onFileClick={onOpenFile}
                        collapsible
                        hideFirstMermaidExpand={false}
                      >
                        {content || '*Empty doc*'}
                      </Markdown>
                    </CollapsibleMarkdownProvider>
                  </div>
                )
              ) : (
                <div className="flex min-h-[280px] items-center justify-center text-center text-sm text-muted-foreground">
                  This canvas is waiting for the message content.
                </div>
              )}
            </div>
          </article>
        </div>
      </ScrollArea>
    </div>
  )
}
