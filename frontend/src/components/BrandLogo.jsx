import { Link } from 'react-router-dom'
import { cn } from '../lib/cn'

export function BrandLogo({ href, to = '/', className, label = 'VYRA home' }) {
  const content = <>V<span>Y</span>RA<sup>®</sup></>

  if (href) {
    return <a className={cn('brand-logo', className)} href={href} aria-label={label}>{content}</a>
  }

  return <Link className={cn('brand-logo', className)} to={to} aria-label={label}>{content}</Link>
}
