import { translateResponse } from '@/i18n'
import { makeFileTransferNotification, Notification, showMessage } from '@/utils/notifications'
import {
  BaseConnector,
  CancellationToken,
  CodeBufferError,
  DisconnectedError,
  FileNotFoundError,
  InvalidPasswordError,
  OnProgressCallback,
  OperationCancelledError,
  OperationFailedError,
} from '@duet3d/connectors'
import { Plugin } from '@duet3d/objectmodel'
import { markRaw, reactive } from 'vue'

import Plugins, { checkVersion, loadDwcResources } from '@/plugins'
import Events from '@/utils/events'
import Path from '@/utils/path'
import packageInfo from '../../package.json'

import { log, logCode, LogType } from '@/utils/logging'
import { defineStore } from 'pinia'
import { useI18n } from 'vue-i18n'

/**
 * Recorded machine event (e.g. message or code reply)
 */
export interface MachineEvent {
  /**
   * Datetime of this event
   */
  date: Date

  /**
   * Type of this event
   */
  type: LogType

  /**
   * Title of this event
   */
  title: string

  /**
   * Optional message of this event
   */
  message: string | null
}

import beep from '@/utils/beep'
import { displayTime } from '@/utils/display'
import { getErrorMessage } from '@/utils/errors'
import eventbus from '@/utils/eventbus'
import { FileTransferType } from '@/utils/notifications'
import ObjectModel, { DefaultHostname, MachineStatus, MessageType } from '@duet3d/objectmodel'
import JSZip from 'jszip'
import { useRootStore } from '.'
import { useMachinesCacheStore } from './machineCache'
import { useMachinesModelStore } from './machineModel'
import { useMachinesSettingsStore } from './machineSettings'
import { defaultMachine } from './misc'
import { useSettingsStore } from './settings'

/**
 * State of the machine module
 */
export interface MachineState {
  /**
   * CAN address of the current board being updated
   */
  boardBeingUpdated: number

  /**
   * List of CAN addresses of the boards being updated
   */
  boardsBeingUpdated: Array<number>

  /**
   * List of recorded events (items for the G-code console)
   */
  events: Array<MachineEvent>

  /**
   * Indicates if the machine is attempting to reconnect
   */
  isReconnecting: boolean

  /**
   * List of files currently being modified by a file operation
   */
  filesBeingChanged: Array<string>

  /**
   * Indicates if multiple files are being transferred at once
   */
  transferringFiles: boolean
}

/**
 * Interface for file transfer items
 */
export interface FileTransferItem {
  /**
   * Filename of the element being transferred
   */
  filename: string

  /**
   * Transferred content
   */
  content: any

  /**
   * Expected respones type (if this is a download)
   */
  type?: XMLHttpRequestResponseType

  /**
   * Time at which the transfer was started or null if it hasn't started yet
   */
  startTime: Date | null

  /**
   * How many times this upload has been restarted
   */
  retry: number

  /**
   * Current progress
   */
  progress: number

  /**
   * Speed (in bytes/sec)
   */
  speed: number | null

  /**
   * Size of the item to transfer or null if unknown
   */
  size: number | null

  /**
   * If present this holds the error causing the transfer to fail
   */
  error?: any
}

export const useMachinesStore = defineStore('machines', {
  state: (): Record<string, MachineState & { _connector?: BaseConnector | null }> => ({
    [defaultMachine]: {
      boardBeingUpdated: -1,
      boardsBeingUpdated: new Array<number>(),
      events: new Array<MachineEvent>(),
      isReconnecting: false,
      filesBeingChanged: new Array<string>(),
      transferringFiles: false,
      _connector: null, // Store connector as non-reactive
    },
  }),
  getters: {
    boardBeingUpdated: (state) => state[useRootStore().selectedMachine].boardBeingUpdated,
    boardsBeingUpdated: (state) => state[useRootStore().selectedMachine].boardsBeingUpdated,
    events: (state) => state[useRootStore().selectedMachine].events,
    isReconnecting: (state) => state[useRootStore().selectedMachine].isReconnecting,
    filesBeingChanged: (state) => state[useRootStore().selectedMachine].filesBeingChanged,
    transferringFiles: (state) => state[useRootStore().selectedMachine].transferringFiles,
    connector: (state) => state[useRootStore().selectedMachine]?._connector ?? null,
    // Remove any getters that return state under the same name (eg. firstName: (state) => state.firstName), these are not necessary as you can access any state directly from the store instance
    // If you need to access other getters, they are on this instead of using the second argument. Remember that if you are using this then you will have to use a regular function instead of an arrow function. Also note that you will need to specify a return type because of TS limitations, see here for more details
    // If using rootState or rootGetters arguments, replace them by importing the other store directly, or if they still exist in Vuex then access them directly from Vuex
    /**
     * Indicates if there are any sensor values that can be displayed
     */
    hasTemperaturesToDisplay: (state) =>
      useMachinesModelStore().sensors.analog.some(function (sensor, sensorIndex) {
        const settings = useMachinesSettingsStore()
        return (
          useMachinesModelStore().heat.heaters.some(
            (heater) => heater && heater.sensor === sensorIndex,
          ) || settings.displayedExtraTemperatures.indexOf(sensorIndex) !== -1
        )
      }),
  },
  actions: {
    /**
     * Set the connector for a specific machine
     * @param hostname Machine hostname
     * @param connector Connector instance (will be marked as non-reactive)
     */
    setConnector(connector: BaseConnector | null, hostname: string) {
      console.log('setConnector')
      // markRaw prevents Vue from making the connector reactive
      this[hostname]._connector = connector ? markRaw(connector) : null
    },
    /**
     * Get the connector for a specific machine
     * @param hostname Machine hostname
     * @returns Connector instance or null
     */
    getConnector(hostname?: string): BaseConnector | null {
      const machineName = hostname || useRootStore().selectedMachine
      return this[machineName]?._connector || null
    },
    /**
     * Install or upgrade a third-party plugin
     * @param context Action context
     * @param payload Action payload
     * @param payload.zipFilename Filename of the ZIP container
     * @param payload.zipBlob ZIP container data to upload (if applicable)
     * @param payload.zipFile ZIP container to extract (if applicable)
     * @param payload.start Whether to start the plugin upon installation
     */
    async installPlugin({
      zipFilename,
      zipBlob,
      zipFile,
      start,
    }: {
      zipFilename: string
      zipBlob: Blob
      zipFile: JSZip
      start: boolean
    }) {
      console.log('todo')
      // if (connector === null) { throw new OperationFailedError("installPlugin is not available in default machine module"); }

      // // Check the required DWC version
      // const manifestJson = JSON.parse(await zipFile.file("plugin.json")!.async("string"));
      // const plugin = initObject(Plugin, manifestJson);

      // // Check plugin manifest
      // if (!checkManifest(plugin)) {
      // 	throw new Error("Invalid plugin manifest");
      // }

      // // Is the plugin compatible to the running DWC version?
      // if (plugin.dwcVersion && !checkVersion(plugin.dwcVersion, packageInfo.version)) {
      // 	throw new Error(`Plugin ${plugin.id} requires incompatible DWC version (need ${plugin.dwcVersion}, got ${packageInfo.version})`);
      // }

      // try {
      // 	// About to upload multiple files, avoid unnecessary refreshes
      // 	commit("setMultiFileTransfer", true);

      // 	// Install the plugin
      // 	await connector.installPlugin(
      // 		zipFilename,
      // 		zipBlob,
      // 		zipFile,
      // 		plugin,
      // 		start
      // 	);
      // } finally {
      // 	// Done
      // 	commit("setMultiFileTransfer", false);
      // }

      // // Start it if required and show a message
      // if (start) {
      // 	await dispatch("loadDwcPlugin", { id: plugin.id, saveSettings: true });
      // }
    },

    /**
     * Uninstall a third-party plugin
     * @param context Action context
     * @param plugin Plugin instance to uninstall
     */
    async uninstallPlugin(plugin: Plugin): Promise<void> {
      if (this.connector === null) {
        throw new OperationFailedError('uninstallPlugin is not available in default machine module')
      }

      await this.connector.uninstallPlugin(plugin)
    },

    /**
     * Set custom plugin data on the SBC.
     * This is only supported in SBC mode and if no SBC executable is part of the plugin (e.g. to share session-independent data).
     * If there is an SBC executable, consider implementing your own HTTP endpoints and/or G/M-codes to avoid potential conflicts
     * @param context Action context
     * @param payload Action payload
     * @param payload.plugin Identifier of the plugin
     * @param payload.key Existing key of the plugin data to set
     * @param payload.value Custom value to set
     */
    async setSbcPluginData({
      plugin,
      key,
      value,
    }: {
      plugin: string
      key: string
      value: any
    }): Promise<void> {
      console.log('todo')
      // if (connector === null) { throw new OperationFailedError("setSbcPluginData is not available in default machine module"); }

      // await connector.setSbcPluginData(plugin, key, value);
    },

    /**
     * Start a plugin on the SBC
     * @param context Action context
     * @param plugin Identifier of the plugin
     */
    async startSbcPlugin(plugin: string): Promise<void> {
      console.log('todo')
      // if (connector === null) { throw new OperationFailedError("startSbcPlugin is not available in default machine module"); }

      // await connector.startSbcPlugin(plugin);
    },

    /**
     * Stop a plugin on the SBC
     * @param context Action context
     * @param plugin Identifier of the plugin
     */
    async stopSbcPlugin(plugin: string): Promise<void> {
      console.log('todo')
      // if (connector === null) { throw new OperationFailedError("stopSbcPlugin is not available in default machine module"); }

      // await connector.stopSbcPlugin(plugin);
    },

    /**
     * List the files and directories from a given directory
     * @param context Action context
     * @param directory Directory to query
     */
    async getFileList(directory: string) {
      if (this[useRootStore().selectedMachine]._connector === null) {
        throw new OperationFailedError('getFileList is not available in default machine module')
      }

      console.log(useRootStore().selectedMachine)
      return this[useRootStore().selectedMachine]._connector!.getFileList(directory)
    },
    /**
     * Parse a G-code file and return the retrieved information
     * @param context Action context
     * @param payload Action payload
     * @param payload.filename Path of the file to parse
     * @param payload.readThumbnailContent Retrieve thumbnail contents (defaults to false)
     */
    async getFileInfo({
      filename,
      readThumbnailContent,
    }: {
      filename: string
      readThumbnailContent?: boolean
    }) {
      if (this.connector === null) {
        throw new OperationFailedError('getFileInfo is not available in default machine module')
      }

      return this.connector.getFileInfo(filename, readThumbnailContent)
    },

    /**
     * Make a new directory
     * @param context Action context
     * @param directory Directory path to create
     */
    async makeDirectory(directory: string) {
      if (this.connector === null) {
        throw new OperationFailedError('delete is not available in default machine module')
      }

      await this.connector.makeDirectory(directory)
      eventbus.$emit(Events.directoryCreated, { machine: this.connector.hostname, directory })
      eventbus.$emit(Events.filesOrDirectoriesChanged, {
        machine: this.connector.hostname,
        files: [directory],
      })
    },
    /**
     *
     * @param context Action context
     * @param payload Action payload
     * @param payload.from File or directory to move
     * @param payload.to New filename of the file or directory
     * @param payload.force Overwrite existing files (defaults to false)
     */
    async move({ from, to, force = false }: { from: string; to: string; force?: boolean }) {
      if (this.connector === null) {
        throw new OperationFailedError('move is not available in default machine module')
      }

      await this.connector.move(from, to, force)
      eventbus.$emit(Events.fileOrDirectoryMoved, {
        machine: this.connector.hostname,
        from,
        to,
        force,
      })
      eventbus.$emit(Events.filesOrDirectoriesChanged, {
        machine: this.connector.hostname,
        files: [from, to],
      })
    },

    /**
     * Reconnect after a connection error
     */
    async reconnect() {
      if (this.connector === null) {
        throw new OperationFailedError('reconnect is not available in default machine module')
      }

      if (!this.isReconnecting) {
        // Clear the global variables again and set the state to disconnected
        await this.update({
          global: undefined,
          state: undefined,
          // {

          // 	startupError: null,
          // 	status: MachineStatus.disconnected
          // }
        })
        console.log('todo maybe wrong state, types being awkward')

        // Now trying to reconnect...
        this.setReconnecting(true)
      }

      try {
        await this.connector.reconnect()

        this.setReconnecting(false)
        log(LogType.success, useI18n().t('events.reconnected'))
      } catch (e) {
        await this.onConnectionError(e as Error)
      }
    },

    /**
     * Event to be called by a connector on connection error.
     * This makes sure that the connector attempts to reconnect in certain intervals
     * @param context Action context
     * @param error Error causing the connection to be interrupted
     */
    async onConnectionError(error: Error) {
      if (this.connector === null) {
        throw new OperationFailedError(
          'onConnectionError is not available in default machine module',
        )
      }
      console.warn(error)

      if (
        !this.isReconnecting &&
        [MachineStatus.updating, MachineStatus.halted].includes(
          useMachinesModelStore().state.status,
        )
      ) {
        // Try to reconnect instantly once if the machine is updating or performing an emergency stop
        if (useMachinesModelStore().state.status !== MachineStatus.updating) {
          log(LogType.warning, useI18n().t('events.reconnecting'))
        }
        this.reconnect()
      } else if (
        useMachinesModelStore().isReconnecting &&
        !(error instanceof InvalidPasswordError)
      ) {
        // Retry after a short moment
        setTimeout(() => this.reconnect(), 2000)
      } else {
        // Notify the root store about this event
        useRootStore().onConnectionError({ hostname: this.connector.hostname, error: error })
      }
    },
    /**
     * Update the machine's object model. This must be used by connectors only!
     * @param context Action context
     * @param payload Updated model data
     */
    async update(payload: Partial<ObjectModel>) {
      console.log('useMachinesStore->update')
      // console.log('todo')
      const machineState = this[useRootStore().selectedMachine]
      const machineModelState = useMachinesModelStore()[useRootStore().selectedMachine]
      const lastBeepFrequency = machineModelState.state.beep
        ? machineModelState.state.beep.frequency
        : null
      const lastBeepDuration = machineModelState.state.beep
        ? machineModelState.state.beep.duration
        : null
      const lastDisplayMessage = machineModelState.state.displayMessage,
        lastStatus = machineModelState.state.status
      const lastDsfVersion = machineModelState.sbc?.dsf?.version
      const lastStartupError = machineModelState.state.startupError
        ? JSON.stringify(machineModelState.state.startupError)
        : null

      // Check if the job has finished and if so, clear the file cache
      if (
        payload.job &&
        payload.job.lastFileName &&
        payload.job.lastFileName !== machineModelState.job.lastFileName
      ) {
        useMachinesCacheStore().clearFileInfo(payload.job.lastFileName)
      }

      // Deal with incoming messages
      if (payload.messages) {
        for (const [_, message] of Object.entries(payload.messages!)) {
          if (!message || typeof message === 'number' || !('type' in message)) {
            throw new Error('Unexpected object model, no type field?')
          } else {
            // the duet object models types seem strange,
            let reply: string
            switch (message.type) {
              case MessageType.warning:
                reply = `Warning: ${message.content}`
                break
              case MessageType.error:
                reply = `Error: ${message.content}`
                break
              default:
                reply = message.content ?? 'nocontent'
                break
            }
            reply = translateResponse(reply)

            logCode(null, reply, this.connector ? this.connector.hostname : defaultMachine)
            eventbus.$emit(Events.codeExecuted, {
              machine: this.connector ? this.connector.hostname : defaultMachine,
              code: null,
              reply,
            })
          }
        }
        // delete payload.messages;
        console.log('No longer deleting messages from payload, may cause problems?')
      }

      // Merge updates into the object model
      useMachinesModelStore().update(payload)
      eventbus.$emit(
        Events.machineModelUpdated,
        this.connector ? this.connector.hostname : defaultMachine,
      )

      // Is a new beep requested?
      if (
        machineModelState.state.beep &&
        lastBeepDuration !== machineModelState.state.beep.duration &&
        lastBeepFrequency !== machineModelState.state.beep.frequency
      ) {
        beep(machineModelState.state.beep.frequency, machineModelState.state.beep.duration)
      }

      // Is a new message supposed to be shown?
      if (machineModelState.state.displayMessage !== lastDisplayMessage) {
        showMessage(machineModelState.state.displayMessage)
      }

      // Check if DSF has been updated
      if (lastDsfVersion && machineModelState.sbc?.dsf?.version !== lastDsfVersion) {
        location.reload()
      }

      // Is there a startup error to report?
      const startupError = machineModelState.state.startupError
      if (startupError !== null && lastStartupError !== JSON.stringify(startupError)) {
        const errorMessage = useI18n().t('error.startupError', [
          startupError.file,
          startupError.line,
          startupError.message,
        ])
        log(LogType.error, errorMessage, undefined, this.connector?.hostname ?? DefaultHostname)
      }

      // Has the firmware halted?
      if (
        lastStatus !== machineModelState.state.status &&
        machineModelState.state.status === MachineStatus.halted
      ) {
        log(
          LogType.warning,
          useI18n().t('events.emergencyStop'),
          undefined,
          this.connector?.hostname ?? DefaultHostname,
        )
      }
    },
    /**
     * Disconnect gracefully from this machine
     */
    async disconnect(): Promise<void> {
      if (this.connector === null) {
        throw new OperationFailedError('disconnect is not available in default machine module')
      }

      await this.connector.disconnect()
    },

    /**
     * Install a system package file on the SBC (deb files on DuetPi).
     * Since this is a potential security hazard, this call is only supported if the DSF is configured to permit system package installations
     * @param context Action context
     * @param payload Action payload
     * @param payload.filename Name of the package file
     * @param payload.packageData Blob data of the package to install
     * @param payload.cancellationToken Optional cancellation token that may be triggered to cancel this operation
     * @param payload.onProgress Optional callback for progress reports
     */
    async installSystemPackage({
      filename,
      packageData,
      cancellationToken,
      onProgress,
    }: {
      filename: string
      packageData: Blob
      cancellationToken?: CancellationToken
      onProgress?: OnProgressCallback
    }): Promise<void> {
      console.log('todo')
      // if (connector === null) { throw new OperationFailedError("installSystemPackage is not available in default machine module"); }

      // const notification = makeFileTransferNotification(FileTransferType.systemPackageInstall, filename, cancellationToken);
      // try {
      // 	try {
      // 		await connector.installSystemPackage(filename, packageData, cancellationToken, onProgress);
      // 		makeNotification(LogType.success, useI18n().t("notification.systemPackageInstall.success", [filename]));
      // 	} catch (e) {
      // 		if (!(e instanceof OperationCancelledError)) {
      // 			makeNotification(LogType.error, useI18n().t("notification.systemPackageInstall.error", [filename]), getErrorMessage(e));
      // 			throw e;
      // 		}
      // 	}
      // } finally {
      // 	notification.close();
      // }
    },

    /**
     * Send a code and log the result (if applicable)
     * @param payload Can be either a string (code to send) or an object
     * @param payload.code Code to send
     * @param payload.fromInput Optional value indicating if the code originates from a code input (defaults to false)
     * @param payload.log Log the code result (defaults to true)
     * @param payload.noWait Do not wait for the code to complete (defaults to false)
     */
    async sendCode(
      payload: string | { code: string; fromInput?: boolean; log?: boolean; noWait?: boolean },
    ) {
      // console.log('todo connector')

      if (this.connector === null) {
        throw new OperationFailedError('sendCode is not available in default machine module')
      }

      const code = payload instanceof Object ? payload.code : payload
      const fromInput =
        payload instanceof Object && payload.fromInput !== undefined ? payload.fromInput : false
      const doLog = payload instanceof Object && payload.log !== undefined ? payload.log : true
      const noWait =
        payload instanceof Object && payload.noWait !== undefined ? payload.noWait : false
      try {
        let reply = await this.connector.sendCode(code, noWait)
        if (typeof reply === 'string') {
          reply = translateResponse(reply)
        }

        if (doLog && (fromInput || reply)) {
          logCode(code, reply || '', this.connector.hostname)
        }
        eventbus.$emit(Events.codeExecuted, { machine: this.connector.hostname, code, reply })
        return reply
      } catch (e) {
        if (!(e instanceof DisconnectedError) && doLog) {
          const type = e instanceof CodeBufferError ? LogType.warning : LogType.error
          log(type, code, getErrorMessage(e), this.connector.hostname)
        }
        throw e
      }
    },

    // Convert actions
    // Remove the first context argument from each action. Everything should be accessible from this instead
    // If using other stores either import them directly or access them on Vuex, the same as for getters
    /**
     * Upload one or more files
     * @param context Action context
     * @param payload Action payload
     * @param payload.filename Name of the file to upload (for single uploads)
     * @param payload.content Content of the file to upload (for single uploads)
     * @param payload.files List of files to upload (for combined multiple uploads)
     * @param payload.showProgress Display upload progress (defaults to true)
     * @param payload.showSuccess Show notification upon successful uploads (for single uploads, defaults to true)
     * @param payload.showError Show notification upon error (defaults to true)
     * @param payload.closeProgressOnSuccess Automatically close the progress indicator when finished (defaults to false)
     */
    async upload(
      payload: {
        filename?: string
        content?: any
        files?: Array<{ filename: string; content: any }>
        showProgress?: boolean
        showSuccess?: boolean
        showError?: boolean
        closeProgressOnSuccess?: boolean
      },
      _machineName?: string,
    ) {
      // if (connector === null) { throw new OperationFailedError("upload is not available in default machine module"); }

      let machineName = _machineName ?? useRootStore().selectedMachine
      const files = reactive(new Array<FileTransferItem>()),
        cancellationToken: CancellationToken = { cancel() {} }
      const showProgress = payload.showProgress !== undefined ? Boolean(payload.showProgress) : true
      const showSuccess = payload.showSuccess !== undefined ? Boolean(payload.showSuccess) : true
      const showError = payload.showError !== undefined ? Boolean(payload.showError) : true
      const closeProgressOnSuccess =
        payload.closeProgressOnSuccess !== undefined
          ? Boolean(payload.closeProgressOnSuccess)
          : false

      // Prepare the arguments and tell listeners that an upload is about to start
      let notification: Notification | null = null
      if (typeof payload.filename === 'string') {
        files.push({
          filename: payload.filename,
          content: payload.content,
          startTime: null,
          retry: 0,
          progress: 0,
          speed: null,
          size: payload.content.length || payload.content.size || 0,
          error: null,
        })
        this.addFileBeingChanged(payload.filename)
        if (showProgress) {
          notification = makeFileTransferNotification(
            FileTransferType.upload,
            payload.filename,
            cancellationToken,
          )
        }

        eventbus.$emit(Events.fileUploading, {
          machine: machineName,
          filename: payload.filename,
          content: payload.content,
          showProgress,
          showSuccess,
          showError,
          cancellationToken,
        })
      } else if (payload.files instanceof Array) {
        if (this.transferringFiles) {
          throw new Error('Cannot perform two multi-file transfers at the same time')
        }
        this.setMultiFileTransfer(true)

        for (const file of payload.files) {
          files.push({
            filename: file.filename,
            content: file.content,
            startTime: null,
            retry: 0,
            progress: 0,
            speed: null,
            size: file.content.length || file.content.size || 0,
            error: null,
          })
          this.addFileBeingChanged(file.filename)
        }

        eventbus.$emit(Events.multipleFilesUploading, {
          machine: machineName,
          files,
          showProgress,
          closeProgressOnSuccess,
          cancellationToken,
        })
      }

      let machinesModelStore = useMachinesModelStore()
      let machinesCacheStores = useMachinesCacheStore()

      // Upload the file(s)
      try {
        for (let i = 0; i < files.length; i++) {
          const item = files[i],
            filename = item.filename,
            content = item.content
          try {
            // Check if config.g needs to be backed up
            const configFile = Path.combine(
              machinesModelStore[machineName].directories.system,
              Path.configFile,
            )
            if (Path.equals(filename, configFile)) {
              const configFileBackup = Path.combine(
                machinesModelStore[machineName].directories.system,
                Path.configBackupFile,
              )
              try {
                console.log('todo connector')
                // await connector.move(configFile, configFileBackup, true);
              } catch (e) {
                if (!(e instanceof OperationFailedError) && !(e instanceof FileNotFoundError)) {
                  // config.g may not exist, so suppress errors if necessary
                  throw e
                }
              }
            }

            // Clear the cached file info (if any)
            machinesCacheStores.clearFileInfo(filename)

            // Wait for the upload to finish
            item.startTime = new Date()
            console.log('todo connector')
            // await connector.upload(
            // 	filename,
            // 	content,
            // 	cancellationToken,
            // 	(loaded, total, retry) => {
            // 		if (item.startTime === null) {
            // 			item.startTime = new Date();
            // 		}
            // 		item.progress = loaded / total;
            // 		item.speed = loaded / (((new Date()).getTime() - item.startTime.getTime()) / 1000);
            // 		item.retry = retry;
            // 		if (notification && notification.onProgress) {
            // 			notification.onProgress(loaded, total, item.speed);
            // 		}
            // 	}
            // );
            item.progress = 1

            // Show success message
            if (payload.filename && showSuccess) {
              const secondsPassed = Math.round(
                (new Date().getTime() - item.startTime.getTime()) / 1000,
              )
              log(
                LogType.success,
                useI18n().t('notification.upload.success', [
                  Path.extractFileName(filename),
                  displayTime(secondsPassed),
                ]),
                undefined,
                machineName,
              )
            }

            // File has been uploaded successfully, emit an event
            eventbus.$emit(Events.fileUploaded, {
              machine: machineName,
              filename,
              content,
              num: i,
              count: files.length,
            })
          } catch (e) {
            // Failed to upload a file, emit an event
            eventbus.$emit(Events.fileUploadError, {
              machine: machineName,
              filename,
              content,
              error: e,
            })

            // Show an error if requested
            if (showError && !(e instanceof OperationCancelledError)) {
              console.warn(e)
              log(
                LogType.error,
                useI18n().t('notification.upload.error', [Path.extractFileName(filename)]),
                getErrorMessage(e),
                machineName,
              )
            }

            // Rethrow the error so the caller is notified
            item.error = e
            throw e
          }
        }
      } finally {
        if (notification) {
          notification.close()
        }
        this.clearFilesBeingChanged()
        if (!payload.filename) {
          this.setMultiFileTransfer(false)
        }
        eventbus.$emit(Events.filesOrDirectoriesChanged, {
          machine: machineName,
          files: files.map((file) => file.filename),
        })
      }
    },

    /**
     * Download one or more files
     * @param context Action context
     * @param payload Action payload
     * @param payload.filename Name of the file to download (for single transfers)
     * @param payload.type Data type of the file to download (for single transfers)
     * @param payload.files List of files to download (for multiple transfers)
     * @param payload.showProgress Display upload progress (defaults to true)
     * @param payload.showSuccess Show notification upon successful uploads (for single uploads, defaults to true)
     * @param payload.showError Show notification upon error (defaults to true)
     * @param payload.closeProgressOnSuccess Automatically close the progress indicator when finished (defaults to false)
     * @param payload.rawPath Obtain file from DWC base path instead of virtual SD card
     * @returns File transfer item if a single file was requested, else the files list plus content property
     */
    async download(
      payload: {
        filename?: string
        type?: XMLHttpRequestResponseType
        files?: Array<string>
        showProgress?: boolean
        showSuccess?: boolean
        showError?: boolean
        closeProgressOnSuccess?: boolean
        rawPath?: boolean
      },
      hostname?: string,
    ): Promise<Array<FileTransferItem>> {
      if (this.connector! === null) {
        throw new OperationFailedError('download is not available in default machine module')
      }

      const files = reactive(new Array<FileTransferItem>()),
        cancellationToken: CancellationToken = { cancel() {} }
      const showProgress = payload.showProgress !== undefined ? payload.showProgress : true
      const showSuccess = payload.showSuccess !== undefined ? payload.showSuccess : true
      const showError = payload.showError !== undefined ? payload.showError : true
      const closeProgressOnSuccess =
        payload.closeProgressOnSuccess !== undefined ? payload.closeProgressOnSuccess : false
      const rawPath = payload.rawPath !== undefined ? payload.rawPath : false

      // Prepare the arguments and tell listeners that an upload is about to start
      let notification: Notification | null = null
      if (payload.filename) {
        files.push({
          filename: payload.filename,
          content: null,
          type: payload.type || 'json',
          startTime: null,
          retry: 0,
          progress: 0,
          speed: null,
          size: null,
          error: null,
        })
        if (showProgress) {
          notification = makeFileTransferNotification(
            FileTransferType.download,
            payload.filename,
            cancellationToken,
          )
        }

        eventbus.$emit(Events.fileDownloading, {
          machine: this.connector!.hostname,
          filename: payload.filename,
          type: payload.type,
          showProgress,
          showSuccess,
          showError,
          cancellationToken,
          rawPath,
        })
      } else if (payload.files instanceof Array) {
        if (this.transferringFiles) {
          throw new Error('Cannot perform two multi-file transfers at the same time')
        }
        this.setMultiFileTransfer(true)

        for (const file of payload.files) {
          files.push({
            filename: file,
            content: null,
            type: payload.type || 'blob',
            startTime: null,
            retry: 0,
            progress: 0,
            speed: null,
            size: null,
            error: null,
          })
        }

        eventbus.$emit(Events.multipleFilesDownloading, {
          machine: this.connector!.hostname,
          files,
          showProgress,
          closeProgressOnSuccess,
          cancellationToken,
          rawPath,
        })
      }

      // Download the file(s)
      try {
        for (let i = 0; i < files.length; i++) {
          const item = files[i],
            filename = item.filename,
            type = item.type
          try {
            // Wait for download to finish
            item.startTime = new Date()
            const response = await this.connector!.download(
              filename,
              type,
              cancellationToken,
              (loaded, total, retry) => {
                if (item.startTime === null) {
                  item.startTime = new Date()
                }
                item.size = total
                item.progress = loaded / total
                item.speed = loaded / ((new Date().getTime() - item.startTime.getTime()) / 1000)
                item.retry = retry
                if (notification && notification.onProgress) {
                  notification.onProgress(loaded, total, item.speed)
                }
              },
              rawPath,
            )
            item.progress = 1

            // Show success message
            if (payload.filename && showSuccess) {
              const secondsPassed = Math.round(
                (new Date().getTime() - item.startTime.getTime()) / 1000,
              )
              log(
                LogType.success,
                useI18n().t('notification.download.success', [
                  Path.extractFileName(filename),
                  displayTime(secondsPassed),
                ]),
                undefined,
                this.connector.hostname,
              )
            }

            // File has been uploaded successfully, emit an event
            eventbus.$emit(Events.fileDownloaded, {
              machine: this.connector!.hostname,
              filename,
              type,
              num: i,
              count: files.length,
            })

            // Return the response if a single file was requested
            if (payload.filename) {
              return response
            }
            item.content = response
          } catch (e) {
            // Failed to download a file, emit an event
            eventbus.$emit(Events.fileDownloadError, {
              machine: this.connector.hostname,
              filename,
              type,
              error: e,
            })

            // Show an error if requested
            if (showError && !(e instanceof OperationCancelledError)) {
              console.warn(e)
              log(
                LogType.error,
                useI18n().t('notification.download.error', [Path.extractFileName(filename)]),
                getErrorMessage(e),
                this.connector.hostname,
              )
            }

            // Rethrow the error so the caller is notified
            item.error = e
            throw e
          }
        }
      } finally {
        if (notification) {
          notification.close()
        }
        if (!payload.filename) {
          this.setMultiFileTransfer(false)
        }
      }
      return files
    },

    /**
     * Delete a file or directory
     * @param context Action context
     * @param payload Filename to delete or an object
     * @param payload.filename Filename to delete
     * @param payload.recursive Delete directories recursively (optional)
     */
    async delete(
      payload: string | { filename: string; recursive?: boolean },
      machineName?: string,
    ) {
      // if (connector === null) { throw new OperationFailedError("delete is not available in default machine module"); }
      console.log('todo')
      // if (payload instanceof Object) {
      // 	await connector.delete(payload.filename, payload.recursive);
      // 	eventbus.$emit(Events.fileOrDirectoryDeleted, {
      // 		machine: connector.hostname,
      // 		filename: payload.filename,
      // 		recursive: payload.recursive
      // 	});
      // 	eventbus.$emit(Events.filesOrDirectoriesChanged, {
      // 		machine: connector.hostname,
      // 		files: [payload.filename],
      // 	});
      // } else {
      // 	await connector.delete(payload);
      // 	eventbus.$emit(Events.fileOrDirectoryDeleted, {
      // 		machine: connector.hostname,
      // 		filename: payload,
      // 		recursive: false
      // 	});
      // 	eventbus.$emit(Events.filesOrDirectoriesChanged, {
      // 		machine: connector.hostname,
      // 		files: [payload]
      // 	});
      // }
    },

    // Convert mutations
    // - Mutations do not exist any more. These can be converted to actions instead, or you can just assign directly to the store within your components (eg. userStore.firstName = 'First')
    // - If converting to actions, remove the first state argument and replace any assignments with this instead
    // - A common mutation is to reset the state back to its initial state. This is built in functionality with the store's $reset method. Note that this functionality only exists for option stores.
    /**
     * Mark a file as being modified to
     * @param state Vuex state
     * @param filename Name of the file being modified
     */
    addFileBeingChanged(filename: string) {
      let machineName = useRootStore().selectedMachine
      this[machineName].filesBeingChanged.push(filename)
    },
    /**
     * Clear the list of files being changed
     * @param state Vuex state
     */
    clearFilesBeingChanged() {
      let machineName = useRootStore().selectedMachine
      this[machineName].filesBeingChanged = []
    },

    /**
     * Set the CAN address of the current board being updated
     * @param state Vuex state
     * @param board Current board being updated
     */
    setBoardBeingUpdated(board: number) {
      let machineName = useRootStore().selectedMachine
      this[machineName].boardBeingUpdated = board
    },

    /**
     * Set the list of board CAN addresses being updated
     * @param state Vuex state
     * @param boards List of board indices being updated
     */
    setBoardsBeingUpdated(boards: Array<number>) {
      let machineName = useRootStore().selectedMachine
      this[machineName].boardsBeingUpdated = boards
    },

    /**
     * Flag if multiple files are being transferred
     * @param state Vuex state
     * @param transferring Whether multiple files are being transferred
     */
    setMultiFileTransfer(transferring: boolean) {
      let machineName = useRootStore().selectedMachine
      this[machineName].transferringFiles = transferring
    },

    /**
     * Clear all logged events
     * @param state Vuex state
     */
    clearLog() {
      let machineName = useRootStore().selectedMachine
      this[machineName].events = []
    },

    /**
     * Log a custom event
     * @param state Vuex state
     * @param payload Machine event to log
     */
    log(payload: MachineEvent, hostname?: string) {
      let machineName = hostname ?? useRootStore().selectedMachine
      this[machineName].events.push(payload)
    },

    /**
     * Flag if the machine is attempting to reconnect
     * @param state Vuex state
     * @param reconnecting Whether the machine is attempting to reconnect
     */
    setReconnecting(reconnecting: boolean) {
      let machineName = useRootStore().selectedMachine
      this[machineName].isReconnecting = reconnecting
    },

    /**
     * Load a DWC plugin from this machine
     * @param context Action context
     * @param payload Action payload
     * @param payload.id Plugin identifier
     * @param payload.saveSettings Save settings (including enabled plugins) when the plugin has been successfully loaded
     */
    async loadDwcPlugin({ id, saveSettings }: { id: string; saveSettings: boolean }) {
      let machineName = useRootStore().selectedMachine
      console.log('todo connector')
      // if (connector === null) { throw new OperationFailedError("loadDwcPlugin is not available in default machine module"); }

      let rootStore = useRootStore()
      let settingsStore = useSettingsStore()
      let machinesModelStore = useMachinesModelStore()
      let machinesCacheStores = useMachinesCacheStore()

      // Don't load a DWC plugin twice
      if (rootStore.loadedDwcPlugins.includes(id)) {
        return
      }

      // Get the plugin
      const plugin = machinesModelStore[machineName].plugins.get(id)

      if (!plugin) {
        throw new Error(`Plugin ${id} not found`)
      }

      // Check if there are any resources to load and if it is actually possible
      if (!plugin.dwcFiles.some((file) => file.indexOf(plugin.id) !== -1 && /\.js$/.test(file))) {
        return
      }

      // Check if the requested webpack chunk is already part of a built-in plugin
      if (Plugins.some((item) => item.id === plugin.id)) {
        throw new Error(
          `Plugin ${id} cannot be loaded because the requested Webpack file is already reserved by a built-in plugin`,
        )
      }

      // Check if the corresponding SBC plugin has been loaded (if applicable)
      if (plugin.sbcRequired) {
        if (
          !machinesModelStore[machineName].sbc ||
          (plugin.sbcDsfVersion &&
            !checkVersion(plugin.sbcDsfVersion, machinesModelStore[machineName].sbc.dsf.version))
        ) {
          throw new Error(
            `Plugin ${id} cannot be loaded because the current machine does not have an SBC attached`,
          )
        }
      }

      // Is the plugin compatible to the running DWC version?
      if (plugin.dwcVersion && !checkVersion(plugin.dwcVersion, packageInfo.version)) {
        throw new Error(
          `Plugin ${id} requires incompatible DWC version (need ${plugin.dwcVersion}, got ${packageInfo.version})`,
        )
      }

      // Load plugin dependencies in DWC
      for (const dependency of plugin.dwcDependencies) {
        const dependentPlugin = machinesModelStore[machineName].plugins.get(dependency)
        if (!dependentPlugin) {
          throw new Error(
            `Failed to find DWC plugin dependency ${dependency} for plugin ${plugin.id}`,
          )
        }

        if (!rootStore.loadedDwcPlugins.includes(dependency)) {
          await rootStore.loadDwcPlugin({ id: dependency, saveSettings: false })
        }
      }

      // Load the required web module
      if (process.env.NODE_ENV === 'production') {
        await loadDwcResources(plugin)
      } else {
        console.warn(
          `Cannot load DWC chunks of plugin ${plugin.id}. External JavaScript chunks are only supported in production mode`,
        )
      }

      // DWC plugin has been loaded
      rootStore.dwcPluginLoaded(plugin.id)
      if (saveSettings) {
        settingsStore.dwcPluginLoaded(plugin.id)
      }
    },

    /**
     * Unload a DWC plugin. This does not remove running code but marks the plugin to be skipped upon reload
     * @param context Action context
     * @param plugin Identifier of the plugin to unload
     */
    async unloadDwcPlugin(plugin: string) {
      let machineName = useRootStore().selectedMachine
      let settingsStore = useSettingsStore()

      settingsStore.disableDwcPlugin(plugin)
      await settingsStore.save(machineName)
    },
  },
})
