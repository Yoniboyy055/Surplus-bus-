import { useEffect, useId, useRef } from "react"
import type { CSSProperties, ReactNode } from "react"
import { ykTokens } from "@yksystems/yk-design-tokens"

export type YKStatus = "open" | "claimed" | "in-progress" | "blocked" | "awaiting-review" | "approved" | "rejected" | "error" | "closed"
export type YKTone = "info" | "success" | "warning" | "danger" | "approval" | "blocked" | "muted"

const statusTone: Record<YKStatus, YKTone> = {
  open: "info",
  claimed: "approval",
  "in-progress": "approval",
  blocked: "blocked",
  "awaiting-review": "warning",
  approved: "success",
  rejected: "danger",
  error: "danger",
  closed: "muted",
}

const statusLabel: Record<YKStatus, string> = {
  open: "Open",
  claimed: "Claimed",
  "in-progress": "In progress",
  blocked: "Blocked",
  "awaiting-review": "Awaiting review",
  approved: "Approved",
  rejected: "Rejected",
  error: "Error",
  closed: "Closed",
}

export const getStatusTone = (status: string): YKTone | undefined => statusTone[status as YKStatus]

export function YKStatusBadge({ status, label = statusLabel[status] }: { status: YKStatus; label?: string }) {
  return <span className={`yk-status-badge yk-tone-${getStatusTone(status) ?? "muted"}`}>{label}</span>
}

export function YKAlert({ tone = "info", title, children }: { tone?: YKTone; title: string; children?: ReactNode }) {
  return (
    <section className={`yk-alert yk-tone-${tone}`} role={tone === "danger" ? "alert" : "status"} aria-label={title}>
      <strong>{title}</strong>
      {children ? <div>{children}</div> : null}
    </section>
  )
}

export function YKLoadingState({ label = "Loading" }: { label?: string }) {
  return <div className="yk-state" role="status" aria-live="polite"><span className="yk-spinner" />{label}</div>
}

export function YKEmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return <section className="yk-state"><strong>{title}</strong>{action}</section>
}

export function YKErrorState({ title, detail }: { title: string; detail?: string }) {
  return <YKAlert tone="danger" title={title}>{detail}</YKAlert>
}

export function YKPermissionDeniedState({ title = "Permission denied", detail }: { title?: string; detail?: string }) {
  return <YKAlert tone="blocked" title={title}>{detail}</YKAlert>
}

export function YKMetricCard({ label, value, trend, tone = "info" }: { label: string; value: string | number; trend?: string; tone?: YKTone }) {
  return (
    <article className={`yk-metric yk-tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {trend ? <small>{trend}</small> : null}
    </article>
  )
}

export function YKApprovalDialog({
  open,
  title,
  description,
  confirmLabel = "Approve",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      if (typeof dialog.showModal === "function" && !dialog.open) {
        dialog.showModal()
      } else if (!dialog.open) {
        dialog.setAttribute("open", "")
      }
      cancelButtonRef.current?.focus()
      return
    }

    if (dialog.open) dialog.close()
  }, [open])

  if (!open) return null
  return (
    <dialog
      ref={dialogRef}
      className="yk-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
    >
      <form method="dialog" className="yk-dialog-panel">
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        <div className="yk-dialog-actions">
          <button ref={cancelButtonRef} type="button" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className="yk-danger-button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </form>
    </dialog>
  )
}

export function YKExecutionLock({
  locked,
  reason,
  actionLabel,
  onAction,
}: {
  locked: boolean
  reason: string
  actionLabel: string
  onAction?: () => void
}) {
  return (
    <section className={`yk-execution-lock ${locked ? "is-locked" : "is-open"}`}>
      <YKStatusBadge status={locked ? "blocked" : "approved"} label={locked ? "Execution locked" : "Execution allowed"} />
      <p>{reason}</p>
      <button type="button" disabled={locked || !onAction} aria-disabled={locked || !onAction} onClick={onAction}>{actionLabel}</button>
    </section>
  )
}

export function YKCommandCenterShell({ title, sidebar, children }: { title: string; sidebar?: ReactNode; children: ReactNode }) {
  return (
    <div className="yk-shell" style={{ "--yk-shell-font": ykTokens.typography.interface.fontFamily } as CSSProperties}>
      <header><h1>{title}</h1></header>
      <div className="yk-shell-body">
        {sidebar ? <aside>{sidebar}</aside> : null}
        <main>{children}</main>
      </div>
    </div>
  )
}
