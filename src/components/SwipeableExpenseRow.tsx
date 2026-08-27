import { useEffect, useRef, useState, type ReactNode } from 'react'

const ACTION_WIDTH = 132

export function SwipeableExpenseRow({
  children,
  onEdit,
  onDelete,
}: {
  children: ReactNode
  onEdit: () => void
  onDelete: () => void
}) {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startOffset = useRef(0)
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function closeOnOutside(e: MouseEvent | TouchEvent) {
      if (!rowRef.current?.contains(e.target as Node)) {
        setOffset(0)
      }
    }
    if (offset < 0) {
      document.addEventListener('touchstart', closeOnOutside)
      document.addEventListener('mousedown', closeOnOutside)
    }
    return () => {
      document.removeEventListener('touchstart', closeOnOutside)
      document.removeEventListener('mousedown', closeOnOutside)
    }
  }, [offset])

  function snap(open: boolean) {
    setOffset(open ? -ACTION_WIDTH : 0)
  }

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('.swipe-action')) return
    if (window.matchMedia('(min-width: 760px)').matches) return
    startX.current = e.clientX
    startOffset.current = offset
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const dx = e.clientX - startX.current
    const next = Math.min(0, Math.max(-ACTION_WIDTH, startOffset.current + dx))
    setOffset(next)
  }

  function onPointerUp() {
    if (!dragging) return
    setDragging(false)
    snap(offset < -ACTION_WIDTH / 3)
  }

  return (
    <div className="swipe-row" ref={rowRef}>
      <div className="swipe-actions" aria-hidden={offset === 0}>
        <button type="button" className="swipe-action swipe-action-edit" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="swipe-action swipe-action-delete" onClick={onDelete}>
          Delete
        </button>
      </div>
      <div
        className={`swipe-content expense-item${dragging ? ' dragging' : ''}`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
        <div className="swipe-desktop-actions">
          <button type="button" className="swipe-desktop-btn" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="swipe-desktop-btn danger" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
