import React from 'react';

interface PrimitiveProps extends React.HTMLAttributes<HTMLDivElement> {
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

interface TextProps extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string;
  content?: string;
}

export function UiText({ className, content, ...props }: TextProps) {
  return <span className={className} {...props}>{content}</span>;
}

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
}

export function UiImage({ className, src, alt, ...props }: ImageProps) {
  return <img className={className} src={src} alt={alt} {...props} />;
}

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  className?: string;
  children?: React.ReactNode;
}

export function UiLink({ className, href, children, ...props }: LinkProps) {
  return <a className={className} href={href} {...props}>{children}</a>;
}
