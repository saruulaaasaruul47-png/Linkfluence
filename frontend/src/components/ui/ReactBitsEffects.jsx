import { useCallback, useRef } from 'react'
import { cn } from '../../lib/cn'

export function AuroraBackground({ tone = 'mint', className = '' }) {
  return (
    <div className={cn('reactbits-aurora', `reactbits-aurora-${tone}`, className)} aria-hidden="true">
      <span data-aurora-layer="one" />
      <span data-aurora-layer="two" />
      <span data-aurora-layer="three" />
    </div>
  )
}

export function SpotlightCard({ as: Component = 'div', className = '', children, onPointerMove, onPointerLeave, ...props }) {
  const ref = useRef(null)

  const handlePointerMove = useCallback((event) => {
    const node = ref.current
    if (!node) return

    const rect = node.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const rotateX = ((rect.height / 2 - y) / rect.height) * 7
    const rotateY = ((x - rect.width / 2) / rect.width) * 7

    node.style.setProperty('--spotlight-x', `${x}px`)
    node.style.setProperty('--spotlight-y', `${y}px`)
    node.style.setProperty('--depth-rotate-x', `${rotateX.toFixed(2)}deg`)
    node.style.setProperty('--depth-rotate-y', `${rotateY.toFixed(2)}deg`)
    onPointerMove?.(event)
  }, [onPointerMove])

  const handlePointerLeave = useCallback((event) => {
    const node = ref.current
    if (node) {
      node.style.setProperty('--depth-rotate-x', '0deg')
      node.style.setProperty('--depth-rotate-y', '0deg')
    }
    onPointerLeave?.(event)
  }, [onPointerLeave])

  return (
    <Component
      ref={ref}
      className={cn('reactbits-spotlight-card', className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...props}
    >
      {children}
    </Component>
  )
}
