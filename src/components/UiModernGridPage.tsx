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
    <div className="p-6 bg-slate-900 min-h-screen text-slate-100 font-sans">
      <header className="mb-6 border-b border-slate-700 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-indigo-400">
          {pageTitle || 'Modernized Gallery'}
        </h1>
      </header>
      <main className="flex flex-wrap gap-4 justify-center">
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
  );
}
