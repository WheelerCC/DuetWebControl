import { BaseConnector } from '@duet3d/connectors'
import { AxisLetter } from '@duet3d/objectmodel'
import Vue from 'vue'

import { FileNotFoundError } from '@/utils/errors'
import { setLocalSetting, getLocalSetting, removeLocalSetting } from '@/utils/localStorage'
import patch from '@/utils/patch'
import Path from '@/utils/path'

import { resetSettingsTimer } from './observer'
import { defineStore } from 'pinia'
import { useSettingsStore } from './settings'
import { useMachinesStore } from './machines'
import { defaultMachine } from './misc'
import { useRootStore } from '.'

/**
 * Default settings defined by third-party plugins
 */
export const defaultPluginSettingFields: Record<string, any> = {}

export enum ToolChangeMacro {
  free = 'free',
  pre = 'pre',
  post = 'post',
}

export interface MachineSettingsState {
  //#region Poll Connector

  /**
   * Number of maximum AJAX (HTTP request) retries
   */
  ajaxRetries: number

  /**
   * Time to wait before retrying AJAX requests (in ms)
   */
  retryDelay: number

  /**
   * Time between HTTP object model requests (in ms)
   */
  updateInterval: number

  /**
   * Maximum threshold of HTTP request data lengths for automatic retries on error (in bytes)
   */
  fileTransferRetryThreshold: number

  /**
   * Compute CRC checksum of files prior to uploads and pass them with upload requests to ensure data integrity
   */
  crcUploads: boolean

  /**
   * Do not pass the last modified date of files to upload requests
   */
  ignoreFileTimestamps: boolean

  //#endregion

  //#region REST Connector

  /**
   * Interval at which "PING\n" requests are sent to the object model on inactivity (in ms)
   */
  pingInterval: number

  /**
   * Extra delay to await after each object model update (in ms)
   * This may be used to throttle communications so that fewer UI updates need to be rendered per time unit
   */
  updateDelay: number

  //#endregion

  //#region UI

  /**
   * Amount to move when clicking on the babystep buttons (in mm)
   */
  babystepAmount: number

  /**
   * Check if the DWC/DSF/RRF versions are compatible
   */
  checkVersions: boolean

  /**
   * List of displayed extra temperature sensors to show
   */
  displayedExtraTemperatures: Array<number>

  /**
   * List of displayed extruder controls (extrusion mulitpliers)
   */
  displayedExtruders: Array<number>

  /**
   * List of displayed fan controls
   */
  displayedFans: Array<number>

  /**
   * Map of axes vs. move steps (in mm)
   */
  moveSteps: Record<string, Array<number>>

  /**
   * Feedrate to use for move buttons (in mm/min)
   */
  moveFeedrate: number

  /**
   * Set of macros to run during tool changes
   */
  toolChangeMacros: Array<ToolChangeMacro>

  /**
   * Extrusion amounts for custom extrude/retract (in mm)
   */
  extruderAmounts: Array<number>

  /**
   * Extrusion feedrate selections for custom extrude/retracy (in mm/s)
   */
  extruderFeedrates: Array<number>

  /**
   * Temperature presets
   */
  temperatures: {
    /**
     * Tool temperature presets
     */
    tool: {
      /**
       * Active tool temperatur presets (in C)
       */
      active: Array<number>

      /**
       * Standby tool temperatur presets (in C)
       */
      standby: Array<number>
    }

    /**
     * Bed temperature presets
     */
    bed: {
      /**
       * Active bed temperatur presets (in C)
       */
      active: Array<number>

      /**
       * Standby bed temperatur presets (in C)
       */
      standby: Array<number>
    }

    /**
     * Chamber temperature presets
     */
    chamber: Array<number>
  }

  /**
   * Group identical tools as a single item
   */
  groupTools: boolean

  /**
   * Provide only a single input field for controlling multiple beds
   */
  singleBedControl: boolean

  /**
   * Provide only a single input field for controlling multiple beds
   */
  singleChamberControl: boolean

  /**
   * Spindle RPM presets
   */
  spindleRPM: Array<number>

  /**
   * List of enabled DWC plugin identifiers (only applicable in standalone mode)
   */
  enabledPlugins: Array<string>

  /**
   * Custom settings defined by third-party plugins
   */
  plugins: Record<string, any>

  //#endregion
}

// function applyConnectorSettings(state: MachineSettingsState) {
// 		if (connector !== null) {
// 			connector.settings.maxRetries = state.ajaxRetries;
// 			connector.settings.ignoreFileTimestamps = state.ignoreFileTimestamps;
// 			connector.settings.crcUploads = state.crcUploads;
// 			connector.settings.fileTransferRetryThreshold = state.fileTransferRetryThreshold;
// 			connector.settings.updateInterval = state.updateInterval;
// 			connector.settings.pingInterval = state.pingInterval;
// 			connector.settings.updateDelay = state.updateDelay;
// 		}
// 	}

export const useMachinesSettingsStore = defineStore({
  id: 'machinesSettings',
  state: (): Record<string, MachineSettingsState> => ({
    [defaultMachine]: {
      // Poll Connector
      ajaxRetries: 2,
      retryDelay: 200,
      updateInterval: 250,
      fileTransferRetryThreshold: 358400, // 350 KiB
      crcUploads: true,
      ignoreFileTimestamps: false,

      // REST Connector
      pingInterval: 2000,
      updateDelay: 0,

      // UI
      babystepAmount: 0.05,
      checkVersions: true,
      displayedExtraTemperatures: [],
      displayedExtruders: [0, 1, 2, 3, 4, 5],
      displayedFans: [-1, 0, 1, 2],
      moveSteps: {
        X: [100, 50, 10, 1, 0.1],
        Y: [100, 50, 10, 1, 0.1],
        Z: [50, 25, 5, 0.5, 0.05],
        default: [100, 50, 10, 1, 0.1],
      },
      moveFeedrate: 6000,
      toolChangeMacros: [ToolChangeMacro.free, ToolChangeMacro.pre, ToolChangeMacro.post],
      extruderAmounts: [100, 50, 20, 10, 5, 1],
      extruderFeedrates: [50, 10, 5, 2, 1],
      temperatures: {
        tool: {
          active: [250, 235, 220, 205, 195, 160, 120, 100, 0],
          standby: [210, 180, 160, 140, 0],
        },
        bed: {
          active: [110, 100, 90, 70, 65, 60, 0],
          standby: [40, 30, 0],
        },
        chamber: [90, 80, 70, 60, 50, 40, 0],
      },
      groupTools: true,
      singleBedControl: false,
      singleChamberControl: false,
      spindleRPM: [10000, 75000, 5000, 2500, 1000, 0],

      enabledPlugins: [],
      plugins: Object.assign({}, defaultPluginSettingFields),
    },
  }),
  getters: {
    // Remove any getters that return state under the same name (eg. firstName: (state) => state.firstName), these are not necessary as you can access any state directly from the store instance
    // If you need to access other getters, they are on this instead of using the second argument. Remember that if you are using this then you will have to use a regular function instead of an arrow function. Also note that you will need to specify a return type because of TS limitations, see here for more details
    // If using rootState or rootGetters arguments, replace them by importing the other store directly, or if they still exist in Vuex then access them directly from Vuex
    ajaxRetries: (state) => state[useRootStore().selectedMachine].ajaxRetries,
    retryDelay: (state) => state[useRootStore().selectedMachine].retryDelay,
    updateInterval: (state) => state[useRootStore().selectedMachine].updateInterval,
    fileTransferRetryThreshold: (state) =>
      state[useRootStore().selectedMachine].fileTransferRetryThreshold,
    crcUploads: (state) => state[useRootStore().selectedMachine].crcUploads,
    ignoreFileTimestamps: (state) => state[useRootStore().selectedMachine].ignoreFileTimestamps,
    pingInterval: (state) => state[useRootStore().selectedMachine].pingInterval,
    updateDelay: (state) => state[useRootStore().selectedMachine].updateDelay,
    babystepAmount: (state) => state[useRootStore().selectedMachine].babystepAmount,
    checkVersions: (state) => state[useRootStore().selectedMachine].checkVersions,
    displayedExtraTemperatures: (state) =>
      state[useRootStore().selectedMachine].displayedExtraTemperatures,
    displayedExtruders: (state) => state[useRootStore().selectedMachine].displayedExtruders,
    displayedFans: (state) => state[useRootStore().selectedMachine].displayedFans,
    moveSteps: (state) => state[useRootStore().selectedMachine].moveSteps,
    moveFeedrate: (state) => state[useRootStore().selectedMachine].moveFeedrate,
    toolChangeMacros: (state) => state[useRootStore().selectedMachine].toolChangeMacros,
    extruderAmounts: (state) => state[useRootStore().selectedMachine].extruderAmounts,
    extruderFeedrates: (state) => state[useRootStore().selectedMachine].extruderFeedrates,
    temperatures: (state) => state[useRootStore().selectedMachine].temperatures,
    groupTools: (state) => state[useRootStore().selectedMachine].groupTools,
    singleBedControl: (state) => state[useRootStore().selectedMachine].singleBedControl,
    singleChamberControl: (state) => state[useRootStore().selectedMachine].singleChamberControl,
    spindleRPM: (state) => state[useRootStore().selectedMachine].spindleRPM,
    enabledPlugins: (state) => state[useRootStore().selectedMachine].enabledPlugins,
    plugins: (state) => state[useRootStore().selectedMachine].plugins,
  },
  actions: {
    getMoveSteps(axis: AxisLetter): number[] {
      let machineName = useRootStore().selectedMachine
      return this[machineName].moveSteps[axis] !== undefined
        ? this[machineName].moveSteps[axis]
        : this[machineName].moveSteps.default
    },
    numMoveSteps(): number {
      let machineName = useRootStore().selectedMachine
      return this[machineName].moveSteps.default.length
    },
    toolChangeParameter(): string {
      let machineName = useRootStore().selectedMachine
      let pParam = 0
      if (this[machineName].toolChangeMacros.includes(ToolChangeMacro.free)) {
        pParam |= 1
      }
      if (this[machineName].toolChangeMacros.includes(ToolChangeMacro.pre)) {
        pParam |= 2
      }
      if (this[machineName].toolChangeMacros.includes(ToolChangeMacro.post)) {
        pParam |= 4
      }
      return pParam === 7 ? '' : ` P${pParam}`
    },
    // Convert actions
    // Remove the first context argument from each action. Everything should be accessible from this instead
    // If using other stores either import them directly or access them on Vuex, the same as for getters
    async save(machineName?: string) {
      machineName = machineName ?? useRootStore().selectedMachine
      if (!useMachinesStore().connector) {
        return
      }
      console.log('todo')
      // applyConnectorSettings(this[machineName]);

      resetSettingsTimer(machineName)

      const settingsStore = useSettingsStore()
      if (settingsStore.settingsStorageLocal) {
        setLocalSetting(`settings/${machineName}`, this)
      } else {
        removeLocalSetting(`settings/${machineName}`)

        try {
          const content = new Blob([JSON.stringify({ main: settingsStore, machine: this })])
          const machinesStore = useMachinesStore()
          await machinesStore.upload({
            filename: Path.dwcSettingsFile,
            content,
            showProgress: false,
            showSuccess: false,
            showError: false,
          })
        } catch (e) {
          // handled before we get here
        }
      }
    },
    async load() {
      let machineName = useRootStore().selectedMachine
      let machinesStore = useMachinesStore()
      let settingsStore = useSettingsStore()

      console.log('todo')
      let connector = useMachinesStore().connector
      if (!connector) {
        return
      }

      // Load the list of installed DWC plugins
      await connector.loadPluginList()

      // Load the settings
      let mainSettings, machineSettings
      if (settingsStore.settingsStorageLocal) {
        // Load them from the local storage
        machineSettings = getLocalSetting(`settings/${machineName}`)
      } else {
        let settings

        // Try to get the saved DWC settings
        try {
          settings = await machinesStore.download(machineName, {
            filename: Path.dwcSettingsFile,
            showProgress: false,
            showSuccess: false,
            showError: false,
          })
        } catch (e) {
          if (!(e instanceof FileNotFoundError)) {
            throw e
          }
        }

        // If that fails, try to get the DWC defaults
        if (!settings) {
          try {
            settings = await machinesStore.download(machineName, {
              filename: Path.dwcFactoryDefaults,
              showProgress: false,
              showSuccess: false,
              showError: false,
            })
          } catch (e) {
            if (!(e instanceof FileNotFoundError)) {
              throw e
            }
          }
        }

        // If that fails, try to get the DWC settings
        if (!settings) {
          try {
            settings = await machinesStore.download(machineName, {
              filename: Path.legacyDwcSettingsFile,
              showProgress: false,
              showSuccess: false,
              showError: false,
            })
          } catch (e) {
            if (!(e instanceof FileNotFoundError)) {
              throw e
            }
          }
        }

        // If that fails, try to get the DWC defaults

        if (!settings) {
          try {
            settings = await machinesStore.download(machineName, {
              filename: Path.legacyDwcFactoryDefaults,
              showProgress: false,
              showSuccess: false,
              showError: false,
            })
          } catch (e) {
            if (e instanceof FileNotFoundError) {
              await settingsStore.applyDefaults(machineName)
            } else {
              throw e
            }
          }
        }

        // Load them if applicable
        if (settings) {
          mainSettings = settings.main
          machineSettings = settings.machine
        }
      }

      // Load main and machine-specific settings
      if (mainSettings) {
        await settingsStore.loadMutation(mainSettings)
      }

      if (machineSettings) {
        console.log('todo')
        // this.mutLoad(machineName, machineSettings)
      }

      // Load DWC plugins
      if (mainSettings && mainSettings.enabledPlugins) {
        if (machineSettings && machineSettings.enabledPlugins) {
          console.log('todo')
          // /*await*/ dispatch("loadDwcPlugins", [...mainSettings.enabledPlugins, ...machineSettings.enabledPlugins], { root: true });
        } else {
          console.log('todo')
          // /*await*/ dispatch("loadDwcPlugins", mainSettings.enabledPlugins, { root: true });
        }
      } else if (machineSettings && machineSettings.enabledPlugins) {
        console.log('todo')
        // /*await*/ dispatch("loadDwcPlugins", machineSettings.enabledPlugins, { root: true });
      }
    },
    // Convert mutations
    // - Mutations do not exist any more. These can be converted to actions instead, or you can just assign directly to the store within your components (eg. userStore.firstName = 'First')
    // - If converting to actions, remove the first state argument and replace any assignments with this instead
    // - A common mutation is to reset the state back to its initial state. This is built in functionality with the store's $reset method. Note that this functionality only exists for option stores.
    setExtrusionAmount({ index, value }) {
      let machineName = useRootStore().selectedMachine
      this[machineName].extruderAmounts[index] = value
    },
    setExtrusionFeedrate({ index, value }) {
      let machineName = useRootStore().selectedMachine
      this[machineName].extruderFeedrates[index] = value
    },
    setMoveStep({ axis, index, value }) {
      let machineName = useRootStore().selectedMachine
      if (this[machineName].moveSteps[axis] === undefined) {
        this[machineName].moveSteps[axis] = this[machineName].moveSteps.default.slice()
      }
      this[machineName].moveSteps[axis][index] = value
    },
    toggleExtraVisibility(sensor: number) {
      let machineName = useRootStore().selectedMachine
      if (this[machineName].displayedExtraTemperatures.indexOf(sensor) === -1) {
        this[machineName].displayedExtraTemperatures.push(sensor)
      } else {
        this[machineName].displayedExtraTemperatures = this[
          machineName
        ].displayedExtraTemperatures.filter((heater) => heater !== sensor)
      }
    },
    toggleExtruderVisibility(extruder: number) {
      let machineName = useRootStore().selectedMachine
      if (this[machineName].displayedExtruders.indexOf(extruder) === -1) {
        this[machineName].displayedExtruders.push(extruder)
      } else {
        this[machineName].displayedExtruders = this[machineName].displayedExtruders.filter(
          (item) => item !== extruder,
        )
      }
    },
    toggleFanVisibility(fan: number) {
      let machineName = useRootStore().selectedMachine
      if (this[machineName].displayedFans.indexOf(fan) === -1) {
        this[machineName].displayedFans.push(fan)
      } else {
        this[machineName].displayedFans = this[machineName].displayedFans.filter(
          (item) => item !== fan,
        )
      }
    },
    mutLoad(payload) {
      let machineName = useRootStore().selectedMachine
      if (payload.plugins !== undefined) {
        this[machineName].plugins = payload.plugins
        delete payload.plugins
      }
      if (payload.moveSteps !== undefined) {
        for (let axis in payload.moveSteps) {
          const axisMoveSteps = payload.moveSteps[axis]
          if (
            axisMoveSteps instanceof Array &&
            axisMoveSteps.length === this[machineName].moveSteps.default.length
          ) {
            Vue.set(this[machineName].moveSteps, axis, axisMoveSteps)
          }
        }
        delete payload.moveSteps
      }
      patch(this[machineName], payload, true)
      let connector = useMachinesStore().connector
      if (connector !== null) {
        connector.settings.maxRetries = this[machineName].ajaxRetries
        connector.settings.ignoreFileTimestamps = this[machineName].ignoreFileTimestamps
        connector.settings.crcUploads = this[machineName].crcUploads
        connector.settings.fileTransferRetryThreshold = this[machineName].fileTransferRetryThreshold
        connector.settings.updateInterval = this[machineName].updateInterval
        connector.settings.pingInterval = this[machineName].pingInterval
        connector.settings.updateDelay = this[machineName].updateDelay
      }
    },
    update(payload) {
      let machineName = useRootStore().selectedMachine
      if (payload.plugins !== undefined) {
        this[machineName].plugins = payload.plugins
        delete payload.plugins
      }
      if (payload.moveSteps !== undefined) {
        for (let axis in payload.moveSteps) {
          const axisMoveSteps = payload.moveSteps[axis]
          if (
            axisMoveSteps instanceof Array &&
            axisMoveSteps.length === this[machineName].moveSteps.default.length
          ) {
            Vue.set(this[machineName].moveSteps, axis, axisMoveSteps)
          }
        }
        delete payload.moveSteps
      }
      patch(this[machineName], payload, true)
      console.log('todo')
      // applyConnectorSettings(this[machineName]);
    },

    dwcPluginLoaded(plugin) {
      let machineName = useRootStore().selectedMachine
      if (this[machineName].enabledPlugins.indexOf(plugin) === -1) {
        this[machineName].enabledPlugins.push(plugin)
      }
    },
    disableDwcPlugin(plugin: string) {
      let machineName = useRootStore().selectedMachine
      this[machineName].enabledPlugins = this[machineName].enabledPlugins.filter(
        (item) => item !== plugin,
      )
    },

    registerPluginData({ plugin, key, defaultValue }, machineName: string) {
      if (!machineName) machineName = useRootStore().selectedMachine
      console.log('todo connector')
      // if (connector === null) {
      // 	if (!(plugin in defaultPluginSettingFields)) {
      // 		defaultPluginSettingFields[plugin] = {}
      // 	}
      // 	defaultPluginSettingFields[plugin][key] = defaultValue;
      // }

      // if (state.plugins[plugin] === undefined) {
      // 	Vue.set(state.plugins, plugin, { key: defaultValue });
      // }
      // if (!(key in state.plugins[plugin])) {
      // 	state.plugins[plugin][key] = defaultValue;
      // }
    },
    setPluginData({ plugin, key, value }) {
      let machineName = useRootStore().selectedMachine
      if (this[machineName].plugins[plugin] === undefined) {
        this[machineName].plugins[plugin] = { key: value }
      } else {
        this[machineName].plugins[plugin][key] = value
      }
    },
  },
})
