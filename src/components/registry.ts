import React from 'react';
import { UiImageCard } from './dedicated/UiImageCard';
import { UiModernGridPage } from './dedicated/UiModernGridPage';
import { UiNavHeader } from './dedicated/UiNavHeader';
import { UiPostDetails } from './dedicated/UiPostDetails';
import { UiTagBadge } from './dedicated/UiTagBadge';
import { UiSearchBar } from './dedicated/UiSearchBar';
import { UiPaginationBar } from './dedicated/UiPaginationBar';
import { UiHeroLanding } from './dedicated/UiHeroLanding';
import { UiBox, UiFlexRow, UiFlexColumn, UiGrid, UiText, UiImage, UiLink } from './primitives/LayoutPrimitives';

export const COMPONENT_REGISTRY: Record<string, React.ComponentType<any>> = {
  UiImageCard,
  UiModernGridPage,
  UiNavHeader,
  UiPostDetails,
  UiTagBadge,
  UiSearchBar,
  UiPaginationBar,
  UiHeroLanding,
  UiBox,
  UiFlexRow,
  UiFlexColumn,
  UiGrid,
  UiText,
  UiImage,
  UiLink
};

export const PRIMITIVE_COMPONENTS = [
  'UiBox',
  'UiGrid',
  'UiFlexRow',
  'UiFlexColumn',
  'UiText',
  'UiImage',
  'UiLink'
];

export const DEDICATED_COMPONENTS = [
  'UiImageCard',
  'UiModernGridPage',
  'UiNavHeader',
  'UiPostDetails',
  'UiTagBadge',
  'UiSearchBar',
  'UiPaginationBar',
  'UiHeroLanding'
];
