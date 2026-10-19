interface BotAvatarSvgProps {
  size?: number
  className?: string
  color?: string
}

export function BotAvatarSvg({
  size = 24,
  className = '',
  color = 'currentColor',
}: BotAvatarSvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      aria-label="NutriBot Assistant"
    >
      {/* Top Antenna Head Circle */}
      <circle
        cx="50"
        cy="19"
        r="7"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Antenna Stem */}
      <line
        x1="50"
        y1="26"
        x2="50"
        y2="36"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Left Ear / Headphone */}
      <path
        d="M26 44H20C16.6863 44 14 46.6863 14 50V58C14 61.3137 16.6863 64 20 64H26"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right Ear / Headphone */}
      <path
        d="M74 44H80C83.3137 44 86 46.6863 86 50V58C86 61.3137 83.3137 64 80 64H74"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Main Head Rounded Bubble with Tail */}
      <path
        d="M38 36H62C72 36 76 40 76 50V60C76 70 72 74 62 74H52L40 82V74H38C28 74 24 70 24 60V50C24 40 28 36 38 36Z"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Left Eye */}
      <rect
        x="37"
        y="49"
        width="6"
        height="11"
        rx="3"
        fill={color}
      />

      {/* Right Eye */}
      <rect
        x="57"
        y="49"
        width="6"
        height="11"
        rx="3"
        fill={color}
      />

      {/* Happy Smile */}
      <path
        d="M42 63C44.5 66.5 55.5 66.5 58 63"
        stroke={color}
        strokeWidth="5.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default BotAvatarSvg
