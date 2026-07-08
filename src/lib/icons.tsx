/* Hand-rolled stroke icon set (lucide-style, 24px grid, 1.75 stroke).
   One coherent family, currentColor, keyboard/screen-reader safe. */
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Svg({ size = 20, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const DashboardIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 13h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1Z" />
    <path d="M14 21h6a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1Z" />
    <path d="M14 8h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1Z" />
    <path d="M4 21h6a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1Z" />
  </Svg>
)

export const CertIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z" />
    <path d="M6 9.7V14c0 1.4 2.7 3 6 3s6-1.6 6-3V9.7" />
    <path d="M21 7.5V13" />
  </Svg>
)

export const MaterialsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" />
    <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5v-13Z" />
  </Svg>
)

export const ScheduleIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4.5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 3v3M16 3v3" />
    <path d="M8 13h3v3H8z" />
  </Svg>
)

export const SunIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Svg>
)

export const MoonIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
  </Svg>
)

export const PlayIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 7 5.5Z" />
  </Svg>
)

export const ArrowRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
)

export const ExternalIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
  </Svg>
)

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12.5 9 17.5 20 6.5" />
  </Svg>
)

export const CheckCircleIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.2 11 15.2 16.2 9.4" />
  </Svg>
)

export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
)

export const DotCircleIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
  </Svg>
)

export const CalendarPinIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 9.5h16M8 3.5v3M16 3.5v3" />
  </Svg>
)

export const TargetIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </Svg>
)

export const TrendUpIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 17 9.5 10.5l4 4L21 7" />
    <path d="M15 7h6v6" />
  </Svg>
)

export const FileIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v4h4M8.5 13h7M8.5 16.5h7" />
  </Svg>
)

export const VideoIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5.5" width="13" height="13" rx="2" />
    <path d="M16 10l5-3v10l-5-3" />
  </Svg>
)

export const NoteIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 4h14a1 1 0 0 1 1 1v10l-5 5H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
    <path d="M20 15h-5v5M8 9h8M8 12.5h5" />
  </Svg>
)

export const BookIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H18a1 1 0 0 1 1 1v13.5a1 1 0 0 1-1 1H5.5A1.5 1.5 0 0 0 4 21V5.5Z" />
    <path d="M4 18.5A1.5 1.5 0 0 1 5.5 17H19" />
  </Svg>
)

export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
)

export const ChevronLeftIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Svg>
)

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const AlertIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.3 3.9 2.4 17.5A1.7 1.7 0 0 0 3.9 20h16.2a1.7 1.7 0 0 0 1.5-2.5L13.7 3.9a1.7 1.7 0 0 0-3 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Svg>
)

export const MenuIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Svg>
)

export const XIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)
