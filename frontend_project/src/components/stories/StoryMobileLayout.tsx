import type { ReactNode } from 'react';

interface StoryMobileLayoutProps {
  header: ReactNode;
  stage: ReactNode;
  tools: ReactNode;
  publish: ReactNode;
  overlays: ReactNode;
  details?: ReactNode;
  isEditing: boolean;
  isTextEditing?: boolean;
  textComposer?: ReactNode;
  viewportHeight?: number;
}

export default function StoryMobileLayout({ header, stage, tools, publish, overlays, details, isEditing, isTextEditing = false, textComposer, viewportHeight }: StoryMobileLayoutProps) {
  return <section className={`relative flex w-full flex-col overflow-hidden bg-ink-950 pt-[env(safe-area-inset-top)] md:hidden ${isTextEditing ? 'absolute inset-x-0 top-0' : 'h-[100dvh]'}`} style={isTextEditing && viewportHeight ? { height: `${viewportHeight}px` } : undefined}>
    {!isTextEditing && header}
    <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {isTextEditing ? <>
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black px-1 py-1">{stage}</div>
        <div className="absolute inset-x-0 z-[80]" style={{ bottom: 'var(--story-keyboard-inset, 0px)' }}>{textComposer}</div>
      </> : isEditing ? <>
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_45%,rgba(123,69,232,.14),transparent_56%),#0d0a10] px-0 py-2">{stage}</div>
        {details}
        {tools}
        {publish}
      </> : <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-4">{stage}</div>}
    </main>
    {overlays}
  </section>;
}
