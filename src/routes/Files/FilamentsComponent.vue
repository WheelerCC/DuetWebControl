<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-row gap-2 items-center">
      <DirectoryBreadcrumbs v-model:directory="directory" />
      <ButtonGroup class="ml-auto">
        <ButtonGroup>
          <Button variant="outline" :loading="loading" :disabled="uiFrozen" @click="refresh">
            <RefreshCwIcon /> {{ $t('button.refresh.caption') }}
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button
            variant="outline"
            v-show="isRootDirectory"
            :disabled="uiFrozen"
            @click="showNewFilament = true"
          >
            <CirclePlusIcon /> {{ $t('button.newFilament.caption') }}
          </Button>
          <Button
            variant="outline"
            v-if="!isRootDirectory"
            :disabled="uiFrozen"
            @click="showNewFile = true"
          >
            <FilePlusIcon /> {{ $t('button.newFile.caption') }}
          </Button>

          <UploadBtn :directory="directory" :target="UploadType.filaments" />
        </ButtonGroup>
      </ButtonGroup>
    </div>

    <BaseFileList
      class="w-full"
      ref="_filelist"
      v-model:directory="directory"
      v-model:selection="selection"
      v-model:loading="loading"
      :columns="defaultColumns"
      :folder-icon="isRootDirectory ? 'mdi-radiobox-marked' : 'mdi-folder'"
      :doing-file-operation="doingFileOperation"
      sort-table="filaments"
      :no-delete="filamentLoaded"
      :no-rename="filamentLoaded"
      no-drag-drop
      :no-files-text="isRootDirectory ? 'list.filament.noFilaments' : 'list.baseFileList.noFiles'"
      @fileClicked="fileClicked"
    >
      <!-- <template #context-menu>
        <v-list-item v-show="filamentSelected" @click="download()">
          <v-icon class="mr-1"> mdi-cloud-download </v-icon>
          {{ $t('list.baseFileList.downloadZIP') }}
        </v-list-item>
        <v-list-item v-show="filamentSelected" @click="duplicate()">
          <v-icon class="mr-1"> mdi-content-duplicate </v-icon> {{ $t('list.filament.duplicate') }}
        </v-list-item>
      </template> -->
    </BaseFileList>

    <NewDirectoryDialog
      v-model:shown="showNewFilament"
      :directory="directory"
      :title="$t('dialog.newFilament.title')"
      :prompt="$t('dialog.newFilament.prompt')"
      :show-success="false"
      :show-error="false"
      @directoryCreationFailed="directoryCreationFailed"
      @directoryCreated="createFilamentFiles"
    />
    <NewDirectoryDialog
      v-model:shown="showDuplicateFilament"
      :directory="directory"
      :title="$t('dialog.duplicateFilament.title')"
      :prompt="$t('dialog.duplicateFilament.prompt')"
      :show-success="false"
      :show-error="false"
      @directoryCreationFailed="directoryCreationFailed"
      @directoryCreated="duplicateFilamentFiles"
    />
    <NewFileDialog v-model:shown="showNewFile" :directory="directory" />
  </div>
</template>

<script setup lang="ts">
import saveAs from 'file-saver'
import JSZip from 'jszip'

import {
  DisconnectedError,
  FileNotFoundError,
  getErrorMessage,
  OperationCancelledError,
} from '@/utils/errors'
import { LogType } from '@/utils/logging'

import UploadBtn, { UploadType } from '@/components/buttons/UploadBtn.vue'
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'

import NewDirectoryDialog from '@/components/dialogs/NewDirectoryDialog.vue'
import NewFileDialog from '@/components/dialogs/NewFileDialog.vue'
import DirectoryBreadcrumbs from '@/components/misc/DirectoryBreadcrumbs.vue'
import BaseFileList from '@/components/table/BaseFileList.vue'
import { BaseFileListItem, defaultColumns } from '@/components/table/columns'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { makeNotification } from '@/utils/notifications'
import { combine, equals, extractFileName, pathObj, startsWith } from '@/utils/path'
import { CirclePlusIcon, FilePlusIcon, RefreshCwIcon } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

let directory = ref(pathObj.filaments)
let selection = ref<{ name: string; isDir: boolean }[]>([])
let loading = ref(false)
let doingFileOperation = ref(false)
let showNewFile = ref(false)
let showNewFilament = ref(false)
let showDuplicateFilament = ref(false)
let filamentToDuplicate = ref<string | null>(null)
let fab = ref(false)

let { t } = useI18n()
onMounted(() => {
  directory.value = filamentsDirectory.value
})

function directoryCreationFailed(error: any) {
  makeNotification(LogType.error, t('notification.newFilament.errorTitle'), getErrorMessage(error))
}

async function createFilamentFiles(path: string) {
  if (doingFileOperation.value) {
    return
  }

  doingFileOperation.value = true
  try {
    const emptyFile = new Blob()
    await useMachinesStore().upload({
      filename: combine(path, 'load.g'),
      content: emptyFile,
      showSuccess: false,
    })
    await useMachinesStore().upload({
      filename: combine(path, 'config.g'),
      content: emptyFile,
      showSuccess: false,
    })
    await useMachinesStore().upload({
      filename: combine(path, 'unload.g'),
      content: emptyFile,
      showSuccess: false,
    })
    makeNotification(
      LogType.success,
      t('notification.newFilament.successTitle'),
      t('notification.newFilament.successMessage', [extractFileName(path)]),
    )
  } catch (e) {
    console.warn(e)
    makeNotification(
      LogType.error,
      t('notification.newFilament.errorTitleMacros'),
      getErrorMessage(e),
    )
  }
  doingFileOperation.value = false
}

const filelistRef = useTemplateRef('_filelist')

async function refresh() {
  await filelistRef.value?.refresh()
}

async function download() {
  const filament = selection.value[0].name

  // Download the files first
  let loadG, unloadG
  try {
    loadG = await useMachinesStore().download({
      filename: combine(pathObj.filaments, filament, 'load.g'),
      type: 'blob',
      showSuccess: false,
      showError: false,
    })
    unloadG = await useMachinesStore().download({
      filename: combine(pathObj.filaments, filament, 'unload.g'),
      type: 'blob',
      showSuccess: false,
      showError: false,
    })
  } catch (e) {
    if (!(e instanceof DisconnectedError) && !(e instanceof OperationCancelledError)) {
      makeNotification(
        LogType.error,
        t('notification.download.error', [!loadG ? 'load.g' : 'unload.g']),
        getErrorMessage(e),
      )
    }
    return
  }

  let configG
  try {
    configG = await useMachinesStore().download({
      filename: combine(pathObj.filaments, filament, 'config.g'),
      type: 'blob',
      showSuccess: false,
      showError: false,
    })
  } catch (e) {
    // config.g may not exist
    if (
      !(e instanceof DisconnectedError) &&
      !(e instanceof OperationCancelledError) &&
      !(e instanceof FileNotFoundError)
    ) {
      makeNotification(
        LogType.error,
        t('notification.download.error', ['config.g']),
        getErrorMessage(e),
      )
    }
  }

  // Bundle them in a ZIP file and pass it to the user
  const zip = new JSZip()
  zip.file(`${filament}/load.g`, loadG)
  zip.file(`${filament}/unload.g`, unloadG)
  if (configG) {
    zip.file(`${filament}/config.g`, configG)
  }

  try {
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    saveAs(zipBlob, `${filament}.zip`)
  } catch (e) {
    console.warn(e)
    makeNotification(LogType.error, t('notification.compress.errorTitle'), getErrorMessage(e))
  }
}

function duplicate() {
  filamentToDuplicate.value = selection.value[0].name
  showDuplicateFilament.value = true
}

async function duplicateFilamentFiles(path: string) {
  if (doingFileOperation.value) {
    return
  }

  doingFileOperation.value = true
  try {
    // Download the files first
    let loadG, unloadG
    try {
      loadG = await useMachinesStore().download({
        filename: combine(pathObj.filaments, filamentToDuplicate.value, 'load.g'),
        type: 'blob',
        showSuccess: false,
        showError: false,
      })
      unloadG = await useMachinesStore().download({
        filename: combine(pathObj.filaments, filamentToDuplicate.value, 'unload.g'),
        type: 'blob',
        showSuccess: false,
        showError: false,
      })
    } catch (e) {
      if (!(e instanceof DisconnectedError) && !(e instanceof OperationCancelledError)) {
        makeNotification(
          LogType.error,
          t('notification.download.error', [!loadG ? 'load.g' : 'unload.g']),
          getErrorMessage(e),
        )
      }
      return
    }

    let configG
    try {
      configG = await useMachinesStore().download({
        filename: combine(pathObj.filaments, filamentToDuplicate.value, 'config.g'),
        type: 'blob',
        showSuccess: false,
        showError: false,
      })
    } catch (e) {
      // config.g may not exist
      if (
        !(e instanceof DisconnectedError) &&
        !(e instanceof OperationCancelledError) &&
        !(e instanceof FileNotFoundError)
      ) {
        makeNotification(
          LogType.error,
          t('notification.download.error', ['config.g']),
          getErrorMessage(e),
        )
      }
    }

    // Upload them
    const emptyFile = new Blob()
    await useMachinesStore().upload({
      filename: combine(path, 'load.g'),
      content: loadG ?? emptyFile,
      showSuccess: false,
    })
    await useMachinesStore().upload({
      filename: combine(path, 'config.g'),
      content: configG ?? emptyFile,
      showSuccess: false,
    })
    await useMachinesStore().upload({
      filename: combine(path, 'unload.g'),
      content: unloadG ?? emptyFile,
      showSuccess: false,
    })
    makeNotification(
      LogType.success,
      t('notification.newFilament.successTitle'),
      t('notification.newFilament.successMessage', [extractFileName(path)]),
    )
  } catch (e) {
    console.warn(e)
    makeNotification(
      LogType.error,
      t('notification.newFilament.errorTitleMacros'),
      getErrorMessage(e),
    )
  }
  doingFileOperation.value = false
}

function fileClicked(item: BaseFileListItem) {
  filelistRef.value?.edit(item)
}

let { uiFrozen } = storeToRefs(useRootStore())
let { directories } = storeToRefs(useMachinesModelStore())

let isRootDirectory = computed(() => {
  return equals(directory.value, useMachinesModelStore().directories.filaments)
})

let filamentsDirectory = computed(() => {
  return useMachinesModelStore().directories.filaments
})

let filamentLoaded = computed(() => {
  return (
    isRootDirectory.value &&
    selection.value.some((item) =>
      useMachinesModelStore().move.extruders.some((extruder) => extruder.filament === item.name),
    )
  )
})

let filamentSelected = computed(() => {
  return (
    equals(directory.value, filamentsDirectory.value) &&
    selection.value.length === 1 &&
    selection.value[0].isDir
  )
})

watch(filamentsDirectory, (newVal, oldVal) => {
  if (equals(directory.value, oldVal) || !startsWith(directory.value, newVal)) {
    directory.value = newVal
  }
})
</script>
