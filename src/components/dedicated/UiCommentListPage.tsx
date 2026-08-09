import { useState } from 'react';
import { UiPaginationBar } from './UiPaginationBar';

export interface TagItem {
  label: string;
  url: string;
  type: string;
}

export interface CommentItem {
  author: string;
  authorUrl?: string;
  date: string;
  body: string;
}

export interface CommentThread {
  id: string;
  thumbnailUrl: string;
  postUrl: string;
  postDate: string;
  postUser: string;
  postRating: string;
  postScore: string;
  tags?: TagItem[];
  comments?: CommentItem[];
}

export interface PageLink {
  label: string;
  url: string;
}

export interface UiCommentListPageProps {
  pageTitle?: string;
  threads?: CommentThread[];
  pageLinks?: PageLink[];
  height?: string;
  className?: string;
  style?: React.CSSProperties;
}

// 1. Modular Sub-component: A single comment reply speech bubble
export interface UiCommentReplyProps {
  comment: CommentItem;
}

export function UiCommentReply({ comment }: UiCommentReplyProps) {
  return (
    <div
      style={{
        background: 'var(--spm-bg-tertiary)',
        border: '1px solid var(--spm-border)',
        borderRadius: 'calc(var(--spm-radius) - 4px)',
        padding: '12px 16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '6px',
          fontSize: '11px',
        }}
      >
        <a
          href={comment.authorUrl || '#'}
          style={{
            fontWeight: 700,
            color: 'var(--spm-accent)',
            textDecoration: 'none',
          }}
        >
          {comment.author}
        </a>
        <span style={{ color: 'var(--spm-text-muted)' }}>{comment.date}</span>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: '13px',
          lineHeight: '1.5',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {comment.body}
      </p>
    </div>
  );
}

// 2. Modular Sub-component: A single thread card containing a thumbnail, details, replies and tags
export interface UiCommentCardProps {
  thread: CommentThread;
}

export function UiCommentCard({ thread }: UiCommentCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <article
      style={{
        display: 'flex',
        gap: '20px',
        background: 'var(--spm-bg-secondary)',
        border: '1px solid var(--spm-border)',
        borderRadius: 'var(--spm-radius)',
        padding: '20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        height: 'auto',
      }}
    >
      {/* Thumbnail Column */}
      <div style={{ flexShrink: 0, width: '130px' }}>
        <a
          href={thread.postUrl}
          style={{
            display: 'block',
            borderRadius: 'calc(var(--spm-radius) - 4px)',
            overflow: 'hidden',
            border: hovered ? '1px solid var(--spm-accent)' : '1px solid var(--spm-border)',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <img
            src={thread.thumbnailUrl}
            alt="Thumbnail"
            style={{
              width: '100%',
              height: '130px',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </a>
      </div>

      {/* Details, Comments & Tags Column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Post details header */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '11px',
            color: 'var(--spm-text-muted)',
            borderBottom: '1px solid var(--spm-border)',
            paddingBottom: '8px',
            marginBottom: '14px',
          }}
        >
          <span>
            <strong>Date:</strong> {(thread.postDate || '').replace('Date', '').trim()}
          </span>
          <span>
            <strong>Posted by:</strong> {(thread.postUser || '').replace('User', '').trim()}
          </span>
          <span>
            <strong>Rating:</strong> {(thread.postRating || '').replace('Rating', '').trim()}
          </span>
          <span>
            <strong>Score:</strong> {(thread.postScore || '').replace('Score', '').trim()}
          </span>
        </div>

        {/* Comment replies sub-list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
          {(thread.comments || []).map((cmt, idx) => (
            <UiCommentReply key={idx} comment={cmt} />
          ))}
        </div>

        {/* Associated tags list */}
        {thread.tags && thread.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {thread.tags.map((tag, tagIdx) => {
              const isArtist = tag.type.includes('artist');
              const isChar = tag.type.includes('character');
              const isCopy = tag.type.includes('copyright');
              const isMeta = tag.type.includes('metadata');
              const dotColor = isArtist
                ? '#ef4444' // red
                : isChar
                ? '#10b981' // green
                : isCopy
                ? '#a855f7' // purple
                : isMeta
                ? '#f59e0b' // orange
                : '#9ca3af'; // gray/general
              return (
                <a
                  key={tagIdx}
                  href={tag.url}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '16px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: 'var(--spm-text-muted)',
                    textDecoration: 'none',
                    fontWeight: 500,
                    transition: 'background 0.15s, color 0.15s, transform 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = 'var(--spm-text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = 'var(--spm-text-muted)';
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: dotColor,
                      marginRight: '6px',
                      flexShrink: 0,
                    }}
                  />
                  {tag.label}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}

// 3. Page Layout Composer Component
export function UiCommentListPage({
  pageTitle = 'Comments',
  threads = [],
  pageLinks = [],
  height = '100vh',
  className = '',
  style = {},
}: UiCommentListPageProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        height,
        background: 'var(--spm-bg-primary)',
        color: 'var(--spm-text-primary)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
        ...style,
      }}
    >
      <style>{`
        #sidebarSlot-container:empty {
          display: none !important;
        }
      `}</style>
      {/* Sidebar slot - legacy sidebar nodes reparented here */}
      <aside
        id="sidebarSlot-container"
        style={{
          width: '240px',
          flexShrink: 0,
          borderRight: '1px solid var(--spm-border)',
          background: 'var(--spm-bg-secondary)',
          padding: '16px',
          overflowY: 'auto',
          boxSizing: 'border-box',
        }}
      />

      {/* Main content scroll container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        {/* Header */}
        <header
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--spm-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'var(--spm-bg-secondary)',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--spm-text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            {pageTitle}
          </h1>

          <UiPaginationBar pageLinks={pageLinks} />
        </header>

        {/* Scrollable list of comment cards */}
        <main
          style={{
            padding: '24px',
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            boxSizing: 'border-box',
          }}
        >
          {threads.length === 0 ? (
            <div style={{ color: 'var(--spm-text-muted)', fontSize: '14px', margin: 'auto' }}>
              No comments found.
            </div>
          ) : (
            threads.map((thread) => (
              <UiCommentCard key={thread.id} thread={thread} />
            ))
          )}
        </main>
      </div>
    </div>
  );
}
