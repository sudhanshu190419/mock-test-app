/**
 * Icon component — lightweight SVG icons using react-native-svg.
 *
 * Only includes the icons used on the home screen. Extend the `name`
 * union and `PATHS` map when new icons are needed.
 *
 * @module components/home/Icons
 */

import React from 'react';
import Svg, { Path, Circle, Rect, G, type SvgProps } from 'react-native-svg';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Icon names used across home screen components. */
export type IconName =
  | 'alert-triangle'
  | 'arrow-left'
  | 'arrow-right'
  | 'architecture'
  | 'atom'
  | 'badge-check'
  | 'balance'
  | 'bar-chart-2'
  | 'bell'
  | 'book'
  | 'bookmark'
  | 'bookmark-check'
  | 'book-open'
  | 'calendar'
  | 'check-circle'
  | 'chevron-left'
  | 'chevron-right'
  | 'clipboard-list'
  | 'description'
  | 'delete'
  | 'download'
  | 'eye'
  | 'filter'
  | 'graduation-cap'
  | 'headphones'
  | 'home'
  | 'info'
  | 'layers'
  | 'layout-grid'
  | 'log-out'
  | 'menu'
  | 'menu-book'
  | 'minus'
  | 'monitor'
  | 'more-vertical'
  | 'play-circle'
  | 'school'
  | 'science'
  | 'search'
  | 'send'
  | 'shield-check'
  | 'star'
  | 'stethoscope'
  | 'timer'
  | 'trophy'
  | 'user'
  | 'users'
  | 'video'
  | 'x'
  | 'x-circle';

export interface IconProps extends Pick<SvgProps, 'color' | 'width' | 'height'> {
  /** The icon to render. */
  name: IconName;
  /** Icon colour. Defaults to currentColor. */
  color?: string;
  /** Icon width in dp. Defaults to 24. */
  width?: number;
  /** Icon height in dp. Defaults to 24. */
  height?: number;
}

// ─── SVG Path Maps ──────────────────────────────────────────────────────────

/** Centralised SVG path data for every supported icon. */
const PATHS: Record<IconName, React.JSX.Element> = {
  'arrow-left': (
    <Path
      d="M19 12H5m7-7-7 7 7 7"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
    />
  ),

  menu: (
    <Path
      d="M4 6h16M4 12h16M4 18h16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.2}
    />
  ),

  'more-vertical': (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Circle cx={12} cy={5} r={1.5} />
      <Circle cx={12} cy={12} r={1.5} />
      <Circle cx={12} cy={19} r={1.5} />
    </G>
  ),

  'arrow-right': (
    <Path
      d="M5 12h14m-7-7l7 7-7 7"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
    />
  ),

  'chevron-right': (
    <Path
      d="M9 18l6-6-6-6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
    />
  ),

  calendar: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.85}
    >
      <Rect x={3} y={4} width={18} height={18} rx={2} ry={2} />
      <Path d="M16 2v4M8 2v4M3 10h18" />
    </G>
  ),

  science: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.85}
    >
      <Path d="M10 2v6.5a4.5 4.5 0 0 1-4.5 4.5H4.5A4.5 4.5 0 0 1 9 8.5V2" />
      <Path d="M15 2v6.5a4.5 4.5 0 0 0 4.5 4.5h1A4.5 4.5 0 0 0 16 8.5V2" />
      <Path d="M12 13v9" />
      <Path d="M8 22h8" />
      <Path d="M6 7.5A4.5 4.5 0 0 0 10.5 12" />
      <Path d="M18 7.5A4.5 4.5 0 0 1 13.5 12" />
    </G>
  ),

  architecture: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.85}
    >
      <Path d="M12 2L2 7l10 5 10-5-10-5z" />
      <Path d="M2 17l10 5 10-5" />
      <Path d="M2 12l10 5 10-5" />
    </G>
  ),

  school: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.85}
    >
      <Path d="M14 22v-4a2 2 0 1 0-4 0v4" />
      <Path d="M18 10l2.5 1.5v6.75" />
      <Path d="M22 22V6l-10-4L2 6v16" />
      <Path d="M7 10h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z" />
      <Path d="M2 22h20" />
    </G>
  ),

  balance: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.85}
    >
      <Path d="M12 2v4" />
      <Path d="M4 6l2-2h12l2 2" />
      <Path d="M6 6v2a6 6 0 0 0 12 0V6" />
      <Path d="M2 22h20" />
      <Path d="M8 22V14a4 4 0 0 1 8 0v8" />
      <Path d="M8 18h8" />
    </G>
  ),

  'menu-book': (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.85}
    >
      <Path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      <Path d="M12 6v7l2-2 2 2V6" />
    </G>
  ),

  download: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <Path d="M7 10l5 5 5-5" />
      <Path d="M12 15V3" />
    </G>
  ),

  'log-out': (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <Path d="M16 17l5-5-5-5" />
      <Path d="M21 12H9" />
    </G>
  ),

  bookmark: (
    <Path
      d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  ),

  eye: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.85}
    >
      <Path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <Circle cx={12} cy={12} r={3} />
    </G>
  ),

  star: (
    <Path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      fill="currentColor"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
    />
  ),

  timer: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.85}
    >
      <Circle cx={12} cy={13} r={8} />
      <Path d="M12 9v4l2 2" />
      <Path d="M10 2h4" />
      <Path d="M12 2v3" />
    </G>
  ),

  'check-circle': (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Circle cx={12} cy={12} r={10} />
      <Path d="m9 12 2 2 4-4" />
    </G>
  ),

  'x-circle': (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Circle cx={12} cy={12} r={10} />
      <Path d="m15 9-6 6M9 9l6 6" />
    </G>
  ),

  'alert-triangle': (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <Path d="M12 9v4M12 17h.01" />
    </G>
  ),

  'bookmark-check': (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" />
      <Path d="m9 10 2 2 4-4" />
    </G>
  ),

  'chevron-left': (
    <Path
      d="m15 18-6-6 6-6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
    />
  ),

  'layout-grid': (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Rect x={3} y={3} width={7} height={7} rx={1} />
      <Rect x={14} y={3} width={7} height={7} rx={1} />
      <Rect x={14} y={14} width={7} height={7} rx={1} />
      <Rect x={3} y={14} width={7} height={7} rx={1} />
    </G>
  ),

  send: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Path d="m22 2-7 20-4-9-9-4Z" />
      <Path d="M22 2 11 13" />
    </G>
  ),

  x: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Path d="M18 6 6 18M6 6l12 12" />
    </G>
  ),

  info: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Circle cx={12} cy={12} r={10} />
      <Path d="M12 16v-4M12 8h.01" />
    </G>
  ),

  minus: (
    <Path
      d="M5 12h14"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  ),

  users: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.85}
    >
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx={9} cy={7} r={4} />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </G>
  ),

  atom: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Circle cx={12} cy={12} r={1} />
      <Path d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5" />
      <Path d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5" />
    </G>
  ),

  'badge-check': (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.85}
    >
      <Path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76" />
      <Path d="m9 12 2 2 4-4" />
    </G>
  ),

  'bar-chart-2': (
    <Path
      d="M5 21v-6m7 6V3m7 18V9"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  ),

  description: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.85}
    >
      <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
      <Path d="M16 18H8v-2h8v2zm0-4H8v-2h8v2z" />
      <Path d="M13 3v5h5" />
    </G>
  ),

  'delete': (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
      <Path d="m18 9-6 6M12 9l6 6" />
    </G>
  ),

  bell: (
    <Path
      d="M10.268 21a2 2 0 0 0 3.464 0m-10.47-5.674A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  ),

  book: (
    <Path
      d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  ),

  'book-open': (
    <Path
      d="M12 7v14m-9-3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  ),

  'clipboard-list': (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Rect x={8} y={2} width={8} height={4} rx={1} ry={1} />
      <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <Path d="m13 11 4 0" />
      <Path d="m13 16 4 0" />
      <Path d="M8 11h.01" />
      <Path d="M8 16h.01" />
    </G>
  ),

  'graduation-cap': (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0zM22 10v6" />
      <Path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </G>
  ),

  headphones: (
    <Path
      d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.85}
    />
  ),

  home: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.18}
    >
      <Path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <Path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </G>
  ),

  'play-circle': (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Path d="M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z" />
      <Circle cx={12} cy={12} r={10} />
    </G>
  ),

  filter: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </G>
  ),

  layers: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.85}
    >
      <Path d="M2 12l10-5 10 5-10 5z" />
      <Path d="M2 17l10 5 10-5" />
      <Path d="M2 7l10 5 10-5" />
    </G>
  ),

  monitor: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.85}
    >
      <Rect x={2} y={3} width={20} height={14} rx={2} ry={2} />
      <Path d="M8 21h8" />
      <Path d="M12 17v4" />
    </G>
  ),

  search: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Circle cx={11} cy={11} r={8} />
      <Path d="M21 21l-4.3-4.3" />
    </G>
  ),

  video: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.85}
    >
      <Path d="M15 10l4.5-2.5v9L15 14" />
      <Rect x={2} y={6} width={13} height={12} rx={2} ry={2} />
    </G>
  ),

  'shield-check': (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.85}
    >
      <Path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <Path d="m9 12 2 2 4-4" />
    </G>
  ),

  stethoscope: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <Path d="M11 2v2M5 2v2m0-1H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1" />
      <Path d="M8 15a6 6 0 0 0 12 0v-3" />
      <Circle cx={20} cy={10} r={2} />
    </G>
  ),

  trophy: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.85}
    >
      <Path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978m7-7.318v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978M18 9h1.5a1 1 0 0 0 0-5H18M4 22h16" />
      <Path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm0 0H4.5a1 1 0 0 1 0-5H6" />
    </G>
  ),

  user: (
    <G
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.4}
    >
      <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <Circle cx={12} cy={7} r={4} />
    </G>
  ),
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Feather-style SVG icon.
 *
 * Usage:
 * ```tsx
 * <Icon name="bell" color="#000" width={24} height={24} />
 * ```
 */
const Icon = React.memo(function Icon({
  name,
  color = 'currentColor',
  width = 24,
  height = 24,
}: IconProps): React.JSX.Element {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      color={color}
      fill="none"
    >
      {PATHS[name]}
    </Svg>
  );
});

export default Icon;
