type FactRowProps = {
  label: string
  value: string
  tooltip: string
}

export function FactRow({ label, value, tooltip }: FactRowProps) {
  return (
    <div className="fact-row tooltip-target" data-tooltip={tooltip} tabIndex={0}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}
