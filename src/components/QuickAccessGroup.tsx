import type { ReactNode } from 'react'
import type { Complex } from '../types'

type QuickAccessGroupProps = {
  icon: ReactNode
  title: string
  complexes: Complex[]
  selectedId: string
  onSelect: (id: string) => void
}

export function QuickAccessGroup({ icon, title, complexes, selectedId, onSelect }: QuickAccessGroupProps) {
  return (
    <div className="quick-access-group">
      <span>
        {icon}
        {title}
      </span>
      <div>
        {complexes.map((complex) => (
          <button key={complex.id} type="button" className={selectedId === complex.id ? 'selected' : ''} onClick={() => onSelect(complex.id)}>
            <strong>{complex.name}</strong>
            <small>{complex.district}</small>
          </button>
        ))}
      </div>
    </div>
  )
}
