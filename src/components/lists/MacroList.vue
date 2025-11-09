<template>
  <Card class="col-span-1 row-span-3">
    <CardHeader>
      <CardTitle class="flex flex-row">
        <FileCode />
        <div>
          {{ $t('list.macro.caption') }}
        </div>
        <div v-show="isConnected" class="ml-auto">
          {{ currentDirectory }}
        </div>
      </CardTitle>
    </CardHeader>
    <!-- <div class="flex flex-col gap-5">
      <div>currentDirectory {{ currentDirectory }}</div>
      <div>isRootDirectory {{ isRootDirectory }}</div>
      <div>directories.macros {{ directories.macros }}</div>
      <div>volumes {{ volumes }}</div>
      <div>filelist {{ filelist }}</div>
    </div> -->

    <CardContent v-show="loading || filelist.length || !isRootDirectory">
      <Progress v-show="loading" :indeterminate="true"></Progress>
      <div class="flex flex-col">
        <div v-if="!isRootDirectory" @click="goUp" class="flex flex-row mb-2">
          <ArrowUp />
          {{ t('list.baseFileList.goUp') }}
        </div>

        <div
          v-for="item in filelist"
          :key="item.name"
          @click="itemClick(item)"
          class="flex flex-row"
        >
          <component :is="item.isDirectory ? Folder : File"></component>

          {{ item.displayName }}

          <v-list-item-action v-if="!item.isDirectory && item.executing">
            <v-progress-circular class="list-icon" indeterminate color="blue" />
          </v-list-item-action>
        </div>
      </div>
    </CardContent>
  </Card>

  <!-- TODO ALERT -->
  <!-- <v-alert :value="!filelist.length" type="info">
    {{ $t('list.macro.noMacros') }}
  </v-alert> -->
</template>

<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { log } from '@/utils/logging'
import { FileListItem } from '@duet3d/connectors'

import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { DisconnectedError, getErrorMessage } from '@/utils/errors'
import Events from '@/utils/events'
import { LogType } from '@/utils/logging'
import {
  combine,
  equals,
  escapeFilename,
  extractDirectory,
  filesAffectDirectory,
  getVolume,
  pathObj,
  startsWith,
  stripMacroFilename,
} from '@/utils/path'

interface MacroItemProperties {
  displayName: string
  executing: boolean
}

type MacroItem = FileListItem & MacroItemProperties

import eventbus from '@/utils/eventbus'
import { ArrowUp, File, FileCode, Folder } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Progress } from '../ui/progress'

let { t } = useI18n()
let loading = ref(false)
let wasMounted = ref(false)
let directory = ref(pathObj.macros)
let filelist = ref<MacroItem[]>([])

watch(filelist, (newVal, oldVal) => {
  console.log('FROM')
  console.log(oldVal)
  console.log('TO')
  console.log(newVal)
})

let { isConnected, uiFrozen, selectedMachine } = storeToRefs(useRootStore())
let { directories, volumes } = storeToRefs(useMachinesModelStore())

let isRootDirectory = computed(() => {
  return equals(directory.value, directories.value.macros)
})

let currentDirectory = computed(() => {
  if (startsWith(directory.value, directories.value.macros)) {
    let subDirectory = directory.value.substring(directories.value.macros.length)
    if (subDirectory.length === 0 || subDirectory[0] === '/') {
      return t('list.macro.root') + (subDirectory === '/' ? '' : subDirectory)
    }
    return t('list.macro.root') + '/' + subDirectory
  }
  return directory.value
})

let macrosDirectory = computed(() => directories.value.macros)

watch(isConnected, (newVal, oldVal) => {
  if (newVal) {
    wasMounted.value = volumes.value.length > 0 && volumes.value[0].mounted
    refresh()
  } else {
    directory.value = pathObj.macros
    filelist.value = []
  }
})

watch(selectedMachine, (newVal, oldVal) => {
  // TODO store current directory per selected machine
  if (isConnected.value) {
    wasMounted.value = volumes.value.length > 0 && volumes.value[0].mounted
    refresh()
  } else {
    directory.value = pathObj.macros
    filelist.value = []
  }
})
watch(volumes, (newVal, oldVal) => {
  if (isConnected.value) {
    const volume = getVolume(directory.value)
    if (volume >= 0 && volume < volumes.value.length) {
      const mounted = volumes.value[volume].mounted
      if (wasMounted.value !== mounted) {
        wasMounted.value = mounted
        refresh()
      }
    } else {
      wasMounted.value = false
      refresh()
    }
  }
})

watch(macrosDirectory, (newVal, oldVal) => {
  if (equals(directory.value, oldVal) || !startsWith(directory.value, newVal)) {
    directory.value = newVal
  }
})

onMounted(() => {
  // Perform initial load
  directory.value = directories.value.macros
  if (isConnected) {
    wasMounted.value = volumes.value.length > 0 && volumes.value[0].mounted
    refresh()
  }

  // Keep track of file changes
  eventbus.$on(Events.filesOrDirectoriesChanged, filesOrDirectoriesChanged)
})

onUnmounted(() => {
  // No longer keep track of file changes
  eventbus.$off(Events.filesOrDirectoriesChanged, filesOrDirectoriesChanged)
})

async function loadDirectory(_directory: string) {
  console.log('loadDirectory')
  console.log(_directory)
  if (loading.value) {
    return
  }

  loading.value = true
  try {
    const files: Array<MacroItem> = (await useMachinesStore().getFileList(_directory)).map(
      (fileListItem) => {
        return {
          ...fileListItem,
          displayName: '',
          executing: false,
        } satisfies MacroItem
      },
    )
    console.log('files')
    console.log(files)

    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    files.sort((a, b) => (a.isDirectory === b.isDirectory ? 0 : a.isDirectory ? -1 : 1))
    for (const item of files) {
      item.displayName = stripMacroFilename(item.name)
      item.executing = false
    }

    directory.value = _directory
    filelist.value = files
  } catch (e) {
    if (!(e instanceof DisconnectedError)) {
      console.warn(e)
      log(LogType.error, t('error.filelistRequestFailed'), getErrorMessage(e))
    }
  }
  loading.value = false
}
async function refresh() {
  await loadDirectory(directory.value)
}
async function itemClick(item: MacroItem) {
  if (uiFrozen.value) {
    return
  }

  const filename = combine(directory.value, item.name)
  if (item.isDirectory) {
    await loadDirectory(filename)
  } else if (!item.executing) {
    item.executing = true
    try {
      await useMachinesStore().sendCode(`M98 P"${escapeFilename(filename)}"`)
    } catch (e) {
      if (!(e instanceof DisconnectedError)) {
        console.warn(e)
      }
    }
    item.executing = false
  }
}
async function goUp() {
  await loadDirectory(extractDirectory(directory.value))
}

function filesOrDirectoriesChanged({
  machine,
  files,
  volume,
}: {
  machine: string
  files?: Array<string>
  volume?: number
}) {
  console.log('filesOrDirectoriesChanged')
  if (
    machine === useRootStore().selectedMachine &&
    ((files !== undefined && filesAffectDirectory(files, directory.value)) ||
      volume === getVolume(directory.value))
  ) {
    // File or directory has been changed in the current directory
    refresh()
  }
}
</script>
