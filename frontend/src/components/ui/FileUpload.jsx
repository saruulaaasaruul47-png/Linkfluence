import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ImagePlus, UploadCloud, X } from 'lucide-react'

export function FileUpload({ label, accept = 'image/*', multiple = false, compact = false, value, onChange }) {
  const id = useId()
  const inputRef = useRef(null)
  const [files, setFiles] = useState([])
  const previews = useMemo(() => files.map((file) => ({
    file,
    url: file.type.startsWith('image/') || file.type.startsWith('video/') ? URL.createObjectURL(file) : '',
  })), [files])
  useEffect(() => () => previews.forEach(({ url }) => { if (url) URL.revokeObjectURL(url) }), [previews])
  const handleFiles = (list) => {
    const next = [...list]
    setFiles(next)
    onChange?.(next)
  }
  const removeFile = (file) => {
    setFiles((current) => {
      const next = current.filter((item) => item !== file)
      onChange?.(next)
      return next
    })
  }
  const clearStoredValue = () => onChange?.([])
  return <div>
    <label htmlFor={id} className="ui-label">{label}</label>
    <button type="button" onClick={() => inputRef.current?.click()} className={`w-full rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 text-center transition hover:border-pink hover:bg-pink-soft/30 ${compact ? 'min-h-24' : 'min-h-36'}`}>
      <span className="mx-auto mb-2 grid size-9 place-items-center rounded-full bg-[var(--surface-2)]">{accept.includes('image') ? <ImagePlus size={17} /> : <UploadCloud size={17} />}</span>
      <strong className="text-sm">Choose {multiple ? 'files' : 'a file'}</strong>
      <span className="mt-1 block text-xs text-[var(--subtle)]">PNG, JPG or MP4 · Up to 5 MB</span>
    </button>
    <input id={id} ref={inputRef} className="sr-only" type="file" accept={accept} multiple={multiple} onChange={(event) => handleFiles(event.target.files)} />
    {files.length > 0 && <div className={`mt-2 grid gap-2 ${multiple ? 'sm:grid-cols-2' : ''}`}>{previews.map(({ file, url }) => <div key={`${file.name}-${file.size}`} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
      {url && <div className="aspect-[16/9] overflow-hidden bg-black/10">{file.type.startsWith('video/') ? <video src={url} muted playsInline controls preload="metadata" className="size-full object-cover" /> : <img src={url} alt="" decoding="async" className="size-full object-cover" />}</div>}
      <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs"><span className="min-w-0 truncate">{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => removeFile(file)} className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-black/10"><X size={14} /></button></div>
    </div>)}</div>}
    {!files.length && value && <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-xs"><span className="min-w-0 truncate">{value}</span><button type="button" aria-label={`Remove ${value}`} onClick={clearStoredValue}><X size={14} /></button></div>}
  </div>
}
