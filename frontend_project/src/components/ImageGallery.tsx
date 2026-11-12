export type GalleryFile = { name: string; mimeType: string; dataUrl?: string };

type ImageGalleryProps = {
  files: GalleryFile[];
  onOpen: (index: number) => void;
  caption?: string;
};

export default function ImageGallery({ files, onOpen, caption }: ImageGalleryProps) {
  const visibleFiles = files.filter((file) => file.dataUrl).slice(0, 4);
  const layout = visibleFiles.length === 3 ? 'grid-cols-[2fr_1fr] grid-rows-2' : 'grid-cols-2';
  const ratio = visibleFiles.length === 3 ? 'aspect-[4/3]' : 'aspect-square';

  return <div className="flex w-full max-w-[min(78%,24rem)] flex-col overflow-hidden rounded-2xl rounded-ee-md bg-brand-pink/75 p-0.5">
    <div className={`grid ${layout} ${ratio} w-full gap-0.5 overflow-hidden rounded-xl`}>
      {visibleFiles.map((file, index) => file.dataUrl ? <button key={`${file.name}-${index}`} type="button" onClick={() => onOpen(index)} className={`min-h-0 overflow-hidden ${visibleFiles.length === 3 && index === 0 ? 'row-span-2' : ''}`}>
        <img src={file.dataUrl} alt={file.name} className="block h-full w-full object-cover" />
      </button> : null)}
    </div>
    {caption && <p className="border-t border-white/20 px-2 py-1.5 text-xs text-white">{caption}</p>}
  </div>;
}
