import i18n, { messages } from '../i18n'

/**
 * Attempt to translate a string from DSF/RRF returning either the translated response or the original message
 * @param message Message to translate
 * @returns Translated message
 */
export function translateResponse(message: string): string {
  const { t, locale } = i18n.global
  // Check for message in format #<i18n.str>#arg1(#arg2...)# first
  const matches = /^#(.*)#$/.exec(message.trim())
  if (matches !== null) {
    const args = matches[1].split('#')
    return t(args[0], args.slice(1))
  }

  // Allow built-in RRF strings to be translated using RegExps.
  // To achieve this create a new "responses" key in "en" with regular expressions matching the non-English target.
  // These regular expressions must match dynamic parameters (e.g. /Heater (\d+) faulted/) so they can be passed back as args to $t().
  // When done, create the same key in "responses" for your target language (e.g. German -> "Heizer {0} gestört")
  if (locale.value !== 'en') {
    if (
      messages.en.responses instanceof Object &&
      messages[locale.value].responses instanceof Object
    ) {
      for (const key in messages.en.responses) {
        const regex = new RegExp((messages.en.responses as Record<string, string>)[key])
        const matches = regex.exec(message)
        if (matches !== null) {
          return t('responses.' + key, matches.slice(1))
        }
      }
    }
  }
  return message
}
