"use client"

import { useEffect, useRef, useState } from "react"

/** Draw-to-sign canvas. Calls onChange with a PNG data URL, or null when cleared. */
export function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const strokes = useRef(0)
  const [empty, setEmpty] = useState(true)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ratio = Math.max(1, window.devicePixelRatio || 1)
    const rect = c.getBoundingClientRect()
    c.width = rect.width * ratio
    c.height = rect.height * ratio
    const ctx = c.getContext("2d")!
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#111"
  }, [])

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    last.current = point(e)
    const ctx = e.currentTarget.getContext("2d")!
    ctx.beginPath()
    ctx.arc(last.current.x, last.current.y, 1, 0, Math.PI * 2)
    ctx.fillStyle = "#111"
    ctx.fill()
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !last.current) return
    const p = point(e)
    const ctx = e.currentTarget.getContext("2d")!
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
  }

  function end() {
    if (!drawing.current) return
    drawing.current = false
    last.current = null
    strokes.current += 1
    setEmpty(false)
    onChange(trimmedPng())
  }

  /** Crops to the drawn area so the stored image is small and prints cleanly. */
  function trimmedPng(): string | null {
    const c = canvasRef.current
    if (!c) return null
    const ctx = c.getContext("2d")!
    const { width, height } = c
    const px = ctx.getImageData(0, 0, width, height).data
    let minX = width, minY = height, maxX = -1, maxY = -1
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (px[(y * width + x) * 4 + 3] > 0) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    if (maxX < 0) return null
    const pad = 8
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad)
    maxX = Math.min(width - 1, maxX + pad); maxY = Math.min(height - 1, maxY + pad)
    const out = document.createElement("canvas")
    out.width = maxX - minX + 1
    out.height = maxY - minY + 1
    out.getContext("2d")!.drawImage(c, minX, minY, out.width, out.height, 0, 0, out.width, out.height)
    return out.toDataURL("image/png")
  }

  function clear() {
    const c = canvasRef.current
    if (!c) return
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height)
    strokes.current = 0
    setEmpty(true)
    onChange(null)
  }

  return (
    <div>
      <div className="relative rounded-lg border-2 border-dashed border-gray-300 bg-white">
        <canvas
          ref={canvasRef}
          className="block h-40 w-full touch-none cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
        />
        {empty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-400">
            Draw your signature here
          </div>
        )}
        <div className="pointer-events-none absolute bottom-8 left-6 right-6 border-b border-gray-300" />
      </div>
      <button type="button" onClick={clear} className="mt-1 text-xs text-gray-500 hover:underline">Clear</button>
    </div>
  )
}
