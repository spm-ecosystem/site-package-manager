

interface UiImageCardProps {
  imageUrl: string;
  linkUrl: string;
  title: string;
  id: string;
}

export function UiImageCard({ imageUrl, linkUrl, title, id }: UiImageCardProps) {
  return (
    <a href={linkUrl} className="flex flex-col rounded-lg overflow-hidden bg-[var(--bg-color)] text-[var(--text-color)] no-underline shadow-md hover:-translate-y-1 hover:shadow-lg transition duration-200 w-[150px] h-[180px]" data-id={id}>
      <img src={imageUrl} alt={title} className="w-full h-[120px] object-cover" />
      <div className="p-2 text-xs truncate text-center font-sans">
        {title || 'Untitled'}
      </div>
    </a>
  );
}
