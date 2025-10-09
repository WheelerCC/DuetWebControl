import { useI18n } from 'vue-i18n'

/**
 * Get the message from a thrown error
 * @param e Error item
 * @returns Error message
 */
export function getErrorMessage(e: any) {
  return e ? (e.reason ?? e.message ?? e.toString()) : useI18n().t('generic.noValue')
}

// Heightmap errors

export class HeightmapError extends Error {}

export class InvalidHeightmapError extends HeightmapError {
  constructor() {
    super(useI18n().t('error.invalidHeightmap'))
  }
}

// Other errors have been moved to the connectors
export * from '@duet3d/connectors/dist/errors'
