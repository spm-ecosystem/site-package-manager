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
    <div className="flex bg-slate-900 min-h-screen text-slate-100 font-sans">
      {/* Container where legacy sidebar filters will be reparented */}
      <aside 
        id="sidebarSlot-container" 
        className="w-64 border-r border-slate-700 p-4 shrink-0 bg-slate-950 overflow-y-auto [&>ul]:space-y-1 [&_a]:text-indigo-400 [&_a:hover]:underline [&_li]:text-slate-300"
      ></aside>

      <div className="flex-1 p-6 flex flex-col min-w-0">
        <header className="mb-6 border-b border-slate-700 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-indigo-400 truncate">
            {pageTitle || 'Modernized Gallery'}
          </h1>
          {/* Container where legacy top pagination will be reparented */}
          <div 
            id="paginationSlot-container" 
            className="flex items-center gap-1 [&_a]:px-3 [&_a]:py-1 [&_a]:bg-slate-800 [&_a]:rounded [&_a]:text-slate-200 [&_b]:px-3 [&_b]:py-1 [&_b]:bg-indigo-600 [&_b]:rounded [&_b]:text-white"
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
