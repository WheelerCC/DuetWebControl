<template>
  <div>
    <v-simple-table v-show="plugins.length > 0">
      <template #default>
        <thead>
          <tr>
            <th class="text-left">
              {{ $t('tabs.plugins.headers.name') }}
            </th>
            <th class="text-left">
              {{ $t('tabs.plugins.headers.author') }}
            </th>
            <th class="text-left">
              {{ $t('tabs.plugins.headers.version') }}
            </th>
            <th class="text-left">
              {{ $t('tabs.plugins.headers.license') }}
            </th>
            <th class="text-left">
              {{ $t('tabs.plugins.headers.dependencies') }}
            </th>
            <th class="text-left">
              {{ $t('tabs.plugins.headers.status') }}
            </th>
            <th width="1%" class="no-wrap" colspan="2">
              <upload-btn ref="mainUpload" :elevation="1" color="primary" target="plugin" block />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="plugin in plugins" :key="plugin.id">
            <td :title="plugin.id">
              {{ plugin.name }}
              <v-chip v-if="isIntegratedPlugin(plugin)" small class="ml-1">
                {{ $t('tabs.plugins.builtIn') }}
              </v-chip>
            </td>
            <td>
              {{ plugin.author }}
            </td>
            <td>
              {{ plugin.version }}
            </td>
            <td>
              {{ plugin.license }}
            </td>
            <td>
              {{ getPluginDependencies(plugin) }}
            </td>
            <td>
              {{ getPluginStatus(plugin) }}
            </td>
            <td class="no-wrap">
              <v-btn
                v-if="!isPluginStarted(plugin)"
                color="success"
                :disabled="!canStartPlugin(plugin) || loadingDwcPlugins"
                :loading="isPluginBusy(plugin)"
                @click="startPlugin(plugin)"
              >
                <v-icon class="mr-1"> mdi-play </v-icon>
                {{ $t('tabs.plugins.start') }}
              </v-btn>
              <v-btn
                v-else
                color="warning"
                :disabled="!canStopPlugin(plugin) || loadingDwcPlugins"
                :loading="isPluginBusy(plugin)"
                @click="stopPlugin(plugin)"
              >
                <v-icon class="mr-1"> mdi-stop </v-icon>
                {{ $t('tabs.plugins.stop') }}
              </v-btn>
            </td>
            <td class="pl-0 no-wrap">
              <v-btn
                color="primary"
                class="px-3"
                :disabled="!canUninstallPlugin(plugin)"
                :loading="isPluginBusy(plugin)"
                @click="doUninstallPlugin(plugin)"
              >
                <v-icon class="mr-1"> mdi-delete </v-icon>
                {{ $t('tabs.plugins.uninstall') }}
              </v-btn>
            </td>
          </tr>
        </tbody>
      </template>
    </v-simple-table>

    <v-alert
      :value="plugins.length === 0"
      type="info"
      class="text-left ma-0"
      @contextmenu.prevent=""
    >
      {{ $t('tabs.plugins.noPlugins') }}
    </v-alert>

    <v-alert :value="dwcPluginsUnloaded" type="info" class="text-left ma-0" @contextmenu.prevent="">
      {{ $t('tabs.plugins.refreshNote') }}
      <v-btn text small class="float-right" @click="reloadDwc">
        <v-icon small class="mr-1"> mdi-refresh </v-icon>
        {{ $t('tabs.plugins.refreshNow') }}
      </v-btn>
    </v-alert>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { Plugin, PluginManifest } from '@duet3d/objectmodel'

import packageInfo from '@/../package.json'

import Plugins from '@/plugins'

import { LogType } from '@/utils/logging'
import { getErrorMessage } from '@/utils/errors'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesSettingsStore } from '@/stores/machineSettings'
import { useRootStore } from '@/stores'
import { useSettingsStore } from '@/stores/settings'
import { useMachinesStore } from '@/stores/machines'

import { defineComponent } from 'vue'
import { makeNotification } from '@/utils/notifications'
import DwcPlugin from '@/plugins/DwcPlugin'

export default defineComponent({
  data() {
    return {
      dwcPluginsUnloaded: false,
      busyPlugins: new Array<string>(),
    }
  },
  computed: {
    plugins: () => {
      const plugins: (Plugin | DwcPlugin)[] = [...Plugins]
      for (const plugin of useMachinesModelStore().plugins.values()) {
        if (plugin !== null) {
          plugins.push(plugin)
        }
      }
      return plugins
    },
    loadingDwcPlugins(): boolean {
      return useRootStore().loadingDwcPlugins
    },
  },
  methods: {
    isDwcPlugin(plugin: PluginManifest) {
      return !useMachinesModelStore().plugins.has(plugin.id) || plugin.dwcVersion != null
    },
    isDsfPlugin(plugin: PluginManifest) {
      return plugin.sbcDsfVersion != null
    },
    isRrfPlugin(plugin: PluginManifest) {
      return plugin.rrfVersion != null
    },
    isIntegratedPlugin(plugin: PluginManifest) {
      return !useMachinesModelStore().plugins.has(plugin.id)
    },
    isPluginBusy(plugin: PluginManifest) {
      return this.busyPlugins.includes(plugin.id)
    },
    getPluginDependencies(plugin: PluginManifest) {
      let result: string[] = [] // todo correctly type
      if (!useMachinesModelStore().plugins.has(plugin.id)) {
        result.push(`DWC ${packageInfo.version}`)
      } else if (plugin.dwcVersion) {
        result.push(`DWC ${plugin.dwcVersion}`)
      }
      if (plugin.sbcDsfVersion) {
        result.push(`DSF ${plugin.sbcDsfVersion}`)
      }
      if (plugin.rrfVersion) {
        result.push(`RRF ${plugin.rrfVersion}`)
      }
      return result.length > 0 ? result.join(', ') : this.$t('generic.noValue')
    },
    getPluginStatus(plugin: PluginManifest) {
      if (!useMachinesModelStore().plugins.has(plugin.id)) {
        if (useRootStore().loadedDwcPlugins.includes(plugin.id)) {
          const enabled =
            useSettingsStore().enabledPlugins.includes(plugin.id) ||
            useSettingsStore().enabledPlugins.includes(plugin.name)
          return this.$t(enabled ? 'tabs.plugins.started' : 'tabs.plugins.deactivated')
        }
        return this.$t('tabs.plugins.stopped')
      }

      if (useMachinesModelStore().sbc && plugin.sbcExecutable) {
        const externalPlugin = useMachinesModelStore().plugins.get(plugin.id)!
        if (
          externalPlugin.pid > 0 &&
          (!plugin.dwcVersion || useSettingsStore().enabledPlugins.includes(plugin.id))
        ) {
          return this.$t('tabs.plugins.started')
        }
        if (plugin.dwcVersion) {
          if (
            externalPlugin.pid >= 0 !=
            useMachinesSettingsStore().enabledPlugins.includes(plugin.id)
          ) {
            return this.$t('tabs.plugins.partiallyStarted')
          }
          if (useRootStore().loadedDwcPlugins.includes(plugin.id)) {
            return this.$t('tabs.plugins.deactivated')
          }
        }
        return this.$t('tabs.plugins.stopped')
      } else if (plugin.dwcVersion && useRootStore().loadedDwcPlugins.includes(plugin.id)) {
        return useSettingsStore().enabledPlugins.includes(plugin.id)
          ? this.$t('tabs.plugins.started')
          : this.$t('tabs.plugins.deactivated')
      }
      return this.$t('tabs.plugins.installed')
    },
    isPluginStarted(plugin: PluginManifest) {
      if (!useMachinesModelStore().plugins.has(plugin.id)) {
        return useRootStore().loadedDwcPlugins.includes(plugin.id)
      }

      const externalPlugin = useMachinesModelStore().plugins.get(plugin.id)!
      return externalPlugin.pid > 0 || useRootStore().loadedDwcPlugins.includes(plugin.id)
    },
    canStartPlugin(plugin: PluginManifest) {
      if (!useMachinesModelStore().plugins.has(plugin.id)) {
        return true
      }
      return (plugin.sbcExecutable && plugin.sbcDsfVersion) || plugin.dwcVersion
    },
    canStopPlugin(plugin: PluginManifest) {
      if (!useMachinesModelStore().plugins.has(plugin.id)) {
        return (
          useSettingsStore().enabledPlugins.includes(plugin.id) ||
          useSettingsStore().enabledPlugins.includes(plugin.name)
        )
      }

      const externalPlugin = useMachinesModelStore().plugins.get(plugin.id)!
      return externalPlugin.pid > 0 || useSettingsStore().enabledPlugins.includes(plugin.id)
    },
    canUninstallPlugin(plugin: PluginManifest) {
      if (!useMachinesModelStore().plugins.has(plugin.id)) {
        return false
      }

      const externalPlugin = useMachinesModelStore().plugins.get(plugin.id)!
      return externalPlugin.pid <= 0 && !useRootStore().loadedDwcPlugins.includes(plugin.id)
    },
    async startPlugin(plugin: PluginManifest) {
      if (!useMachinesModelStore().plugins.has(plugin.id)) {
        this.busyPlugins.push(plugin.id)
        try {
          try {
            // Load DWC resources
            await useRootStore().loadDwcPlugin({
              id: plugin.id,
              saveSettings: true,
            })

            // Display a message
            makeNotification(LogType.success, this.$t('notification.plugins.started'))
          } catch (e) {
            alert(e)
            throw e
          }
        } finally {
          this.busyPlugins = this.busyPlugins.filter((item) => item != plugin.id)
        }
      } else {
        this.busyPlugins.push(plugin.id)
        try {
          try {
            // Start the plugin on the SBC
            const externalPlugin = useMachinesModelStore().plugins.get(plugin.id)!
            if (plugin.sbcExecutable && externalPlugin.pid <= 0) {
              await useMachinesStore().startSbcPlugin(plugin.id)
            }

            // Load DWC resources
            if (
              plugin.dwcVersion &&
              !useRootStore().loadedDwcPlugins.some((item) => item === plugin.id)
            ) {
              await useMachinesStore().loadDwcPlugin({
                id: plugin.id,
                saveSettings: true,
              })
            }

            // Display a message
            makeNotification(LogType.success, this.$t('notification.plugins.started'))
          } catch (e) {
            makeNotification(
              LogType.error,
              this.$t('notification.plugins.startError'),
              getErrorMessage(e),
            )
            throw e
          }
        } finally {
          this.busyPlugins = this.busyPlugins.filter((item) => item != plugin.id)
        }
      }
    },
    async stopPlugin(plugin: Plugin | DwcPlugin) {
      if (!useMachinesModelStore().plugins.has(plugin.id)) {
        if (!(await useRootStore().unloadDwcPlugin(plugin.id))) {
          await useRootStore().unloadDwcPlugin(plugin.name)
        }
        this.dwcPluginsUnloaded = true
      } else {
        this.busyPlugins.push(plugin.id)
        try {
          // Stop the plugin on the SBC (if needed)
          const externalPlugin = useMachinesModelStore().plugins.get(plugin.id)!
          if (plugin.sbcExecutable && externalPlugin.pid > 0) {
            try {
              await useMachinesStore().stopSbcPlugin(plugin.id)
              makeNotification(LogType.success, this.$t('notification.plugins.stopped'))
            } catch (e) {
              makeNotification(
                LogType.error,
                this.$t('notification.plugins.stopError'),
                getErrorMessage(e),
              )
              throw e
            }
          }

          // Remove the plugin from the auto load list and tell the user to reload DWC
          if (useRootStore().loadedDwcPlugins.includes(plugin.id)) {
            useMachinesStore().unloadDwcPlugin(plugin.id)
            this.dwcPluginsUnloaded = true
          }
        } finally {
          this.busyPlugins = this.busyPlugins.filter((item) => item != plugin.id)
        }
      }
    },
    async doUninstallPlugin(plugin: Plugin | DwcPlugin) {
      this.busyPlugins.push(plugin.id)
      try {
        try {
          if (plugin instanceof DwcPlugin) {
            throw new Error('Cannot uninstall a dwc plugin')
          }
          // Uninstall the plugin
          await useMachinesStore().uninstallPlugin(plugin)

          // Display a message
          makeNotification(LogType.success, this.$t('notification.plugins.uninstalled'))
        } catch (e) {
          makeNotification(
            LogType.error,
            this.$t('notification.plugins.uninstallError'),
            getErrorMessage(e),
          )
          throw e
        }
      } finally {
        this.busyPlugins = this.busyPlugins.filter((item) => item != plugin.id)
      }
    },
    reloadDwc() {
      location.reload()
    },
  },
})
</script>
