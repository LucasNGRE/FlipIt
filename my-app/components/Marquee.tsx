'use client'

interface MarqueeProps {
  items: string[]
  speed?: 'slow' | 'normal' | 'fast'
  repeat?: number
  background?: string
  color?: string
  borderColor?: string
  className?: string
}

const DURATION = { slow: '50s', normal: '30s', fast: '18s' }

export default function Marquee({
  items,
  speed = 'normal',
  repeat = 1,
  background = 'var(--ink)',
  color = 'var(--acid)',
  borderColor = 'rgba(255,255,255,.08)',
  className = '',
}: MarqueeProps) {
  const repeated = Array.from({ length: repeat }, () => items).flat()
  return (
    <div
      className={`w-full overflow-hidden border-y ${className}`}
      style={{ background, borderColor }}
      aria-hidden="true"
    >
      {/* Two identical groups side by side, each min 100vw → total >= 200vw → -50% always fills viewport */}
      <div
        className="flex"
        style={{
          animation: `marquee ${DURATION[speed]} linear infinite`,
          willChange: 'transform',
        }}
      >
        {[0, 1].map(copy => (
          <div
            key={copy}
            className="flex flex-shrink-0 items-center justify-around py-3"
            style={{ minWidth: '100vw' }}
          >
            {repeated.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-3 px-4 font-mono text-[13px] uppercase tracking-[.1em] whitespace-nowrap"
                style={{ color }}
              >
                {item}
                <span style={{ opacity: 0.4 }}>·</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
