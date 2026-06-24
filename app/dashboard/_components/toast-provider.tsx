'use client'

import { createContext, useContext, useReducer, useCallback, useRef } from 'react'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

type Action =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: number }

function reducer(state: Toast[], action: Action): Toast[] {
  if (action.type === 'ADD') return [...state, action.toast]
  if (action.type === 'REMOVE') return state.filter(t => t.id !== action.id)
  return state
}

const ToastContext = createContext<{ addToast: (message: string, type?: 'success' | 'error') => void } | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, [])
  const nextId = useRef(0)

  const addToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++nextId.current
    dispatch({ type: 'ADD', toast: { id, message, type } })
    setTimeout(() => dispatch({ type: 'REMOVE', id }), 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-xl border ${
              t.type === 'success'
                ? 'bg-zinc-900 text-teal-400 border-teal-500/30'
                : 'bg-zinc-900 text-red-400 border-red-500/30'
            }`}
          >
            {t.type === 'success' ? (
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
