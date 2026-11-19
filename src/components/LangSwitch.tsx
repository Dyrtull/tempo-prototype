/**
 * components/LangSwitch.tsx
 * ES/EN toggle used in both headers. The language lives in LangProvider (hooks.tsx).
 */
import { useI18n } from '../hooks'

export default function LangSwitch() {
  const { lang, setLang } = useI18n()
  return (
    <div className="flex overflow-hidden rounded-lg border border-line text-xs">
      {(['es', 'en'] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)}
          className={`px-2.5 py-1 font-semibold ${lang === l ? 'bg-amber text-ink' : 'text-mute hover:text-cream'}`}>{l.toUpperCase()}</button>
      ))}
    </div>
  )
}
