'use client'

import { useTheme } from '../../_components/theme'
import { Row } from './row'

const SEG_BTN = 'rounded-lg px-5 py-2 text-sm font-semibold transition-colors'
const SEG_ACTIVE = 'bg-white text-[#0A0A0A] shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:bg-[#1F2429] dark:text-[#F5F7FA]'
const SEG_IDLE = 'text-[#8A8A8A] dark:text-[#7A8189]'

/** No "System" option — matches current real capability (useTheme is manual light/dark only). */
export function AppearanceSettings() {
  const themeCtx = useTheme()
  const theme = themeCtx?.theme ?? 'light'

  return (
    <Row first last>
      <div>
        <span className="block text-sm font-semibold text-[#0A0A0A] dark:text-[#F5F7FA]">Theme</span>
        <p className="text-sm text-[#8A8A8A] dark:text-[#7A8189]">
          Choose how the platform looks for you.
        </p>
      </div>

      <div className="inline-flex rounded-xl border border-[#E5EEF5] bg-[#F5F7FA] p-[3px] dark:border-[#1F2429] dark:bg-[#050607]">
        <button
          type="button"
          onClick={() => themeCtx?.setTheme('light')}
          className={`${SEG_BTN} ${theme === 'light' ? SEG_ACTIVE : SEG_IDLE}`}
        >
          Light
        </button>
        <button
          type="button"
          onClick={() => themeCtx?.setTheme('dark')}
          className={`${SEG_BTN} ${theme === 'dark' ? SEG_ACTIVE : SEG_IDLE}`}
        >
          Dark
        </button>
      </div>
    </Row>
  )
}
