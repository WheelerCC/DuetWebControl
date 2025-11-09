import { reactive } from 'vue'
import { createI18n, LocaleMessages } from 'vue-i18n'

import de from './de.json'
import en from './en.json'
import es from './es.json'
import fr from './fr.json'
import hu from './hu.json'
import ja from './ja.json'
import nl from './nl.json'
import pl from './pl.json'
import pt_br from './pt_br.json'
import ru from './ru.json'
import tr from './tr.json'
import uk from './uk.json'
import zh_cn from './zh_cn.json'

/**
 * Supported i18n messages
 */
export const messages: LocaleMessages<any> & Record<string, { plugins: Record<string, object> }> =
  reactive({
    de,
    en,
    es,
    fr,
    hu,
    ja,
    nl,
    pl,
    pt_br,
    ru,
    tr,
    uk,
    zh_cn,
  })

/**
 * Get the currently configured browser locale that is also part of the i18n messages
 */
export function getBrowserLocale(): string {
  // See if there is an absolute match
  for (const locale in messages) {
    if (locale === navigator.language) {
      return locale
    }
  }

  // Check if there is a loose match
  const code = navigator.language.substring(0, 2)
  for (const locale in messages) {
    if (locale === code) {
      return locale
    }
  }

  // Fall back to English
  return 'en'
}

/**
 * Register custom i18n data namespaced via plugins.{plugin} = {data}
 * @param plugin Plugin identifier
 * @param language Language of the i18n data to add
 * @param data i18n data
 */
export function registerPluginLocalization(plugin: string, language: string, data: object) {
  if (messages[language] === undefined) {
    throw new Error('Unsupported language')
  }
  if (messages[language].plugins[plugin] !== undefined) {
    throw new Error('Plugin i18n for the given plugin already exists')
  }
  messages[language].plugins[plugin] = data
}

/**
 * Initialize i18n engine
 */
const i18n = createI18n({
  legacy: false,
  locale: getBrowserLocale(),
  fallbackLocale: 'en',
  messages,
})

export default i18n
