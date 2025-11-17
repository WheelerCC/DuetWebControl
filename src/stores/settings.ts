import { getBrowserLocale } from '@/i18n'

import {
  getLocalSetting,
  localStorageSupported,
  removeLocalSetting,
  setLocalSetting,
} from '@/utils/localStorage'
import patch from '@/utils/patch'

export enum DashboardMode {
  default = 'Default',
  fff = 'FFF',
  cnc = 'CNC',
}

export enum UnitOfMeasure {
  metric = 'mm',
  imperial = 'inch',
}

export enum WebcamFlip {
  None = 'none',
  X = 'x',
  Y = 'y',
  Both = 'both',
}

export interface SettingsState {
  /**
   * Configured language
   */
  language: string

  /**
   * Last hostname (only used in dev mode)
   */
  lastHostname: string

  /**
   * Defines if the dark theme is enabled
   */
  darkTheme: boolean

  /**
   * Use binary units (KiB) instead of SI units (KB)
   */
  useBinaryPrefix: boolean

  /**
   * Disable code auto completion
   */
  disableAutoComplete: boolean

  /**
   * Configured dashboard mode
   */
  dashboardMode: keyof typeof DashboardMode

  /**
   * Show navigation bar at the bottom on small screen sizes
   */
  bottomNavigation: boolean

  /**
   * Use numeric inputs instead of sliders
   */
  numericInputs: boolean

  /**
   * Use compact icon menu instead of the full-width sidebar menu
   */
  iconMenu: boolean

  /**
   * Units to display
   */
  displayUnits: keyof typeof UnitOfMeasure

  /**
   * Precision of the values to display
   */
  decimalPlaces: number

  /**
   * Store settings in local storage
   */
  settingsStorageLocal: boolean

  /**
   * Time to wait after a settings change before the settings are saved (in ms)
   */
  settingsSaveDelay: number

  /**
   * Store cache in local storage
   */
  cacheStorageLocal: boolean

  /**
   * Time to wait after a cache change before it is saved
   */
  cacheSaveDelay: number

  /**
   * Notification settings
   */
  notifications: {
    /**
     * Make error messages persistent
     */
    errorsPersistent: boolean

    /**
     * Default timeout for messages
     */
    timeout: number
  }

  /**
   * UI Behaviour settings
   */
  behaviour: {
    /**
     * Stop auto switch to Status Panel On Job Start
     */
    jobStart: boolean

    /**
     * Prompt user during filament change
     */
    promptDuringFilamentChange: boolean
  }

  /**
   * Webcam settings
   */
  webcam: {
    /**
     * Whether webcam support is enabled
     */
    enabled: boolean

    /**
     * URL to use for the webcam image
     */
    url: string

    /**
     * Interval at which new webcam frames are requested
     */
    updateInterval: number

    /**
     * URL to open when the webcam image is clicked
     */
    liveUrl: string

    /**
     * Do not append extra HTTP qualifier when requesting images
     */
    useFix: boolean

    /**
     * Embed webcam source in an iframe and do not use img tags
     */
    embedded: boolean

    /**
     * Rotation of the webcam image (in deg)
     */
    rotation: number

    /**
     * Defines an optional flip of the webcam image
     */
    flip: WebcamFlip
  }

  /**
   * List of enabled plugins
   */
  enabledPlugins: Array<string>

  /**
   * Custom plugin setting fields
   */
  plugins: Record<string, any>
}

import { defineStore, storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useRootStore } from '.'
import { useMachinesCacheStore } from './machineCache'
import { useMachinesModelStore } from './machineModel'
import { useMachinesStore } from './machines'
import { useMachinesSettingsStore } from './machineSettings'
import { resetSettingsTimer } from './observer'
import { pathObj } from '@/utils/path'
import { MachineMode } from '@duet3d/objectmodel'

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    language: getBrowserLocale(),
    lastHostname: location.host,

    darkTheme:
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) || false,
    useBinaryPrefix: true,
    disableAutoComplete: false,
    dashboardMode: 'default',
    bottomNavigation: true,
    numericInputs: false,
    iconMenu: false,
    displayUnits: 'metric',
    decimalPlaces: 3,

    settingsStorageLocal: false,
    settingsSaveDelay: 500,
    cacheStorageLocal: localStorageSupported,
    cacheSaveDelay: 1000,

    notifications: {
      errorsPersistent: true,
      timeout: 5000,
    },

    behaviour: {
      jobStart: false,
      promptDuringFilamentChange: true,
    },

    webcam: {
      enabled: false,
      url: '',
      updateInterval: 5000,
      liveUrl: '',
      useFix: false,
      embedded: false,
      rotation: 0,
      flip: WebcamFlip.None,
    },

    enabledPlugins: ['HeightMap', 'ObjectModelBrowser'],
    plugins: {},
  }),
  getters: {
    // Remove any getters that return state under the same name (eg. firstName: (state) => state.firstName), these are not necessary as you can access any state directly from the store instance
    // If you need to access other getters, they are on this instead of using the second argument. Remember that if you are using this then you will have to use a regular function instead of an arrow function. Also note that you will need to specify a return type because of TS limitations, see here for more details
    // If using rootState or rootGetters arguments, replace them by importing the other store directly, or if they still exist in Vuex then access them directly from Vuex
    isFFForUnset: (_state) => {
      let { state } = storeToRefs(useMachinesModelStore())
      if (_state.dashboardMode === 'default') {
        return !state.value.machineMode || state.value.machineMode === MachineMode.fff
      }
      return _state.dashboardMode === 'fff'
    }
  


  },
  actions: {
    // Convert actions
    // Remove the first context argument from each action. Everything should be accessible from this instead
    // If using other stores either import them directly or access them on Vuex, the same as for getters
    async applyDefaults(machineName: string) {
      let rootStore = useRootStore()
      let settingsStore = useSettingsStore()
      let machinesModelStore = useMachinesModelStore()
      let machinesCacheStore = useMachinesCacheStore()
      let machineSettingsStore = useMachinesSettingsStore()

      // Load settings that are enabled by default
      if (this.enabledPlugins) {
        // TODO multi machine confusion
        console.log('todo')
        rootStore.loadDwcPlugins(rootStore.selectedMachine, this.enabledPlugins)
      }

      // Apply different webcam defaults in SBC mode
      if (machinesModelStore[machineName].sbc !== null) {
        this.applySbcWebcamDefaults()
      }
    },
    async load() {
      // First attempt to load the last hostname from the local storage if running in dev mode
      if (process.env.NODE_ENV !== 'production') {
        const lastHostname = getLocalSetting('lastHostname')
        if (lastHostname) {
          this.lastHostname = lastHostname
        }
      }

      const mainSettings = getLocalSetting('settings')
      if (mainSettings) {
        // Load the global settings from the local storage
        console.log('todo broken load')
        // this.load(mainSettings)
        // commit("load", mainSettings);

        if (mainSettings.enabledPlugins) {
          for (let i = 0; i < mainSettings.enabledPlugins.length; i++) {
            try {
              await useRootStore().loadDwcPlugin({
                id: mainSettings.enabledPlugins[i],
                saveSettings: false,
              })
            } catch (e) {
              console.warn(`Failed to load built-in plugin ${mainSettings.enabledPlugins[i]}`, e)
            }
          }
        }
      } else if (useRootStore().isConnected) {
        // Otherwise try to load the settings from the selected board
        useMachinesSettingsStore().load()
      }
    },
    loadMutation(payload: any) {
      const updateSettingsTime =
        payload.ignoreFileTimestamps === undefined && payload.settingsSaveDelay === 2000
      const updateCacheTime =
        payload.ignoreFileTimestamps === undefined && payload.settingsSaveDelay === 4000
      if (payload.language && useI18n().locale !== payload.language) {
        useI18n().locale = payload.language
      }
      if (payload.plugins) {
        this.plugins = payload.plugins
        delete payload.plugins
      }
      if (payload.webcam && payload.webcam.enabled === undefined) {
        payload.webcam.enabled = !!payload.webcam.url
      }
      patch(this, payload, true)
      if (updateSettingsTime) {
        this.settingsSaveDelay = 500
      }
      if (updateCacheTime) {
        this.cacheSaveDelay = 1000
      }
    },
    async save(machineName?: string) {
      machineName = machineName ?? useRootStore().selectedMachine
      resetSettingsTimer()

      let rootStore = useRootStore()
      let settingsStore = useSettingsStore()
      let machinesModelStore = useMachinesModelStore()
      let machinesCacheStore = useMachinesCacheStore()
      let machineSettingsStore = useMachinesSettingsStore()

      // See if we need to save everything in the local storage
      if (this.settingsStorageLocal) {
        setLocalSetting('settings', this)
      } else {
        // If not, remove the local settings again
        removeLocalSetting('settings')

        // And try to save everything on the selected board
        if (rootStore.isConnected) {
          await machineSettingsStore.save()
        }
      }
    },
    async reset() {
      let machineName = useRootStore().selectedMachine
      // Delete settings
      removeLocalSetting('settings')
      removeLocalSetting(`machines/${machineName}`)
      try {
        await useMachinesStore().delete(pathObj.dwcSettingsFile)
      } catch (e) {
        console.warn(e)
      }

      // Delete cache
      removeLocalSetting(`cache/${machineName}`)
      try {
        await useMachinesStore().delete(pathObj.dwcCacheFile)
      } catch (e) {
        console.warn(e)
      }

      // Check if there is a factory defaults file
      try {
        const defaults = await useMachinesStore().download({
          filename: pathObj.dwcFactoryDefaults,
          showProgress: false,
          showSuccess: false,
          showError: false,
        })[0]
        await useMachinesStore().upload({
          filename: pathObj.dwcSettingsFile,
          content: new Blob([defaults]),
          showProgress: false,
          showSuccess: false,
        })
      } catch (e) {
        // handled before we get here
      }

      // Reload the web interface to finish
      location.reload(true)
    },
    // Convert mutations
    // - Mutations do not exist any more. These can be converted to actions instead, or you can just assign directly to the store within your components (eg. userStore.firstName = 'First')
    // - If converting to actions, remove the first state argument and replace any assignments with this instead
    // - A common mutation is to reset the state back to its initial state. This is built in functionality with the store's $reset method. Note that this functionality only exists for option stores.
    applySbcWebcamDefaults() {
      this.webcam.url = 'http://[HOSTNAME]:8081/0/stream'
      this.webcam.updateInterval = 0
    },
    setLastHostname(hostname: string) {
      this.lastHostname = hostname
      setLocalSetting('lastHostname', hostname)
    },
    update(payload: any) {
      if (payload.language && useI18n().locale !== payload.language) {
        useI18n().locale = payload.language
      }
      if (payload.plugins) {
        this.plugins = payload.plugins
        delete payload.plugins
      }
      patch(payload, true)
    },

    dwcPluginLoaded(plugin: string) {
      if (!this.enabledPlugins.includes(plugin)) {
        this.enabledPlugins.push(plugin)
      }
    },
    disableDwcPlugin(plugin: string) {
      if (this.enabledPlugins.includes(plugin)) {
        this.enabledPlugins = this.enabledPlugins.filter((item) => item !== plugin)
      }
    },

    registerPluginData({
      plugin,
      key,
      defaultValue,
    }: {
      plugin: string
      key: string
      defaultValue: any
    }) {
      if (this.plugins[plugin] === undefined) {
        this.plugins[plugin] = { key: defaultValue }
      }
      if (!(key in this.plugins[plugin])) {
        this.plugins[plugin][key] = defaultValue
      }
    },
    setPluginData({ plugin, key, value }: { plugin: string; key: string; value: any }) {
      if (this.plugins[plugin] === undefined) {
        this.plugins[plugin] = { key: value }
      } else {
        this.plugins[plugin][key] = value
      }
    },
  },
})
