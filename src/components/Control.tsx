import { useId } from 'react'
import { CircleHelp } from 'lucide-react'

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
  const inputId = useId()

  return (
    <div className="control">
      <div className="control-header">
        <span className="control-label-wrap">
          <label htmlFor={inputId}>{label}</label>
          {tooltip && (
            <span
              className="control-help tooltip-target"
              data-tooltip={tooltip}
              aria-label={`${label} 설명`}
              tabIndex={0}
            >
              <CircleHelp size={13} />
            </span>
          )}
        </span>
        <b>
          {value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}
          {suffix}
        </b>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}
