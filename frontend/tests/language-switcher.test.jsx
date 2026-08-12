import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test } from 'vitest'
import { LanguageSwitcher } from '../src/components/navigation/LanguageSwitcher.jsx'
import { LanguageProvider } from '../src/context/LanguageProvider.jsx'
import { useLanguage } from '../src/context/language-context.js'

function TranslationProbe() {
  const { t } = useLanguage()
  return <p>{t('common.signIn')}</p>
}

function renderLanguage() {
  return render(
    <LanguageProvider>
      <LanguageSwitcher />
      <TranslationProbe />
    </LanguageProvider>,
  )
}

describe('English and Mongolian language switching', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.lang = 'en'
  })

  test('changes translated text, document language and persisted preference', () => {
    renderLanguage()

    fireEvent.click(screen.getByRole('button', { name: 'Mongolian' }))

    expect(screen.getByText('Нэвтрэх')).toBeInTheDocument()
    expect(document.documentElement).toHaveAttribute('lang', 'mn')
    expect(window.localStorage.getItem('vyra:language')).toBe('mn')
    expect(screen.getByRole('button', { name: 'Англи' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('restores the saved language after a remount', () => {
    window.localStorage.setItem('vyra:language', 'mn')
    renderLanguage()

    expect(screen.getByText('Нэвтрэх')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Англи' })).toHaveAttribute('aria-pressed', 'true')
  })
})
