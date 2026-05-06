type ControlProps = {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix: string
  tooltip?: string
  onChange: (value: number) => void
}

export function Control({ label, value, min, max, step, suffix, tooltip, onChange }: ControlProps) {
  return (
    <label className={`control ${tooltip ? 'tooltip-target' : ''}`} data-tooltip={tooltip} tabIndex={tooltip ? 0 : undefined}>
      <div>
        <span>{label}</span>
        <b>
          {value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}
          {suffix}
        </b>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}
