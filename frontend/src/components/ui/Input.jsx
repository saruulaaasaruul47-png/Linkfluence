import { forwardRef, useId } from 'react'
import { CalendarDays } from 'lucide-react'
import { cn } from '../../lib/cn'

export const Input = forwardRef(function Input({ label, error, help, reserveMessage = false, className, id, ...props }, ref) {
  const generatedId = useId()
  const inputId = id || props.name || generatedId
  const messageId = `${inputId}-message`
  const isDate = props.type === 'date'
  return <div className={className}>
    {label && <label className="ui-label" htmlFor={inputId}>{label}</label>}
    {isDate ? (
      <span className="ui-date-wrap">
        <input ref={ref} id={inputId} aria-invalid={Boolean(error)} aria-describedby={(error || help) ? messageId : undefined} className={cn('ui-field ui-date-field', error && 'ui-field-error')} {...props} />
        <span className="ui-date-icon" aria-hidden="true"><CalendarDays size={16} /></span>
      </span>
    ) : (
      <input ref={ref} id={inputId} aria-invalid={Boolean(error)} aria-describedby={(error || help) ? messageId : undefined} className={cn('ui-field', error && 'ui-field-error')} {...props} />
    )}
    {reserveMessage
      ? <div className="min-h-6">{error ? <p id={messageId} role="alert" className="ui-error">{error}</p> : help && <p id={messageId} className="ui-help">{help}</p>}</div>
      : error ? <p id={messageId} role="alert" className="ui-error">{error}</p> : help && <p id={messageId} className="ui-help">{help}</p>}
  </div>
})
