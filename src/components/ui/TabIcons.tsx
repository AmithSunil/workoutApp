import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
  focused?: boolean;
}

export function HomeIcon({ color, size = 22, focused }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="3"
        width="8"
        height="8"
        stroke={color}
        strokeWidth={focused ? "2.5" : "1.8"}
        fill={focused ? color : "none"}
      />
      <Rect
        x="13"
        y="3"
        width="8"
        height="8"
        stroke={color}
        strokeWidth={focused ? "2.5" : "1.8"}
      />
      <Rect
        x="3"
        y="13"
        width="8"
        height="8"
        stroke={color}
        strokeWidth={focused ? "2.5" : "1.8"}
      />
      <Rect
        x="13"
        y="13"
        width="8"
        height="8"
        stroke={color}
        strokeWidth={focused ? "2.5" : "1.8"}
        fill={focused ? color : "none"}
      />
    </Svg>
  );
}

export function LogIcon({ color, size = 22, focused }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19C23 19.5523 22.5523 20 20 20H4C3.44772 20 3 19.5523 3 19V7C3 6.44772 3.44772 6 4 6H7.5L9.5 3.5H14.5L16.5 6H20C20.5523 6 21 6.44772 21 7V19Z"
        stroke={color}
        strokeWidth={focused ? "2.2" : "1.8"}
        fill={focused ? color + "22" : "none"}
      />
      <Path
        d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z"
        stroke={color}
        strokeWidth={focused ? "2.5" : "1.8"}
        fill={focused ? color : "none"}
      />
    </Svg>
  );
}

export function WorkoutsIcon({ color, size = 22, focused }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.5 4V20M17.5 4V20M2 9V15M22 9V15M6.5 12H17.5"
        stroke={color}
        strokeWidth={focused ? "2.5" : "1.8"}
        strokeLinecap="square"
      />
      <Rect x="4.5" y="7" width="4" height="10" stroke={color} strokeWidth={focused ? "2" : "1.5"} fill={focused ? color : "none"} />
      <Rect x="15.5" y="7" width="4" height="10" stroke={color} strokeWidth={focused ? "2" : "1.5"} fill={focused ? color : "none"} />
    </Svg>
  );
}

export function ProgressIcon({ color, size = 22, focused }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 20H21M4 16L9 11L13 15L20 7"
        stroke={color}
        strokeWidth={focused ? "2.5" : "1.8"}
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <Path
        d="M16 7H20V11"
        stroke={color}
        strokeWidth={focused ? "2.5" : "1.8"}
        strokeLinecap="square"
      />
    </Svg>
  );
}
