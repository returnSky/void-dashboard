import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { KeyboardEvent, ReactNode } from 'react'

type SelectOption<T extends string> = { value: T; label: string }

export default function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  icon,
  id,
  name,
  variant = 'compact',
  disabled = false,
}: {
  value: T
  options: ReadonlyArray<SelectOption<T>>
  onChange: (value: T) => void
  label: string
  icon?: ReactNode
  id?: string
  name?: string
  variant?: 'compact' | 'field'
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = options.find((option) => option.value === value)

  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])

  useEffect(() => {
    const popover = popoverRef.current
    const trigger = triggerRef.current
    if (!open || !popover || !trigger) return
    popover.showPopover()
    const position = () => {
      const rect = trigger.getBoundingClientRect()
      const viewport = window.visualViewport
      const leftEdge = viewport?.offsetLeft ?? 0
      const topEdge = viewport?.offsetTop ?? 0
      const width = viewport?.width ?? window.innerWidth
      const height = viewport?.height ?? window.innerHeight
      if (rect.bottom <= topEdge || rect.top >= topEdge + height) {
        setOpen(false)
        return
      }
      const menuWidth = Math.min(Math.max(rect.width, 184), width - 16)
      popover.style.width = `${menuWidth}px`
      const below = Math.max(0, topEdge + height - rect.bottom - 8)
      const above = Math.max(0, rect.top - topEdge - 8)
      const upwards = below < popover.scrollHeight && above > below
      popover.style.maxHeight = `${Math.min(upwards ? above : below, 320)}px`
      const menuHeight = popover.getBoundingClientRect().height
      popover.style.left = `${Math.max(leftEdge + 8, Math.min(rect.left, leftEdge + width - menuWidth - 8))}px`
      popover.style.top = `${upwards ? rect.top - menuHeight - 8 : rect.bottom + 8}px`
      popover.dataset.side = upwards ? 'top' : 'bottom'
    }
    position()
    const observer = new ResizeObserver(position)
    observer.observe(trigger)
    window.addEventListener('resize', position)
    document.addEventListener('scroll', position, true)
    window.visualViewport?.addEventListener('resize', position)
    window.visualViewport?.addEventListener('scroll', position)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', position)
      document.removeEventListener('scroll', position, true)
      window.visualViewport?.removeEventListener('resize', position)
      window.visualViewport?.removeEventListener('scroll', position)
      if (popover.matches(':popover-open')) popover.hidePopover()
    }
  }, [open])

  useEffect(() => {
    if (open) {
      popoverRef.current
        ?.querySelector<HTMLElement>(`[id="${listboxId}-${activeIndex}"]`)
        ?.scrollIntoView({ block: 'nearest' })
    }
  }, [open, activeIndex, listboxId])

  function openList(index = Math.max(selectedIndex, 0)) {
    setActiveIndex(index)
    setOpen(true)
  }

  function closeList() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function choose(index: number) {
    const option = options.at(index)
    if (!option) return
    onChange(option.value)
    closeList()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (disabled || options.length === 0) return
    if (event.key === 'Escape' && open) {
      event.preventDefault()
      event.stopPropagation()
      closeList()
    } else if (event.key === 'Tab') {
      setOpen(false)
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) openList()
      else {
        const direction = event.key === 'ArrowDown' ? 1 : -1
        setActiveIndex((index) =>
          Math.max(0, Math.min(options.length - 1, index + direction)),
        )
      }
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      openList(event.key === 'Home' ? 0 : options.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (open) choose(activeIndex)
      else openList()
    }
  }

  return (
    <div
      ref={containerRef}
      className="select-control"
      data-variant={variant}
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        className="button button-secondary select-trigger"
        aria-label={`${label}${selected ? `，当前：${selected.label}` : ''}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open ? `${listboxId}-${activeIndex}` : undefined}
        disabled={disabled || options.length === 0}
        onClick={() => (open ? setOpen(false) : openList())}
      >
        {icon}
        <span className="flex-1 text-left">{selected?.label}</span>
        <ChevronDown className="select-chevron" size={14} aria-hidden="true" />
      </button>
      {name && (
        <input type="hidden" name={name} value={value} disabled={disabled} />
      )}
      {open && (
        <div ref={popoverRef} popover="manual" className="select-popover">
          <p className="select-caption" aria-hidden="true">
            {label}
          </p>
          <div id={listboxId} role="listbox" aria-label={label}>
            {options.map((option, index) => (
              <button
                key={option.value}
                id={`${listboxId}-${index}`}
                type="button"
                role="option"
                aria-selected={option.value === value}
                tabIndex={-1}
                className="select-option"
                data-value={option.value}
                data-highlighted={index === activeIndex}
                onPointerMove={() => setActiveIndex(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
              >
                <span className="flex-1">{option.label}</span>
                <span className="flex h-4 w-4 items-center justify-center">
                  {option.value === value && (
                    <Check size={15} aria-hidden="true" />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
