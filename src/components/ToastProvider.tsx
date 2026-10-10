import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  useEffect,
} from 'react'
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'
import type { ReactNode } from 'react'

type Tone = 'success' | 'error' | 'info'
type Toast = { id: number; message: string; tone: Tone }
const ToastContext = createContext<{
  toast: (message: string, tone?: Tone) => void
} | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Array<Toast>>([])
  const nextId = useRef(0)
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
  const toast = useCallback((message: string, tone: Tone = 'success') => {
    const id = ++nextId.current
    setMessages((items) => [...items.slice(-3), { id, message, tone }])
    const timer = setTimeout(() => {
      setMessages((items) => items.filter((item) => item.id !== id))
      timers.current.delete(timer)
    }, 6000)
    timers.current.add(timer)
  }, [])

  useEffect(() => {
    const activeTimers = timers.current
    return () => {
      activeTimers.forEach(clearTimeout)
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toast-stack" aria-label="操作通知">
        {messages.map(({ id, message, tone }) => {
          const Icon =
            tone === 'success'
              ? CheckCircle2
              : tone === 'error'
                ? CircleAlert
                : Info
          return (
            <div
              key={id}
              className={`toast toast-${tone}`}
              role={tone === 'error' ? 'alert' : 'status'}
            >
              <Icon size={18} aria-hidden="true" />
              <span className="min-w-0 flex-1">{message}</span>
              <button
                type="button"
                className="icon-button"
                aria-label="关闭通知"
                onClick={() =>
                  setMessages((items) => items.filter((item) => item.id !== id))
                }
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
