import type { ReactNode } from 'react'
import { Modal } from './Modal.tsx'
import { Button } from './ui.tsx'

export function ConfirmDialog({ open, title, children, confirmLabel, tone = 'danger', onConfirm, onClose, extra }: {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  tone?: 'danger' | 'primary'
  onConfirm: () => void
  onClose: () => void
  extra?: ReactNode
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          {extra}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant={tone}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm text-slate-300">{children}</div>
    </Modal>
  )
}
