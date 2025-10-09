import { SubscriptionCallbackMutation } from 'pinia'
import { useRootStore } from '.'
import { useMachinesCacheStore } from './machineCache'
import { useMachinesStore } from './machines'
import { useMachinesSettingsStore } from './machineSettings'
import { defaultMachine } from './misc'
import { useSettingsStore } from './settings'

let settingsTimer: NodeJS.Timeout | null = null
const machineSettingsTimer: Record<string, NodeJS.Timeout> = {},
  machineCacheTimer: Record<string, NodeJS.Timeout> = {}

/**
 * Reset the cache save timer for a given machine
 * @param machine Machine to reset the timer for
 */
export function resetCacheTimer(machine: string) {
  if (machineCacheTimer[machine]) {
    clearTimeout(machineCacheTimer[machine])
    delete machineCacheTimer[machine]
  }
}

/**
 * Reset the global or machine-spefic settings save timer
 * @param machine Optional machine to reset the timer for
 */
export function resetSettingsTimer(machine?: string) {
  if (!machine) {
    if (settingsTimer) {
      clearTimeout(settingsTimer)
      settingsTimer = null
    }
  } else if (machineSettingsTimer[machine]) {
    clearTimeout(machineSettingsTimer[machine])
    delete machineSettingsTimer[machine]
  }
}

/**
 * Plugin functionality to auto-save the cache and settings on demand
 * @param store Vuex store instance`
 */
function callback<T>(mutation: SubscriptionCallbackMutation<T>, state: T) {
  if (!mutation.type.endsWith('/load') && !mutation.type.endsWith('/setLastHostname')) {
    const machineMatches = /^machines\/(.+)\//.exec(mutation.type)
    const machineName = machineMatches ? machineMatches[1] : useRootStore().selectedMachine
    if (machineName === defaultMachine) {
      return
    }

    if (mutation.type.startsWith('settings')) {
      // Global settings have changed
      if (settingsTimer) {
        clearTimeout(settingsTimer)
      }

      settingsTimer = setTimeout(function () {
        settingsTimer = null
        useSettingsStore().save()
      }, useSettingsStore().settingsSaveDelay)
    } else if (mutation.type.indexOf('/settings/') !== -1) {
      // Machine settings have changed
      if (machineSettingsTimer[machineName]) {
        clearTimeout(machineSettingsTimer[machineName])
      }

      machineSettingsTimer[machineName] = setTimeout(function () {
        delete machineSettingsTimer[machineName]
        if (useMachinesStore()[machineName] !== undefined) {
          useMachinesSettingsStore().save(machineName)
        }
      }, useSettingsStore().settingsSaveDelay)
    } else if (mutation.type.indexOf('/cache/') !== -1) {
      // Machine cache has changed
      if (machineCacheTimer[machineName]) {
        clearTimeout(machineCacheTimer[machineName])
      }

      machineCacheTimer[machineName] = setTimeout(function () {
        delete machineCacheTimer[machineName]
        if (useMachinesStore()[machineName] !== undefined) {
          useMachinesCacheStore().save(machineName)
        }
      }, useSettingsStore().cacheSaveDelay)
    }
  }
}

// this subscription will be kept even after the component is unmounted
// useRootStore().$subscribe((mutation, state)=>callback(mutation, state), { detached: true })
// useMachinesStore().$subscribe((mutation, state)=>callback(mutation, state), { detached: true })
// useMachinesCacheStore().$subscribe((mutation, state)=>callback(mutation, state), { detached: true })
// useMachinesModelStore().$subscribe((mutation, state)=>callback(mutation, state), { detached: true })
// useMachinesSettingsStore().$subscribe((mutation, state)=>callback(mutation, state), { detached: true })
