import { useI18n } from 'vue-i18n'

import { useRootStore } from '@/stores'
import { useMachinesStore } from '@/stores/machines'
import { defaultMachine } from '@/stores/misc'
import { makeNotification } from './notifications'

/**
 * Possible logging types
 */
export enum LogType {
  success = 'success',
  info = 'info',
  primary = 'primary',
  warning = 'warning',
  error = 'error',
}

/**
 * Log an arbitrary machine-related message, i.e. display a notification and log to the console
 * @param type Message type
 * @param title Title of the message
 * @param message Actual message
 * @param hostname Hostname to log this message to
 */
export function log(
  type: LogType,
  title: string,
  message: string | null = null,
  hostname?: string,
) {
  makeNotification(type, title, message)
  logToConsole(type, title, message, hostname)
}

/**
 * Log an arbitrary machine-related message to the console only
 * @param type Message type
 * @param title Title of the message
 * @param message Actual message
 * @param hostname Hostname to log this message to
 */
export function logToConsole(
  type: LogType,
  title: string,
  message: string | null = null,
  hostname?: string,
) {
  useMachinesStore().log({ date: new Date(), type, title, message }, hostname)
}

/**
 * Log a code reply from a given machine
 * @param code G/M/T-code
 * @param reply Code reply
 * @param hostname Hostname of the machine that produced the reply
 */
export function logCode(code: string | null, reply: string, hostname?: string) {
  if (!code && !reply) {
    // Make sure there is something to log...
    return
  }

  // Determine type
  let type = LogType.info,
    toLog = reply
  if (reply.startsWith('Error: ')) {
    type = LogType.error
  } else if (reply.startsWith('Warning: ')) {
    type = LogType.warning
  } else if (reply === '') {
    type = LogType.success
  }

  let rootStore = useRootStore()
  // Log it
  const responseLines = toLog.split('\n')
  if (hostname === rootStore.selectedMachine && !rootStore.hideCodeReplyNotifications) {
    let title = code || '',
      message = responseLines.join('<br>')
    if (responseLines.length > 3 || toLog.length > 128) {
      title = !code ? useI18n().t('notification.responseTooLong') : code
      message = !code ? '' : useI18n().t('notification.responseTooLong')
    } else if (!code) {
      title = responseLines[0]
      message = responseLines.slice(1).join('<br>')
    }

    makeNotification(type, title, message, null, '/Console')
  }
  useMachinesStore().log(
    {
      date: new Date(),
      type,
      title: code ?? '',
      message: reply,
    },
    hostname,
  )
}

/**
 * Log a global message that is logged by all connected machines
 * @param type Message type
 * @param title Message title
 * @param message Message content
 */
export function logGlobal(type: LogType, title: string, message: string | null = null) {
  if (useRootStore().selectedMachine !== defaultMachine) {
    log(type, title, message)
  } else {
    makeNotification(type, title, message)
  }
  useMachinesStore().log({ date: new Date(), type, title, message })
}
