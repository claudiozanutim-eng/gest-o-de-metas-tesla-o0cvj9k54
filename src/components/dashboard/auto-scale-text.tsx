import { useState, useEffect, useRef } from 'react'

export function AutoScaleText({
  value,
  maxSize = 28,
  minSize = 13,
  className = '',
}: {
  value: string
  maxSize?: number
  minSize?: number
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = useState(maxSize)

  useEffect(() => {
    const container = containerRef.current
    const text = textRef.current
    if (!container || !text) return

    const adjust = () => {
      let size = maxSize
      text.style.fontSize = `${size}px`
      while (size > minSize && text.scrollWidth > container.clientWidth) {
        size -= 1
        text.style.fontSize = `${size}px`
      }
      setFontSize(size)
    }

    adjust()
    const ro = new ResizeObserver(adjust)
    ro.observe(container)
    return () => ro.disconnect()
  }, [value, maxSize, minSize])

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <span
        ref={textRef}
        className={className}
        style={{ fontSize: `${fontSize}px`, whiteSpace: 'nowrap', display: 'inline-block' }}
      >
        {value}
      </span>
    </div>
  )
}
