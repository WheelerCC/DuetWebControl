import { BaseConnector, CancellationToken, connect, DefaultSettings } from '@duet3d/connectors'

import Plugins, { checkVersion, loadDwcResources } from '@/plugins'
import { getErrorMessage, InvalidPasswordError } from '@/utils/errors'
import Events from '@/utils/events'
import { logGlobal, logToConsole, LogType } from '@/utils/logging'
import { closeNotifications, makeNotification } from '@/utils/notifications'
import Path from '@/utils/path'
import { useI18n } from 'vue-i18n'

import packageInfo from '../../package.json'

export interface InternalRootState {
  /**
   * True if a connection is being established
   */
  isConnecting: boolean

  /**
   * Percentage for reporting the connection progress (0..100)
   */
  connectingProgress: number

  /**
   * Indicates if a connection is being terminated
   */
  isDisconnecting: boolean

  /**
   * True if the manual connect dialog is shown
   */
  connectDialogShown: boolean

  /**
   * True when a connection has been refused and a password must be entered
   */
  passwordRequired: boolean

  /**
   * Hostname of the selected machine (primarily for multi-machine support)
   */
  selectedMachine: string

  /**
   * Indicates if the configured DWC plugins are being loaded
   */
  loadingDwcPlugins: boolean

  /**
   * List of loaded DWC plugins
   */
  loadedDwcPlugins: Array<string>

  /**
   * Whether code replies may not be shown as notifications (usually true when the Console page is open)
   */
  hideCodeReplyNotifications: boolean

  /**
   * Whether an OSK plugin is active
   */
  oskEnabled: boolean

  /**
   * Bottom margin to add for the on-screen keyboard
   */
  bottomMargin: number
}

/**
 * Available plugin data types
 */
export enum PluginDataType {
  /**
   * Global setting, does not change when the selected machine changes
   */
  globalSetting = 'globalSetting',

  /**
   * Machine-dependent cache item
   */
  machineCache = 'machineCache',

  /**
   * Machine-dependent setting
   */
  machineSetting = 'machineSetting',
}

import eventbus from '@/utils/eventbus'
import ObjectModel from '@duet3d/objectmodel'
import { defineStore } from 'pinia'
import { useMachinesCacheStore } from './machineCache'
import { useMachinesModelStore } from './machineModel'
import { useMachinesSettingsStore } from './machineSettings'
import { useMachinesStore } from './machines'
import { defaultMachine, defaultPassword, defaultUsername } from './misc'
import { useSettingsStore } from './settings'
export const useRootStore = defineStore('root', {
  state: (): InternalRootState => ({
    isConnecting: false,
    connectingProgress: -1,
    isDisconnecting: false,
    connectDialogShown: process.env.NODE_ENV === 'development',
    passwordRequired: false,
    selectedMachine: defaultMachine,
    loadingDwcPlugins: false,
    loadedDwcPlugins: [],
    hideCodeReplyNotifications: false,
    oskEnabled: false,
    bottomMargin: 0,
  }),
  getters: {
    // Remove any getters that return state under the same name (eg. firstName: (state) => state.firstName), these are not necessary as you can access any state directly from the store instance
    // If you need to access other getters, they are on this instead of using the second argument. Remember that if you are using this then you will have to use a regular function instead of an arrow function. Also note that you will need to specify a return type because of TS limitations, see here for more details
    // If using rootState or rootGetters arguments, replace them by importing the other store directly, or if they still exist in Vuex then access them directly from Vuex
    connectedMachines() {
      // let rootStore = useRootStore()
      // let settingsStore = useSettingsStore();
      let machinesStore = useMachinesStore()
      // let machinesModelStore = useMachinesModelStore();
      // let machinesCacheStore = useMachinesCacheStore();
      // let machineSettingsStore = useMachinesSettingsStore();

      return Object.keys(machinesStore).filter((machine) => machine !== defaultMachine)
    },
    // isConnected: state => state.selectedMachine !== defaultMachine && !(state as RootState).machines[state.selectedMachine].isReconnecting,
    isConnected(): boolean {
      const machineStore = useMachinesStore()
      return (
        this.selectedMachine !== defaultMachine &&
        !machineStore[this.selectedMachine].isReconnecting
      )
    },
    uiFrozen(): boolean {
      return this.isConnecting || this.isDisconnecting || !this.isConnected
    },
  },
  actions: {
    // Convert actions
    // Remove the first context argument from each action. Everything should be accessible from this instead
    // If using other stores either import them directly or access them on Vuex, the same as for getters
    /**
     * Connect to the given hostname using the specified credentials
     * @param context Action context
     * @param payload Action payload
     * @param payload.hostname Hostname to connect to (defaults to the browser's location host)
     * @param payload.username Optional username for login
     * @param payload.password Optional password
     * @param payload.retrying Optionally flags if this is a successive connect attempt, used internally only
     * @returns
     */
    async connect({
      hostname = location.host,
      username = defaultUsername,
      password = defaultPassword,
      retrying = false,
    } = {}) {
      const machinesStore = useMachinesStore()
      const settingsStore = useSettingsStore()
      if (!hostname || hostname === defaultMachine) {
        throw new Error('Invalid hostname')
      }
      if (machinesStore[hostname] !== undefined) {
        throw new Error(`Host ${hostname} is already connected!`)
      }
      if (this.isConnecting && !retrying) {
        throw new Error('Already connecting')
      }

      this.isConnecting = true
      try {
        // Establish connection to the machine
        const connectorSettings = {
          ...settingsStore,
          protocol: hostname === location.hostname ? location.protocol : 'http:',
          baseURL: hostname === location.hostname ? (process.env.BASE_URL ?? '/') : '/',
          username: '',
          password,
          pluginsFile: Path.dwcPluginsFile,

          // The following are all defined by the machine settings
          maxRetries: DefaultSettings.maxRetries,
          retryDelay: DefaultSettings.retryDelay,
          ignoreFileTimestamps: DefaultSettings.ignoreFileTimestamps,
          crcUploads: DefaultSettings.crcUploads,
          fileTransferRetryThreshold: DefaultSettings.fileTransferRetryThreshold,
          updateInterval: DefaultSettings.updateInterval,
          pingInterval: DefaultSettings.pingInterval,
          updateDelay: DefaultSettings.updateDelay,
        }
        const connector = await connect(hostname, connectorSettings)

        // Create Vuex module, register, and activate it
        this.addMachine({ hostname, connector })
        this.setSelectedMachine(hostname)

        console.log('todo idk if this will work after adding it to the machine?')
        // Set up event callbacks before loading the settings
        connector.setCallbacks({
          onConnectProgress(connector: BaseConnector, progress: number) {
            console.log('callback from connector called onConnectProgress')
            const _rootStore = useRootStore()
            _rootStore.connectingProgress = progress
          },
          async onConnectionError(connector: BaseConnector, reason: unknown) {
            console.log('callback from connector called onConnectionError')
            await useMachinesStore().onConnectionError(reason as Error)
          },
          onReconnected(connector: BaseConnector) {
            console.log('callback from connector called onReconnected')
            closeNotifications(true)
          },
          onUpdate(connector: BaseConnector, _data: any) {
            let data = _data as Partial<ObjectModel>
            console.log('callback from connector called onUpdate')
            useMachinesStore().update(data)
          },
          onVolumeChanged(connector: BaseConnector, volumeIndex: number) {
            console.log('callback from connector called onVolumeChanged')
            eventbus.$emit(Events.filesOrDirectoriesChanged, {
              machine: hostname,
              volume: volumeIndex,
            })
          },
        })

        // Load machine settings
        try {
          let machineSettingsStore = useMachinesSettingsStore()
          await machineSettingsStore.mutLoad(hostname)
        } catch (e) {
          console.warn('Failed to load settings: ' + getErrorMessage(e))
        }

        // Load cache
        try {
          await useMachinesCacheStore().load()
        } catch (e) {
          console.warn('Failed to load cache: ' + getErrorMessage(e))
        }

        // Perform post-connect tasks
        logGlobal(LogType.success, useI18n().t('events.connected', [hostname]))

        if (settingsStore.lastHostname !== location.host || hostname !== location.host) {
          const _settingsStore = useSettingsStore()
          _settingsStore.setLastHostname(hostname)
        }
      } catch (e) {
        const isPasswordError = e instanceof InvalidPasswordError
        if (!isPasswordError || password !== defaultPassword) {
          logGlobal(
            isPasswordError ? LogType.warning : LogType.error,
            useI18n().t('error.connect', [hostname]),
            getErrorMessage(e),
          )
        }

        if (isPasswordError) {
          this.askForPassword()
        } else if (process.env.NODE_ENV === 'production' && hostname === location.host) {
          setTimeout(
            () => useRootStore().connect({ hostname, username, password, retrying: true }),
            1000,
          )
          return
        }
      }
      this.isConnecting = false
    },

    /**
     * Disconnect from a connected machine
     * @param context Action context
     * @param payload Action payload
     * @param payload.hostname Hostname to disconnect (defaults to the currently selected machine)
     * @param payload.doDisconnect Optionally flag if the connector should send a disconnect request (defaults to true)
     */
    async disconnect(_hostname?: string, doDisconnect?: boolean) {
      console.log('rootStore->disconnect')
      // let rootStore = useRootStore()
      // let settingsStore = useSettingsStore();
      let machinesStore = useMachinesStore()
      // let machinesModelStore = useMachinesModelStore();
      // let machinesCacheStore = useMachinesCacheStore();
      // let machineSettingsStore = useMachinesSettingsStore();
      let hostname = _hostname ?? useRootStore().selectedMachine
      if (hostname === defaultMachine) {
        throw new Error('Invalid hostname, still default machine')
      }
      if (machinesStore[hostname] === undefined) {
        throw new Error(`Host ${hostname} is already disconnected!`)
      }
      if (this.isDisconnecting) {
        throw new Error('Already disconnecting')
      }

      if (doDisconnect) {
        this.setDisconnecting(true)
        try {
          await machinesStore.disconnect()
          logGlobal(LogType.success, useI18n().t('events.disconnected', [hostname]))
          // Disconnecting must always work - even if it does not always happen cleanly
        } catch (e) {
          logGlobal(
            LogType.warning,
            useI18n().t('error.disconnect', [hostname]),
            getErrorMessage(e),
          )
          console.warn(e)
        }
        this.setDisconnecting(false)
      }

      if (this.selectedMachine === hostname) {
        this.setSelectedMachine(defaultMachine)
      }
      this.removeMachine(hostname)
    },

    /**
     * Disconnect from all connected machines
     * @param context Action context
     */
    async disconnectAll() {
      let machinesStore = useMachinesStore()
      for (let hostname in machinesStore) {
        if (hostname !== defaultMachine) {
          // Don't do this via await because we don't have much time...
          this.disconnect()
        }
      }
    },

    /**
     * Event to be called when a machine connector cannot say connected
     * @param context Action context
     * @param payload Action payload
     * @param payload.hostname Hostname of the affected machine
     * @param payload.error Error causing the connection loss
     */
    async onConnectionError({ hostname, error }: { hostname: string; error: Error }) {
      if (error instanceof InvalidPasswordError) {
        logGlobal(LogType.error, useI18n().t('events.connectionLost', [hostname]), error.message)
        await this.disconnect(hostname, false)
        this.askForPassword()
      } else if (process.env.NODE_ENV !== 'production') {
        logGlobal(LogType.error, useI18n().t('events.connectionLost', [hostname]), error.message)
        await this.disconnect(hostname, false)
      } else {
        logGlobal(LogType.warning, useI18n().t('events.reconnecting', [hostname]), error.message)
        useMachinesStore().reconnect()
      }
    },

    /**
     * Load a DWC plugin
     * @param context Action context
     * @param payload Action payload
     * @param payload.id Plugin identifier
     * @param payload.saveSettings Save settings (including enabled plugins) on successful load
     */
    async loadDwcPlugin({ id, saveSettings }: { id: string; saveSettings: boolean }) {
      // Don't load a DWC plugin twice
      if (this.loadedDwcPlugins.includes(id)) {
        return
      }

      // Get the plugin
      let plugin = Plugins.find((item) => item.id === id)
      if (!plugin) {
        plugin = Plugins.find((item) => item.name === id) // fall back to name for backwards-compatibility
        if (!plugin) {
          throw new Error(`Built-in plugin ${id} not found`)
        }
      }

      // SBC and RRF dependencies are not checked for built-in plugins

      // Is the plugin compatible to the running DWC version?
      if (plugin.dwcVersion && !checkVersion(plugin.dwcVersion, packageInfo.version)) {
        throw new Error(
          `Plugin ${id} requires incompatible DWC version (need ${plugin.dwcVersion}, got ${packageInfo.version})`,
        )
      }

      // Load plugin dependencies in DWC
      for (const dependency of plugin.dwcDependencies) {
        const dependentPlugin = Plugins.find((item) => item.id === dependency)
        if (!dependentPlugin) {
          throw new Error(
            `Failed to find DWC plugin dependency ${dependency} for plugin ${plugin.id}`,
          )
        }

        if (!this.loadedDwcPlugins.includes(dependentPlugin.id)) {
          let rootStore = useRootStore()
          // await rootStore.loadPlugin
          console.log('loadPlugin doesnt exist?')
          // await dispatch("loadPlugin", dependentPlugin.id);
        }
      }

      // Load the required web module
      await loadDwcResources(plugin)

      // DWC plugin has been loaded

      this.dwcPluginLoaded(plugin.id)
      if (saveSettings) {
        let settingsStore = useSettingsStore()
        settingsStore.dwcPluginLoaded(plugin.id)
      }
    },

    /**
     * Load a list of DWC plugins and report progress as content is being loaded
     * @param context Action context
     * @param pluginList List of plugin IDs to load
     */
    async loadDwcPlugins(machineName: string, pluginList: Array<string>) {
      let rootStore = useRootStore()
      let settingsStore = useSettingsStore()
      let machinesStore = useMachinesStore()
      let machinesModelStore = useMachinesModelStore()
      let machinesCacheStore = useMachinesCacheStore()
      let machineSettingsStore = useMachinesSettingsStore()

      if (pluginList.length > 0) {
        let operationCancelled = false
        const cancellationToken: CancellationToken = {
          cancel() {
            operationCancelled = true
          },
        }

        this.setDwcPluginsLoading(true)
        const notification = makeNotification(
          LogType.primary,
          useI18n().t('notification.pluginLoad.title'),
          useI18n().t('notification.pluginLoad.message'),
          0,
          null,
          'mdi-connection',
        )
        let loadedPlugins = 0
        for (let i = 0; i < pluginList.length; i++) {
          try {
            if (Plugins.some((plugin) => plugin.id === pluginList[i])) {
              this.loadDwcPlugin({
                id: pluginList[i],
                saveSettings: false,
              })
            } else {
              await machinesStore.loadDwcPlugin({
                id: pluginList[i],
                saveSettings: false,
              })
            }
            loadedPlugins++

            if (operationCancelled) {
              break
            }
          } catch (e) {
            logToConsole(
              LogType.warning,
              `Failed to load DWC plugin ${pluginList[i]}`,
              getErrorMessage(e),
            )
            settingsStore.disableDwcPlugin(pluginList[i])
            machineSettingsStore.disableDwcPlugin(pluginList[i])
          }
          notification.progress = ((i + 1) / pluginList.length) * 100
        }
        notification.close()
        this.setDwcPluginsLoading(false)

        if (loadedPlugins != pluginList.length && !operationCancelled) {
          if (loadedPlugins === 0) {
            makeNotification(
              LogType.error,
              'Failed to load plugins',
              'Could not load DWC plugins, see Console',
              null,
              '/Console',
            )
          } else {
            makeNotification(
              LogType.warning,
              'Failed to load some plugins',
              'Could not load some DWC plugins, see Console',
              null,
              '/Console',
            )
          }
        }
      }
    },

    /**
     * Unload a DWC plugin again (this does NOT unload active JS code!)
     * @param context Action context
     * @param plugin Plugin identifier
     */
    async unloadDwcPlugin(plugin: string) {
      let rootStore = useRootStore()
      let settingsStore = useSettingsStore()
      let machinesStore = useMachinesStore()
      let machinesModelStore = useMachinesModelStore()
      let machinesCacheStore = useMachinesCacheStore()
      let machineSettingsStore = useMachinesSettingsStore()

      settingsStore.disableDwcPlugin(plugin)
      if (settingsStore.enabledPlugins.includes(plugin)) {
        // TODO multi machine confusion
        console.log('todo')
        settingsStore.save(rootStore.selectedMachine)
        // await dispatch('settings/save')
        return true
      }
      return false
    },

    // /**
    // * Load a list of DWC plugins and report progress as content is being loaded
    // * @param context Action context
    // * @param pluginList List of plugin IDs to load
    // */
    // async loadDwcPlugins(pluginList: Array<string>) {
    // 	if (pluginList.length > 0) {
    // 		let operationCancelled = false;
    // 		const cancellationToken: CancellationToken = {
    // 			cancel() {
    // 				operationCancelled = true;
    // 			}
    // 		}
    // 		this.setDwcPluginsLoading(true);
    // 		const notification = makeNotification(LogType.primary, useI18n().t("notification.pluginLoad.title"), useI18n().t("notification.pluginLoad.message"), 0, null, "mdi-connection");
    // 		let loadedPlugins = 0;
    // 		for (let i = 0; i < pluginList.length; i++) {
    // 			try {
    // 				if (Plugins.some(plugin => plugin.id === pluginList[i])) {
    // 					await this.loadDwcPlugin({
    // 						id: pluginList[i],
    // 						saveSettings: false
    // 					});
    // 				} else {
    // 					let machineStore = useMachinesStore()
    // 					await machineStore[machineName].load
    // 					// await dispatch("machine/loadDwcPlugin", {
    // 						id: pluginList[i],
    // 						saveSettings: false
    // 					});
    // 				}
    // 				loadedPlugins++;

    // 				if (operationCancelled) {
    // 					break;
    // 				}
    // 			} catch (e) {
    // 				logToConsole(LogType.warning, `Failed to load DWC plugin ${pluginList[i]}`, getErrorMessage(e));
    // 				const settingsStore = useSettingsStore()
    // 				settingsStore.disableDwcPlugin(pluginList[i])
    // 				const machineSettingsStore = useMachinesSettingsStore()
    // 				machineSettingsStore.disableDwcPlugin(machineName, pluginList[i])
    // 			}
    // 			notification.progress = ((i + 1) / pluginList.length) * 100;
    // 		}
    // 		notification.close();
    // 		this.setDwcPluginsLoading(false);

    // 		if (loadedPlugins != pluginList.length && !operationCancelled) {
    // 			if (loadedPlugins === 0) {
    // 				makeNotification(LogType.error, "Failed to load plugins", "Could not load DWC plugins, see Console", null, "/Console");
    // 			} else {
    // 				makeNotification(LogType.warning, "Failed to load some plugins", "Could not load some DWC plugins, see Console", null, "/Console");
    // 			}
    // 		}
    // 	}
    // },

    // Convert mutations
    // - Mutations do not exist any more. These can be converted to actions instead, or you can just assign directly to the store within your components (eg. userStore.firstName = 'First')
    // - If converting to actions, remove the first state argument and replace any assignments with this instead
    // - A common mutation is to reset the state back to its initial state. This is built in functionality with the store's $reset method. Note that this functionality only exists for option stores.
    /**
     * Show the connect dialog asking for target hostname etc.
     * @param state Vuex state
     */
    showConnectDialog() {
      this.connectDialogShown = true
    },

    /**
     * Hide the connect dialog and password prompt again
     * @param state Vuex state
     */
    hideConnectDialog() {
      this.connectDialogShown = false
      this.passwordRequired = false
    },

    /**
     * Ask for a password on connect
     * @param state Vuex state
     */
    askForPassword() {
      this.connectDialogShown = true
      this.passwordRequired = true
    },

    // /**
    // * Flag if a connection is being established
    // * @param state Vuex state
    // * @param connecting If a machine is being connected to
    // */
    // setConnecting(connecting: boolean) {
    // 	this.isConnecting = connecting
    // },

    // /**
    // * Update the progress of the current connection attempt
    // * @param state Vuex state
    // * @param progress Current progress in per cent (0..100)
    // */
    // setConnectingProgress(progress: number) {
    // 	this.connectingProgress = progress,
    // },

    /**
     * Add a new machine module to the Vuex store (via machines)
     * @param state Vuex state
     * @param payload Mutation payload
     * @param payload.hostname Hostname of the machine to add
     * @param payload.module Machine module (Vuex)
     */
    addMachine({ hostname, connector }: { hostname: string; connector: BaseConnector }) {
      console.log('todo use connector')
      let machinesStore = useMachinesStore()
      let machinesModelStore = useMachinesModelStore()
      let machinesCacheStore = useMachinesCacheStore()
      let machineSettingsStore = useMachinesSettingsStore()

      machinesStore[hostname] = machinesStore[defaultMachine]
      machinesModelStore[hostname] = machinesModelStore[defaultMachine]
      machinesCacheStore[hostname] = machinesCacheStore[defaultMachine]
      machineSettingsStore[hostname] = machineSettingsStore[defaultMachine]

      machinesStore.setConnector(connector, hostname)

      eventbus.$emit(Events.machineAdded, hostname)
    },

    /**
     * Flag if a connection is being terminated
     * @param state Vuex state
     * @param disconnecting If a machine is being disconnected from
     */
    setDisconnecting(disconnecting: boolean) {
      this.isDisconnecting = disconnecting
    },

    /**
     * Remove an existing machine from the Vuex store (from machines)
     * @param state Vuex state
     * @param hostname Hostname of the machine to remove
     */
    removeMachine(hostname: string) {
      if (!hostname || hostname === defaultMachine) {
        throw new Error('Invalid hostname')
      }

      let machinesStore = useMachinesStore()
      let machinesModelStore = useMachinesModelStore()
      let machinesCacheStore = useMachinesCacheStore()
      let machineSettingsStore = useMachinesSettingsStore()

      delete machinesStore[hostname]
      delete machinesModelStore[hostname]
      delete machinesCacheStore[hostname]
      delete machineSettingsStore[hostname]

      eventbus.$emit(Events.machineRemoved, hostname)
    },

    /**
     * Set the currently selected machine
     * @param state Vuex state
     * @param hostname Hostname of the machine to select
     */
    setSelectedMachine(hostname: string) {
      if (!hostname) {
        throw new Error('Invalid hostname')
      }
      this.selectedMachine = hostname
    },

    /**
     * Flag if the configured DWC plugins are being loaded
     */
    setDwcPluginsLoading(loading: boolean) {
      this.loadingDwcPlugins = loading
    },

    /**
     * Callback to be called when a DWC plugin has been loaded
     * @param state Vuex state
     * @param plugin Plugin identifier of the loaded plugin
     */
    dwcPluginLoaded(plugin: string) {
      this.loadedDwcPlugins.push(plugin)
    },

    /**
     * Do not show upcoming code reply notifications
     * @param state Vuex state
     */
    doHideCodeReplyNotifications() {
      this.hideCodeReplyNotifications = true
    },

    /**
     * Show upcoming code reply notifications again
     * @param state Vuex state
     */
    showCodeReplyNotifications() {
      this.hideCodeReplyNotifications = false
    },

    /**
     * Called by OSK plugins to announce OSK functionality
     * @param state Vuex state
     */
    doOskEnabled() {
      this.oskEnabled = true
    },

    /**
     * Set the new bottom margin (reserved for OSK plugins)
     * @param state Vuex state
     * @param value New bottom margin in px
     */
    setBottomMargin(value: number) {
      this.bottomMargin = value
    },
  },
})

/**
 * Register custom plugin data
 * @param plugin Plugin identifier
 * @param dataType Type of the data to register
 * @param key Key to use
 * @param defaultValue Default value on initalization
 */
export function registerPluginData(
  plugin: string,
  dataType: PluginDataType,
  key: string,
  defaultValue: any,
) {
  let settingsStore = useSettingsStore()
  let machinesStore = useMachinesStore()
  let machinesModelStore = useMachinesModelStore()
  let machinesCacheStore = useMachinesCacheStore()
  let machineSettingsStore = useMachinesSettingsStore()

  switch (dataType) {
    case PluginDataType.globalSetting:
      settingsStore.registerPluginData({ plugin, key, defaultValue })
      break
    case PluginDataType.machineCache:
      for (let machine in machinesStore) {
        machinesCacheStore.registerPluginData({ plugin, key, defaultValue }, machine)
      }
      break
    case PluginDataType.machineSetting:
      for (let machine in machinesStore) {
        machineSettingsStore.registerPluginData({ plugin, key, defaultValue }, machine)
      }
      break
    default:
      throw new Error(
        `Invalid plugin data type (plugin ${plugin}, dataType ${dataType}, key ${key})`,
      )
  }
}

/**
 * Set custom plugin data
 * @param plugin Plugin identifier
 * @param dataType Type of the data
 * @param key Key to use
 * @param value New value
 */
export function setPluginData(plugin: string, dataType: PluginDataType, key: string, value: any) {
  const settingsStore = useSettingsStore()
  const machinesCacheStore = useMachinesCacheStore()
  const machinesSettingsStore = useMachinesSettingsStore()

  switch (dataType) {
    case PluginDataType.globalSetting:
      settingsStore.setPluginData({ plugin, key, value })
      break
    case PluginDataType.machineCache:
      machinesCacheStore.setPluginData({ plugin, key, value })
      break
    case PluginDataType.machineSetting:
      machinesSettingsStore.setPluginData({ plugin, key, value })
      break
    default:
      throw new Error(
        `Invalid plugin data type (plugin ${plugin}, dataType ${dataType}, key ${key})`,
      )
  }
}
