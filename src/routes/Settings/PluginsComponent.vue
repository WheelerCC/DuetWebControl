<template>
  <div>
    <Table v-show="plugins.length > 0">
      <TableHeader>
        <TableRow>
          <TableHead class="text-left">
            {{ $t('tabs.plugins.headers.name') }}
          </TableHead>
          <TableHead class="text-left">
            {{ $t('tabs.plugins.headers.author') }}
          </TableHead>
          <TableHead class="text-left">
            {{ $t('tabs.plugins.headers.version') }}
          </TableHead>
          <TableHead class="text-left">
            {{ $t('tabs.plugins.headers.license') }}
          </TableHead>
          <TableHead class="text-left">
            {{ $t('tabs.plugins.headers.dependencies') }}
          </TableHead>
          <TableHead class="text-left">
            {{ $t('tabs.plugins.headers.status') }}
          </TableHead>
          <TableHead colspan="2">
            <UploadBtn ref="mainUpload" class="w-full mb-1" :target="UploadType.plugin" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="plugin in plugins" :key="plugin.id">
          <TableCell :title="plugin.id">
            {{ plugin.name }}
            <Badge v-if="isIntegratedPlugin(plugin)">
              {{ $t('tabs.plugins.builtIn') }}
            </Badge>
          </TableCell>
          <TableCell>
            {{ plugin.author }}
          </TableCell>
          <TableCell>
            {{ plugin.version }}
          </TableCell>
          <TableCell>
            {{ plugin.license }}
          </TableCell>
          <TableCell>
            {{ getPluginDependencies(plugin) }}
          </TableCell>
          <TableCell>
            {{ getPluginStatus(plugin) }}
          </TableCell>
          <TableCell class="no-wrap">
            <Button
              v-if="!isPluginStarted(plugin)"
              color="success"
              :disabled="!canStartPlugin(plugin) || loadingDwcPlugins"
              :loading="isPluginBusy(plugin)"
              @click="startPlugin(plugin)"
            >
              <Play />
              {{ $t('tabs.plugins.start') }}
            </Button>
            <Button
              v-else
              color="warning"
              :disabled="!canStopPlugin(plugin) || loadingDwcPlugins"
              :loading="isPluginBusy(plugin)"
              @click="stopPlugin(plugin)"
            >
              <Square />
              {{ $t('tabs.plugins.stop') }}
            </Button>
          </TableCell>
          <TableCell class="pl-0 no-wrap">
            <Button
              color="primary"
              class="px-3"
              :disabled="!canUninstallPlugin(plugin)"
              :loading="isPluginBusy(plugin)"
              @click="doUninstallPlugin(plugin)"
            >
              <Trash />
              {{ $t('tabs.plugins.uninstall') }}
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <Alert :value="plugins.length === 0" type="info" class="text-left ma-0" @contextmenu.prevent="">
      {{ $t('tabs.plugins.noPlugins') }}
    </Alert>

    <Alert :value="dwcPluginsUnloaded" type="info" class="text-left ma-0" @contextmenu.prevent="">
      {{ $t('tabs.plugins.refreshNote') }}
      <Button text small class="float-right" @click="reloadDwc">
        <v-icon small class="mr-1"> mdi-refresh </v-icon>
        {{ $t('tabs.plugins.refreshNow') }}
      </Button>
    </Alert>
  </div>
</template>

<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plugin, PluginManifest } from '@duet3d/objectmodel'

import packageInfo from '@/../package.json'

import Plugins from '@/plugins'

import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { useMachinesSettingsStore } from '@/stores/machineSettings'
import { useSettingsStore } from '@/stores/settings'
import { getErrorMessage } from '@/utils/errors'
import { LogType } from '@/utils/logging'

import DwcPlugin from '@/plugins/DwcPlugin'
import { makeNotification } from '@/utils/notifications'
import { computed, defineComponent, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Play, Square, Trash } from 'lucide-vue-next'
import { Badge } from '@/components/ui/badge'
import UploadBtn, { UploadType } from '@/components/buttons/UploadBtn.vue'

let dwcPluginsUnloaded = ref(false)
let busyPlugins = ref<string[]>([])

let { t } = useI18n()
let { loadingDwcPlugins, loadedDwcPlugins } = storeToRefs(useRootStore())
let { plugins: _plugins } = storeToRefs(useMachinesModelStore())
let { enabledPlugins } = storeToRefs(useSettingsStore())
let { enabledPlugins: machineEnabledPlugins } = storeToRefs(useMachinesSettingsStore())

let plugins = computed(() => {
  const plugins: (Plugin | DwcPlugin)[] = [...Plugins]
  for (const plugin of _plugins.value.values()) {
    if (plugin !== null) {
      plugins.push(plugin as Plugin)
    }
  }
  return plugins
})

function isDwcPlugin(plugin: PluginManifest) {
  return !_plugins.value.has(plugin.id) || plugin.dwcVersion != null
}
function isDsfPlugin(plugin: PluginManifest) {
  return plugin.sbcDsfVersion != null
}
function isRrfPlugin(plugin: PluginManifest) {
  return plugin.rrfVersion != null
}
function isIntegratedPlugin(plugin: PluginManifest) {
  return !_plugins.value.has(plugin.id)
}
function isPluginBusy(plugin: PluginManifest) {
  return busyPlugins.value.includes(plugin.id)
}
function getPluginDependencies(plugin: PluginManifest) {
  let result: string[] = [] // todo correctly type
  if (!_plugins.value.has(plugin.id)) {
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
  return result.length > 0 ? result.join(', ') : t('generic.noValue')
}
function getPluginStatus(plugin: PluginManifest) {
  if (!_plugins.value.has(plugin.id)) {
    if (loadedDwcPlugins.value.includes(plugin.id)) {
      const enabled =
        enabledPlugins.value.includes(plugin.id) || enabledPlugins.value.includes(plugin.name)
      return t(enabled ? 'tabs.plugins.started' : 'tabs.plugins.deactivated')
    }
    return t('tabs.plugins.stopped')
  }

  if (useMachinesModelStore().sbc && plugin.sbcExecutable) {
    const externalPlugin = _plugins.value.get(plugin.id)!
    if (
      externalPlugin.pid > 0 &&
      (!plugin.dwcVersion || enabledPlugins.value.includes(plugin.id))
    ) {
      return t('tabs.plugins.started')
    }
    if (plugin.dwcVersion) {
      if (externalPlugin.pid >= 0 != machineEnabledPlugins.value.includes(plugin.id)) {
        return t('tabs.plugins.partiallyStarted')
      }
      if (loadedDwcPlugins.value.includes(plugin.id)) {
        return t('tabs.plugins.deactivated')
      }
    }
    return t('tabs.plugins.stopped')
  } else if (plugin.dwcVersion && loadedDwcPlugins.value.includes(plugin.id)) {
    return enabledPlugins.value.includes(plugin.id)
      ? t('tabs.plugins.started')
      : t('tabs.plugins.deactivated')
  }
  return t('tabs.plugins.installed')
}
function isPluginStarted(plugin: PluginManifest) {
  if (!_plugins.value.has(plugin.id)) {
    return loadedDwcPlugins.value.includes(plugin.id)
  }

  const externalPlugin = _plugins.value.get(plugin.id)!
  return externalPlugin.pid > 0 || loadedDwcPlugins.value.includes(plugin.id)
}
function canStartPlugin(plugin: PluginManifest) {
  if (!_plugins.value.has(plugin.id)) {
    return true
  }
  return (plugin.sbcExecutable && plugin.sbcDsfVersion) || plugin.dwcVersion
}
function canStopPlugin(plugin: PluginManifest) {
  if (!_plugins.value.has(plugin.id)) {
    return enabledPlugins.value.includes(plugin.id) || enabledPlugins.value.includes(plugin.name)
  }

  const externalPlugin = _plugins.value.get(plugin.id)!
  return externalPlugin.pid > 0 || enabledPlugins.value.includes(plugin.id)
}
function canUninstallPlugin(plugin: PluginManifest) {
  if (!_plugins.value.has(plugin.id)) {
    return false
  }

  const externalPlugin = _plugins.value.get(plugin.id)!
  return externalPlugin.pid <= 0 && !loadedDwcPlugins.value.includes(plugin.id)
}
async function startPlugin(plugin: PluginManifest) {
  if (!_plugins.value.has(plugin.id)) {
    busyPlugins.value.push(plugin.id)
    try {
      try {
        // Load DWC resources
        await useRootStore().loadDwcPlugin({
          id: plugin.id,
          saveSettings: true,
        })

        // Display a message
        makeNotification(LogType.success, t('notification.plugins.started'))
      } catch (e) {
        alert(e)
        throw e
      }
    } finally {
      busyPlugins.value = busyPlugins.value.filter((item) => item != plugin.id)
    }
  } else {
    busyPlugins.value.push(plugin.id)
    try {
      try {
        // Start the plugin on the SBC
        const externalPlugin = _plugins.value.get(plugin.id)!
        if (plugin.sbcExecutable && externalPlugin.pid <= 0) {
          await useMachinesStore().startSbcPlugin(plugin.id)
        }

        // Load DWC resources
        if (plugin.dwcVersion && !loadedDwcPlugins.value.some((item) => item === plugin.id)) {
          await useMachinesStore().loadDwcPlugin({
            id: plugin.id,
            saveSettings: true,
          })
        }

        // Display a message
        makeNotification(LogType.success, t('notification.plugins.started'))
      } catch (e) {
        makeNotification(LogType.error, t('notification.plugins.startError'), getErrorMessage(e))
        throw e
      }
    } finally {
      busyPlugins.value = busyPlugins.value.filter((item) => item != plugin.id)
    }
  }
}
async function stopPlugin(plugin: Plugin | DwcPlugin) {
  if (!_plugins.value.has(plugin.id)) {
    if (!(await useRootStore().unloadDwcPlugin(plugin.id))) {
      await useRootStore().unloadDwcPlugin(plugin.name)
    }
    dwcPluginsUnloaded.value = true
  } else {
    busyPlugins.value.push(plugin.id)
    try {
      // Stop the plugin on the SBC (if needed)
      const externalPlugin = _plugins.value.get(plugin.id)!
      if (plugin.sbcExecutable && externalPlugin.pid > 0) {
        try {
          await useMachinesStore().stopSbcPlugin(plugin.id)
          makeNotification(LogType.success, t('notification.plugins.stopped'))
        } catch (e) {
          makeNotification(LogType.error, t('notification.plugins.stopError'), getErrorMessage(e))
          throw e
        }
      }

      // Remove the plugin from the auto load list and tell the user to reload DWC
      if (loadedDwcPlugins.value.includes(plugin.id)) {
        useMachinesStore().unloadDwcPlugin(plugin.id)
        dwcPluginsUnloaded.value = true
      }
    } finally {
      busyPlugins.value = busyPlugins.value.filter((item) => item != plugin.id)
    }
  }
}
async function doUninstallPlugin(plugin: Plugin | DwcPlugin) {
  busyPlugins.value.push(plugin.id)
  try {
    try {
      if (plugin instanceof DwcPlugin) {
        throw new Error('Cannot uninstall a dwc plugin')
      }
      // Uninstall the plugin
      await useMachinesStore().uninstallPlugin(plugin)

      // Display a message
      makeNotification(LogType.success, t('notification.plugins.uninstalled'))
    } catch (e) {
      makeNotification(LogType.error, t('notification.plugins.uninstallError'), getErrorMessage(e))
      throw e
    }
  } finally {
    busyPlugins.value = busyPlugins.value.filter((item) => item != plugin.id)
  }
}
function reloadDwc() {
  location.reload()
}
</script>
