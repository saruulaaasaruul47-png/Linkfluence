import { forwardRef, useId } from 'react'
import { cn } from '../../lib/cn'

export const Textarea = forwardRef(function Textarea({ label, error, help, className, id, rows = 4, ...props }, ref) {
  const generatedId = useId()
  const textareaId = id || props.name || generatedId
  const messageId = `${textareaId}-message`
  return <div className={className}>
    {label && <label className="ui-label" htmlFor={textareaId}>{label}</label>}
    <textarea ref={ref} id={textareaId} rows={rows} aria-invalid={Boolean(error)} aria-describedby={(error || help) ? messageId : undefined} className={cn('ui-field resize-y', error && 'ui-field-error')} {...props} />
    {error ? <p id={messageId} role="alert" className="ui-error">{error}</p> : help && <p id={messageId} className="ui-help">{help}</p>}
  </div>
})
