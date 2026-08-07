interface UiImageCardProps {
  imageUrl: string;
  linkUrl: string;
  title: string;
  id: string;
}

export function UiImageCard({ imageUrl, linkUrl, title, id }: UiImageCardProps) {
  return (
    <a href={linkUrl} className="ui-image-card" data-id={id}>
      <img src={imageUrl} alt={title} className="ui-image-card-img" />
      <div className="ui-image-card-title">{title || 'Untitled'}</div>
    </a>
  );
}
