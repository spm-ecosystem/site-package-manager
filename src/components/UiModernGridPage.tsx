import { UiImageCard } from './UiImageCard';

interface GridItem {
  imageUrl: string;
  linkUrl: string;
  title: string;
  id: string;
}

interface UiModernGridPageProps {
  pageTitle: string;
  items: GridItem[];
}

export function UiModernGridPage({ pageTitle, items }: UiModernGridPageProps) {
  return (
    <div className="flex bg-black min-h-screen text-[#d4d4d4] font-sans">
      {/* Container where legacy sidebar filters will be reparented */}
      <aside 
        id="sidebarSlot-container" 
        className="w-64 border-r border-[#333333] p-4 shrink-0 bg-[#111111] overflow-y-auto [&>ul]:space-y-1 [&_a]:text-white [&_a:hover]:underline [&_li]:text-zinc-300"
      ></aside>

      <div className="flex-1 p-6 flex flex-col min-w-0">
        <header className="mb-6 border-b border-[#333333] pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-white truncate">
            {pageTitle || 'Modernized Gallery'}
          </h1>
          {/* Container where legacy top pagination will be reparented */}
          <div 
            id="paginationSlot-container" 
            className="flex items-center gap-1 [&_a]:px-3 [&_a]:py-1 [&_a]:bg-[#222222] [&_a]:border [&_a]:border-[#333333] [&_a]:rounded [&_a]:text-zinc-200 [&_b]:px-3 [&_b]:py-1 [&_b]:bg-white [&_b]:text-black [&_b]:rounded font-sans"
          ></div>
        </header>

        <main className="flex flex-wrap gap-4 justify-center overflow-y-auto flex-1">
          {items.map((item) => (
            <UiImageCard
              key={item.id}
              id={item.id}
              imageUrl={item.imageUrl}
              linkUrl={item.linkUrl}
              title={item.title}
            />
          ))}
        </main>
      </div>
    </div>
  );
}
