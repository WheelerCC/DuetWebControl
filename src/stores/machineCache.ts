import { GCodeFileInfo } from '@duet3d/objectmodel'

import { FileNotFoundError } from '@/utils/errors'
import { getLocalSetting, removeLocalSetting, setLocalSetting } from '@/utils/localStorage'
import patch from '@/utils/patch'

import { defineStore } from 'pinia'
import { useRootStore } from '.'
import { useMachinesStore } from './machines'
import { defaultMachine } from './misc'
import { useSettingsStore } from './settings'
import { equals, extractDirectory, pathObj } from '@/utils/path'

export interface MachineCacheState {
  /**
   * Last codes sent to this machine
   */
  lastSentCodes: Array<string>

  /**
   * Record of G-code file name vs info
   */
  fileInfos: Record<string, GCodeFileInfo>

  /**
   * Sorting of the different tables
   */
  sorting: Record<string, { column: string; descending: boolean }>

  /**
   * Custom plugin cache fields
   */
  plugins: Record<string, any>
}

/**
 * Default cache fields defined by third-party plugins
 */
export const defaultPluginCacheFields: Record<string, any> = {}

export const useMachinesCacheStore = defineStore('machinesCache', {
  state: (): Record<string, MachineCacheState> => ({
    [defaultMachine]: {
      lastSentCodes: ['M0', 'M1', 'M84'],
      fileInfos: {},
      sorting: {
        events: {
          column: 'date',
          descending: true,
        },
        filaments: {
          column: 'name',
          descending: false,
        },
        jobs: {
          column: 'lastModified',
          descending: true,
        },
        macros: {
          column: 'name',
          descending: false,
        },
        menu: {
          column: 'name',
          descending: false,
        },
        sys: {
          column: 'name',
          descending: false,
        },
      },
      plugins: Object.assign({}, defaultPluginCacheFields),
    },
  }),
  getters: {
    // Remove any getters that return state under the same name (eg. firstName: (state) => state.firstName), these are not necessary as you can access any state directly from the store instance
    // If you need to access other getters, they are on this instead of using the second argument. Remember that if you are using this then you will have to use a regular function instead of an arrow function. Also note that you will need to specify a return type because of TS limitations, see here for more details
    // If using rootState or rootGetters arguments, replace them by importing the other store directly, or if they still exist in Vuex then access them directly from Vuex
    lastSentCodes: (state) => state[useRootStore().selectedMachine].lastSentCodes,
    fileInfos: (state) => state[useRootStore().selectedMachine].fileInfos,
    sorting: (state) => state[useRootStore().selectedMachine].sorting,
    plugins: (state) => state[useRootStore().selectedMachine].plugins,
  },
  actions: {
    // Convert actions
    // Remove the first context argument from each action. Everything should be accessible from this instead
    // If using other stores either import them directly or access them on Vuex, the same as for getters
    async load() {
      let machineName = useRootStore().selectedMachine
      // if (!connector) {
      // 	return;
      // }

      let cache
      let settingsStore = useSettingsStore()
      let machines = useMachinesStore()

      if (settingsStore.cacheStorageLocal) {
        cache = getLocalSetting(`cache/${machineName}`)
      } else {
        try {
          cache = await machines.download(
            {
              filename: pathObj.dwcCacheFile,
              showProgress: false,
              showSuccess: false,
              showError: false,
            },
            machineName,
          )
        } catch (e) {
          if (!(e instanceof FileNotFoundError)) {
            throw e
          }
        }

        if (!cache) {
          try {
            cache = await machines.download(
              {
                filename: pathObj.legacyDwcCacheFile,
                showProgress: false,
                showSuccess: false,
                showError: false,
              },
              machineName,
            )
            await machines.delete(pathObj.legacyDwcCacheFile, machineName)
          } catch (e) {
            if (!(e instanceof FileNotFoundError)) {
              throw e
            }
          }
        }
      }

      if (cache) {
        this.mutLoad(cache)
      }
    },
    save(machineName: string) {
      // if (!connector) {
      // 	return;
      // }

      let settings = useSettingsStore()
      let machines = useMachinesStore()

      if (settings.cacheStorageLocal) {
        // If localStorage is full and the cache cannot be saved, clear file infos and try again
        if (!setLocalSetting(`cache/${machineName}`, this[machineName])) {
          this.clearFileInfo(machineName)
          setLocalSetting(`cache/${machineName}`, this[machineName])
        }
      } else {
        removeLocalSetting(`cache/${machineName}`)

        try {
          const content = new Blob([JSON.stringify(this[machineName])])
          machines.upload(
            {
              filename: pathObj.dwcCacheFile,
              content,
              showProgress: false,
              showSuccess: false,
              showError: false,
            },
            machineName,
          )
        } catch (e) {
          // handled before we get here
        }
      }
    },

    // Convert mutations
    // - Mutations do not exist any more. These can be converted to actions instead, or you can just assign directly to the store within your components (eg. userStore.firstName = 'First')
    // - If converting to actions, remove the first state argument and replace any assignments with this instead
    // - A common mutation is to reset the state back to its initial state. This is built in functionality with the store's $reset method. Note that this functionality only exists for option stores.
    mutLoad(content: any) {
      return patch(this, content)
    },
    addLastSentCode(code: string) {
      let machineName = useRootStore().selectedMachine
      this[machineName].lastSentCodes = this[machineName].lastSentCodes.filter(
        (item) => item !== code,
      )
      this[machineName].lastSentCodes.push(code)
    },
    removeLastSentCode(code: string) {
      let machineName = useRootStore().selectedMachine
      this[machineName].lastSentCodes = this[machineName].lastSentCodes.filter(
        (item) => item !== code,
      )
    },

    setFileInfo({ filename, fileInfo }: { filename: string; fileInfo: GCodeFileInfo }) {
      this[useRootStore().selectedMachine].fileInfos[filename] = fileInfo
    },
    clearFileInfo(fileOrDirectory?: string) {
      let machineName = useRootStore().selectedMachine
      if (fileOrDirectory) {
        if (this[machineName].fileInfos[fileOrDirectory] !== undefined) {
          // Delete specific item
          delete this[machineName].fileInfos[fileOrDirectory]
        } else {
          // Delete directory items
          for (let filename in this[machineName].fileInfos) {
            if (equals(fileOrDirectory, extractDirectory(filename))) {
              delete this[machineName].fileInfos[filename]
            }
          }
        }
      } else {
        // Reset everything
        this[machineName].fileInfos = {}
      }
    },

    setSorting({
      table,
      column,
      descending,
    }: {
      table: string
      column: string
      descending: boolean
    }) {
      this.sorting[table].column = column
      this.sorting[table].descending = descending
    },

    registerPluginData(
      { plugin, key, defaultValue }: { plugin: string; key: string; defaultValue: any },
      _machineName?: string,
    ) {
      let machineName = _machineName ?? useRootStore().selectedMachine

      console.log('todo')
      // if (connector === null) {
      // 	if (!(plugin in defaultPluginCacheFields)) {
      // 		defaultPluginCacheFields[plugin] = {}
      // 	}
      // 	defaultPluginCacheFields[plugin][key] = defaultValue;
      // }

      if (this[machineName].plugins[plugin] === undefined) {
        this[machineName].plugins[plugin] = {}
      }
      if (!(key in this[machineName].plugins[plugin])) {
        this[machineName].plugins[plugin][key] = defaultValue
      }
    },

    setPluginData({ plugin, key, value }: { plugin: string; key: string; value: any }) {
      if (this.plugins[plugin] === undefined) {
        this.plugins[plugin] = { key: value }
      }
      this.plugins[plugin][key] = value
    },
  },
})
