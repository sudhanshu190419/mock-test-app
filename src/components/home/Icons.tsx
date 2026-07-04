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
  | 'arrow-right'
  | 'atom'
  | 'badge-check'
  | 'bar-chart-2'
  | 'bell'
  | 'book'
  | 'bookmark'
  | 'book-open'
  | 'clipboard-list'
  | 'eye'
  | 'graduation-cap'
  | 'headphones'
  | 'home'
  | 'play-circle'
  | 'shield-check'
  | 'star'
  | 'stethoscope'
  | 'trophy'
  | 'user'
  | 'users';

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
