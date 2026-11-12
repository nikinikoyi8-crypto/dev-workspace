import type { ReactNode } from 'react';

interface StoryDesktopLayoutProps {
  header: ReactNode;
  stage: ReactNode;
  panel: ReactNode;
  overlays: ReactNode;
  isEditing: boolean;
}

export default function StoryDesktopLayout({ header, stage, panel, overlays, isEditing }: StoryDesktopLayoutProps) {
  return <section className="hidden h-[min(90dvh,820px)] w-full max-w-[1040px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-ink-900 shadow-premium lg:flex">
    {header}
    <main className={`grid min-h-0 flex-1 overflow-hidden ${isEditing ? 'grid-cols-[minmax(0,1fr)_360px]' : 'grid-cols-[minmax(0,1fr)_360px]'}`}>
      <div className={`relative flex min-h-0 justify-center bg-[radial-gradient(ellipse_at_50%_48%,rgba(232,79,155,.12),transparent_45%),radial-gradient(ellipse_at_80%_75%,rgba(123,69,232,.12),transparent_42%),#100c15] p-8 ${isEditing ? 'items-center overflow-hidden' : 'items-start overflow-y-auto'}`}>{stage}</div>
      <aside className="flex min-h-0 min-w-0 flex-col overflow-x-hidden overflow-y-auto border-s border-white/[.07] bg-ink-900/90">{panel}</aside>
    </main>
    {overlays}
  </section>;
}
