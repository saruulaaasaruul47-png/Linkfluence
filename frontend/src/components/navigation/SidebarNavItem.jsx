import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'

export function SidebarNavItem({
  label,
  to,
  icon: Icon,
  collapsed = false,
  activeClass,
  inactiveClass = 'text-white/45 hover:bg-white/[.05] hover:text-white',
  forceActive = false,
  end = false,
  onNavigate,
}) {
  const anchorRef = useRef(null)
  const tooltipId = useId()
  const [tooltip, setTooltip] = useState(null)

  const updateTooltip = () => {
    const bounds = anchorRef.current?.getBoundingClientRect()
    if (!bounds) return
    setTooltip({
      left: bounds.right + 12,
      top: bounds.top + (bounds.height / 2),
    })
  }

  const showTooltip = () => {
    if (!collapsed) return
    updateTooltip()
  }

  useEffect(() => {
    if (!collapsed || !tooltip) return undefined
    const update = () => updateTooltip()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [collapsed, tooltip])

  return (
    <>
      <NavLink
        ref={anchorRef}
        to={to}
        end={end}
        onClick={onNavigate}
        aria-label={collapsed ? label : undefined}
        aria-describedby={collapsed && tooltip ? tooltipId : undefined}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setTooltip(null)}
        onFocus={showTooltip}
        onBlur={() => setTooltip(null)}
        className={({ isActive }) => `flex items-center rounded-xl py-2.5 text-xs transition ${
          collapsed ? 'justify-center px-2' : 'gap-3 px-3'
        } ${isActive || forceActive ? activeClass : inactiveClass}`}
      >
        <Icon size={16} aria-hidden="true" />
        {!collapsed && <span>{label}</span>}
      </NavLink>

      {collapsed && tooltip && typeof document !== 'undefined' && createPortal(
        <span
          id={tooltipId}
          role="tooltip"
          style={{ left: tooltip.left, top: tooltip.top }}
          className="pointer-events-none fixed z-[140] -translate-y-1/2 whitespace-nowrap rounded-xl border border-white/12 bg-[#202020]/98 px-3 py-2 text-xs font-semibold text-white shadow-[0_14px_38px_rgba(0,0,0,.48)] backdrop-blur-xl"
        >
          <i className="absolute -left-1 top-1/2 size-2 -translate-y-1/2 rotate-45 border-b border-l border-white/12 bg-[#202020]" />
          {label}
        </span>,
        document.body,
      )}
    </>
  )
}
