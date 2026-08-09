import React from 'react';

export interface PrimitiveProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
}

export function UiBox({ className, children, ...props }: PrimitiveProps) {
  return <div className={className} {...props}>{children}</div>;
}

export function UiFlexRow({ className, children, ...props }: PrimitiveProps) {
  return <div className={`flex flex-row ${className || ''}`} {...props}>{children}</div>;
}

export function UiFlexColumn({ className, children, ...props }: PrimitiveProps) {
  return <div className={`flex flex-col ${className || ''}`} {...props}>{children}</div>;
}

export function UiGrid({ className, children, ...props }: PrimitiveProps) {
  return <div className={`grid ${className || ''}`} {...props}>{children}</div>;
}

export interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string;
  content?: string;
}

export function UiText({ className, content, ...props }: TextProps) {
  return <span className={className} {...props}>{content}</span>;
}

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
}

export function UiImage({ className, src, alt, ...props }: ImageProps) {
  return <img className={className} src={src} alt={alt} {...props} />;
}

export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  className?: string;
  children?: React.ReactNode;
}

export function UiLink({ className, href, children, ...props }: LinkProps) {
  return <a className={className} href={href} {...props}>{children}</a>;
}

export interface ScrollBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
  height?: string;
  maxHeight?: string;
  overflow?: 'auto' | 'scroll' | 'hidden' | 'visible';
  overflowX?: 'auto' | 'scroll' | 'hidden' | 'visible';
  overflowY?: 'auto' | 'scroll' | 'hidden' | 'visible';
}

export function UiScrollBox({
  className = '',
  children,
  height,
  maxHeight,
  overflow = 'auto',
  overflowX,
  overflowY,
  style = {},
  ...props
}: ScrollBoxProps) {
  return (
    <div
      className={className}
      style={{
        height,
        maxHeight,
        overflow: overflowX || overflowY ? undefined : overflow,
        overflowX,
        overflowY,
        boxSizing: 'border-box',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
