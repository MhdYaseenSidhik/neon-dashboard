interface Opt<T extends string> { value: T; label: string }

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Opt<T>[]; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-sm border border-border bg-sunken p-1 gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`min-h-ctl-sm min-w-ctl rounded-sm px-3 text-sm font-medium transition-colors cursor-pointer ${
            o.value === value ? 'bg-surface text-fg shadow-1' : 'text-muted hover:text-fg'
          }`}
          style={{ minHeight: 'var(--ctl-40)' }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
