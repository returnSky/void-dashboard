import { useEffect, useId, useRef, useState } from 'react'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import type { KeyboardEvent } from 'react'

type ThemeMode = 'light' | 'dark' | 'auto'
const labels: Record<ThemeMode, string> = {
  light: '浅色',
  dark: '深色',
  auto: '跟随系统',
}
const themeModes: Array<ThemeMode> = ['light', 'dark', 'auto']
const icons = { light: Sun, dark: Moon, auto: Monitor }
let fallbackMode: ThemeMode | null = null

function parseMode(value: unknown): ThemeMode {
  return value === 'light' || value === 'dark' ? value : 'auto'
}

function readMode(): ThemeMode {
  if (fallbackMode !== null) return fallbackMode
  try {
    return parseMode(window.localStorage.getItem('theme'))
  } catch {
    return parseMode(document.documentElement.getAttribute('data-theme'))
  }
}

function applyMode(mode: ThemeMode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolved = mode === 'auto' ? (prefersDark ? 'dark' : 'light') : mode
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  if (mode === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', mode)
  root.style.colorScheme = resolved
}

export default function ThemeToggle({
  align = 'end',
}: {
  align?: 'start' | 'end'
}) {
  const [mode, setMode] = useState<ThemeMode>('auto')
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const menuId = useId()

  useEffect(() => {
    const initial = readMode()
    setMode(initial)
    applyMode(initial)
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'theme' || event.key === null) {
        fallbackMode = null
        const next = parseMode(event.newValue)
        setMode(next)
        applyMode(next)
      }
    }
    const onThemeChange = (event: Event) => {
      const detail: unknown = (event as CustomEvent<unknown>).detail
      const next =
        detail === 'light' || detail === 'dark' || detail === 'auto'
          ? detail
          : readMode()
      setMode(next)
      applyMode(next)
    }
    window.addEventListener('atlas-theme-change', onThemeChange)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('atlas-theme-change', onThemeChange)
    }
  }, [])

  useEffect(() => {
    if (mode !== 'auto') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyMode('auto')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [mode])

  useEffect(() => {
    if (!open) return
    optionRefs.current[focusedIndex]?.focus()
  }, [open, focusedIndex])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function openMenu(index = themeModes.indexOf(mode)) {
    setFocusedIndex(index)
    setOpen(true)
  }

  function closeMenu() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function chooseMode(next: ThemeMode) {
    setMode(next)
    applyMode(next)
    try {
      window.localStorage.setItem('theme', next)
      fallbackMode = null
    } catch {
      fallbackMode = next
    }
    window.dispatchEvent(
      new CustomEvent('atlas-theme-change', { detail: next }),
    )
    closeMenu()
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const lastIndex = themeModes.length - 1
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      closeMenu()
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setFocusedIndex(
        (index) => (index + direction + themeModes.length) % themeModes.length,
      )
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setFocusedIndex(event.key === 'Home' ? 0 : lastIndex)
    }
  }

  const Icon = icons[mode]
  return (
    <div
      ref={containerRef}
      className="relative inline-flex shrink-0"
      data-theme-toggle=""
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="icon-button"
        data-theme-trigger=""
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            openMenu(event.key === 'ArrowDown' ? 0 : themeModes.length - 1)
          } else if (event.key === 'Escape' && open) {
            event.preventDefault()
            closeMenu()
          }
        }}
        aria-label={`选择主题，当前：${labels[mode]}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={`主题：${labels[mode]}`}
      >
        <Icon size={18} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="主题模式"
          className={`panel absolute top-full z-50 mt-2 w-44 p-1.5 shadow-lg ${align === 'start' ? 'left-0' : 'right-0'}`}
          onKeyDown={handleMenuKeyDown}
        >
          {themeModes.map((option, index) => {
            const OptionIcon = icons[option]
            const selected = mode === option
            return (
              <button
                key={option}
                ref={(node) => {
                  optionRefs.current[index] = node
                }}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                data-theme-mode={option}
                tabIndex={-1}
                className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm hover:bg-[var(--chip-bg)] ${selected ? 'bg-[var(--accent-soft)] text-[var(--accent-text)]' : 'text-[var(--sea-ink)]'}`}
                onFocus={() => setFocusedIndex(index)}
                onClick={() => chooseMode(option)}
              >
                <OptionIcon size={16} aria-hidden="true" />
                <span className="flex-1">{labels[option]}</span>
                {selected && <Check size={15} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
