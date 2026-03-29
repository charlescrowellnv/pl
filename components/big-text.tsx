"use client"

import { useLayoutEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export type BigTextProps = {
  text: string
  className?: string
}

export default function BigText({ text, className }: BigTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)
  const [fontSizePx, setFontSizePx] = useState<number | null>(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    const el = textRef.current
    if (!container || !el) return

    const fit = () => {
      const width = container.clientWidth
      if (width <= 0) return

      if (!text.trim()) {
        setFontSizePx(0)
        return
      }

      let lo = 4
      let hi = Math.min(4096, Math.max(width * 2, 64))
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2
        el.style.fontSize = `${mid}px`
        if (el.scrollWidth <= width) {
          lo = mid
        } else {
          hi = mid
        }
      }
      setFontSizePx(lo)
    }

    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(container)
    return () => ro.disconnect()
  }, [text])

  return (
    <div ref={containerRef} className={cn("w-full min-w-0", className)}>
      <p
        ref={textRef}
        className="leading-none font-light tracking-tighter whitespace-nowrap"
        style={{
          fontSize: fontSizePx !== null ? `${fontSizePx}px` : undefined,
          visibility: fontSizePx !== null ? "visible" : "hidden",
        }}
      >
        {text}
      </p>
    </div>
  )
}
