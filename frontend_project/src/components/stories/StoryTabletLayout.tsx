import type { ReactNode } from 'react';

interface StoryTabletLayoutProps {
  header: ReactNode;
  stage: ReactNode;
  panel: ReactNode;
  overlays: ReactNode;
  isEditing: boolean;
}

export default function StoryTabletLayout({ header, stage, panel, overlays, isEditing }: StoryTabletLayoutProps) {
  return <section className="hidden h-[min(94dvh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-ink-950 shadow-premium md:flex lg:hidden">
    {header}
    <main className={`grid min-h-0 flex-1 overflow-hidden ${isEditing ? 'grid-cols-[minmax(0,1fr)_minmax(18rem,42%)]' : 'grid-cols-[minmax(0,1fr)_minmax(18rem,42%)]'}`}>
      <div className="relative flex min-h-0 items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_48%,rgba(232,79,155,.12),transparent_45%),#100c15] p-5">{stage}</div>
      <aside className="flex min-h-0 flex-col overflow-y-auto border-s border-white/[.07] bg-ink-900/90">{panel}</aside>
    </main>
    {overlays}
  </section>;
}
