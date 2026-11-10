import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type Toast = { text: string; error?: boolean } | null
const Ctx = createContext<(text: string, error?: boolean) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast>(null)
  const timer = useRef<number>()
  const show = useCallback((text: string, error?: boolean) => {
    setToast({ text, error })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])
  return (
    <Ctx.Provider value={show}>
      {children}
      {toast && <div className={'toast' + (toast.error ? ' error' : '')}>{toast.text}</div>}
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)

/** Shows an API error message as a red toast. */
export function useErrorToast() {
  const show = useToast()
  return useCallback((e: unknown) => show(e instanceof Error ? e.message : '문제가 생겼어요', true), [show])
}
