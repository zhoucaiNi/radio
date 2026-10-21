import type { ReactNode } from 'react'

export default function RadioWindow({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="window">
      <div className="titlebar">
        <span className="dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="window-title">{title}</span>
      </div>
      <div className="window-body">{children}</div>
    </div>
  )
}
