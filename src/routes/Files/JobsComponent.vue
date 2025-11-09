<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-row gap-2 items-center">
      <SDCardBtn v-if="volumes.length > 1" v-model:value="volume" />

      <DirectoryBreadcrumbs v-model:directory="directory" />

      <ButtonGroup class="ml-auto">
        <ButtonGroup>
          <Button variant="outline" size="icon" aria-label="Go Back">
            <FolderUpIcon />
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button
            variant="outline"
            :loading="loading || fileinfoProgress !== -1"
            :disabled="uiFrozen"
            @click="refresh"
            class="flex flex-row gap-2 items-center"
          >
            <RefreshCwIcon />
            {{ $t('button.refresh.caption') }}
          </Button>
        </ButtonGroup>
        <ButtonGroup>
          <Button
            variant="outline"
            :disabled="uiFrozen"
            @click="showNewDirectory = true"
            class="flex flex-row gap-2 items-center"
          >
            <FolderPlusIcon />
            {{ $t('button.newDirectory.caption') }}
          </Button>

          <UploadBtn :directory="directory" :target="UploadType.gcodes" color="primary" />
        </ButtonGroup>
      </ButtonGroup>
    </div>

    <BaseFileList
      class="w-full"
      ref="_filelist"
      v-model:directory="directory"
      v-model:selection="selection"
      v-model:loading="loading"
      v-model:filelist="filelist"
      v-model:right-clicked-item="rightClickedItem"
      :columns="columns"
      sort-table="jobs"
      :no-files-text="t('list.jobs.noJobs')"
      @directoryLoaded="directoryLoaded"
      @fileClicked="fileClicked"
    >
      <template v-slot:contextmenu>
        <!-- Selection context menu -->
        <ContextMenuContent v-if="selection.length > 0">
          <ContextMenuGroup>
            <ContextMenuLabel>
              <!-- todo i18n for 'selected' -->
              <Badge class="mx-auto">{{ selection.length }} Selected</Badge>
            </ContextMenuLabel>
            <ContextMenuItem @click="remove()"
              ><TrashIcon />{{ $t('list.baseFileList.delete') }}</ContextMenuItem
            >
            <ContextMenuItem @click="downloadZIP(selection)"
              ><DownloadIcon />{{ $t('list.baseFileList.downloadZIP') }}</ContextMenuItem
            >
          </ContextMenuGroup>
          <!-- The context window will either be that of when mu -->

          <!-- content for the header slot -->
        </ContextMenuContent>
        <!-- File/folder context menu -->
        <ContextMenuContent v-else>
          <!-- The context window will either be that of when mu -->
          <ContextMenuItem
            v-show="(singleFileSelected || fileRightClicked) && !isPrinting"
            @click="start"
            >{{ $t('list.jobs.start') }}</ContextMenuItem
          >
          <ContextMenuItem
            v-show="(singleFileSelected || fileRightClicked) && !isPrinting"
            @click="simulate"
            >{{ $t('list.jobs.simulate') }}</ContextMenuItem
          >
          <ContextMenuItem>Team</ContextMenuItem>
          <ContextMenuItem>Subscription</ContextMenuItem>
          <!-- content for the header slot -->
        </ContextMenuContent>
      </template>
    </BaseFileList>

    <!-- <base-file-list
      ref="filelist"
      v-model="selection"
      :headers="headers"
      v-model:directory="directory"
      v-model:filelist="filelist"
      v-model:loading="loading"
      sort-table="jobs"
      no-files-text="list.jobs.noJobs"
      @directoryLoaded="directoryLoaded"
      @fileClicked="fileClicked"
    > -->

    <!-- <template #progress>
        <v-progress-linear
          :indeterminate="fileinfoProgress === -1"
          :value="(fileinfoProgress / filelist.length) * 100"
        />
      </template> -->

    <!-- <template #folder="{ item }">
        <div :class="{ 'list-icon mr-2': hasThumbnails, 'mr-1': !hasThumbnails }">
          <v-icon>mdi-folder</v-icon>
        </div>
        {{ item.name }}
      </template> -->

    <!-- <template #file="{ item }">
        <div :class="{ 'list-icon mr-2': hasThumbnails, 'mr-1': !hasThumbnails }">
          <v-icon v-if="!(item.thumbnails instanceof Array) || !getSmallThumbnail(item.thumbnails)">
            {{ item.thumbnails instanceof Array ? 'mdi-file' : 'mdi-asterisk' }}
          </v-icon>
          <v-menu
            v-else
            right
            offset-x
            open-on-hover
            open-on-focus
            close-on-content-click
            :min-width="16"
          >
            <template #activator="{ props }">
              <div v-bind="props" tabindex="0" @click.stop="">
                <thumbnail-img :thumbnail="getSmallThumbnail(item.thumbnails)" icon />
              </div>
            </template>

            <v-card class="d-flex">
              <thumbnail-img :thumbnail="getBigThumbnail(item.thumbnails)" />
            </v-card>
          </v-menu>
        </div>
        {{ item.name }}
      </template> -->

    <!-- <template #context-menu>
        <v-list-item v-show="isFile && !isPrinting" @click="start">
          <v-icon class="mr-1"> mdi-play </v-icon> {{ $t('list.jobs.start') }}
        </v-list-item>
        <v-list-item v-show="isFile && !isPrinting" @click="simulate">
          <v-icon class="mr-1"> mdi-fast-forward </v-icon> {{ $t('list.jobs.simulate') }}
        </v-list-item>
        <v-list-item
          v-for="(menuItem, index) in contextMenuItems"
          v-show="isFile"
          :key="index"
          @click="contextMenuAction(menuItem)"
        >
          <v-icon class="mr-1">
            {{ menuItem.icon }}
          </v-icon>
          {{ menuItem.name }}
        </v-list-item>
      </template> -->
    <!-- </base-file-list> -->

    <!-- 
    <v-speed-dial
      v-model="fab"
      bottom
      right
      fixed
      direction="top"
      transition="scale-transition"
      class="hidden-md-and-up"
    >
      <template #activator>
        <v-btn v-model="fab" dark color="primary" fab>
          <v-icon v-if="fab"> mdi-close </v-icon>
          <v-icon v-else> mdi-dots-vertical </v-icon>
        </v-btn>
      </template>

      <v-btn fab :disabled="uiFrozen" @click="showNewDirectory = true">
        <v-icon>mdi-folder-plus</v-icon>
      </v-btn>

      <v-btn
        fab
        color="info"
        :loading="loading || fileinfoProgress !== -1"
        :disabled="uiFrozen"
        @click="refresh"
      >
        <v-icon>mdi-refresh</v-icon>
      </v-btn>

      <upload-btn fab dark :directory="directory" target="gcodes" color="primary">
        <v-icon>mdi-cloud-upload</v-icon>
      </upload-btn>
    </v-speed-dial>

    <NewDirectoryDialog v-model:shown="showNewDirectory" :directory="directory" />
    <ConfirmDialog
      v-model:shown="startJobDialog.shown"
      :title="startJobDialog.title"
      :prompt="startJobDialog.prompt"
      @confirmed="start(startJobDialog.item)"
    /> -->
  </div>
</template>

<script setup lang="ts">
import { ButtonGroup } from '@/components/ui/button-group'
import {
  FileIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  FolderUpIcon,
  RefreshCwIcon,
} from 'lucide-vue-next'

const label = ref('personal')

import { ThumbnailInfo } from '@duet3d/objectmodel'

import { isPrinting as _isPrinting } from '@/utils/enums'
import {
  DisconnectedError,
  getErrorMessage,
  InvalidPasswordError,
  OperationCancelledError,
} from '@/utils/errors'
import { LogType } from '@/utils/logging'
import {
  combine,
  equals,
  escapeFilename,
  extractDirectory,
  extractFileName,
  getVolume,
  isGCodePath,
  pathObj,
  startsWith,
} from '@/utils/path'

import SDCardBtn from '@/components/buttons/SDCardBtn.vue'
import UploadBtn, { UploadType } from '@/components/buttons/UploadBtn.vue'
import DirectoryBreadcrumbs from '@/components/misc/DirectoryBreadcrumbs.vue'
import BaseFileList from '@/components/table/BaseFileList.vue'
import { JobListItem } from '@/components/table/columns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
} from '@/components/ui/context-menu'
import i18n from '@/i18n'
import { useRootStore } from '@/stores'
import { useMachinesCacheStore } from '@/stores/machineCache'
import { useMachinesModelStore } from '@/stores/machineModel'
import { FileTransferItem, useMachinesStore } from '@/stores/machines'
import { ContextMenuItem as _ContextMenuItem, useUIInjectionStore } from '@/stores/uiInjection'
import eventbus from '@/utils/eventbus'
import { log } from '@/utils/logging'
import { makeNotification } from '@/utils/notifications'
import { createColumnHelper } from '@tanstack/vue-table'
import saveAs from 'file-saver'
import JSZip from 'jszip'
import { DownloadIcon, TrashIcon } from 'lucide-vue-next'
import { DateTime } from 'luxon'
import { storeToRefs } from 'pinia'
import prettyBytes from 'pretty-bytes'
import { computed, h, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

// Undefined means not yet fetched, null means fetched and not available

let rightClickedItem = ref<{ name: string; isDir: boolean } | null>(null)

watch(rightClickedItem, (newVal) => {
  console.log(newVal)
})

let directory = ref<string>(pathObj.gCodes)
let selection = ref<{ name: string; isDir: boolean }[]>([])
let hasThumbnails = ref(false)
let filelist = ref<JobListItem[]>([])
let loadingValue = ref(false)

watch(directory, (newVal, oldVal) => {
  console.log(newVal)
})

let { t } = useI18n()
let fileinfoDirectory = ref<string | null>(null)
let fileinfoProgress = ref(-1)
let startJobDialog = ref({
  title: '',
  prompt: '',
  item: null as JobListItem | null,
  shown: false,
})
let showNewDirectory = ref(false)
let fab = ref(false)

let { isConnected, uiFrozen } = storeToRefs(useRootStore())
let { directories, job, volumes, state } = storeToRefs(useMachinesModelStore())
let { contextMenuItems } = storeToRefs(useUIInjectionStore())

let jobFileList = computed(() => {
  return contextMenuItems.value.jobFileList
})
let gcodesDirectory = computed(() => {
  return directories.value.gCodes
})
let lastJobFile = computed(() => {
  return job.value.lastFileName
})
let singleFileSelected = computed(() => {
  return selection.value.length === 1 && !selection.value[0].isDir
})
let singleFolderSelected = computed(() => {
  return selection.value.length === 1 && selection.value[0].isDir
})

let fileRightClicked = computed(() => {
  return !rightClickedItem.value?.isDir
})
let folderRightClicked = computed(() => {
  return rightClickedItem.value?.isDir
})

let isPrinting = computed(() => {
  return _isPrinting(state.value.status)
})

let loading = computed({
  get(): boolean {
    return loadingValue.value || fileinfoProgress.value !== -1
  },
  set(value: boolean) {
    loadingValue.value = value
  },
})

let volume = computed({
  get(): number {
    return getVolume(directory.value)
  },
  set(value: number) {
    directory.value =
      value === getVolume(gcodesDirectory.value) ? gcodesDirectory.value : `${value}:`
  },
})

function getBigThumbnail(thumbnails: Array<ThumbnailInfo>) {
  let biggestThumbnail: ThumbnailInfo | null = null
  for (const thumbnail of thumbnails) {
    if (
      thumbnail.data !== null &&
      (!biggestThumbnail || thumbnail.height > biggestThumbnail.height)
    ) {
      biggestThumbnail = thumbnail
    }
  }
  return biggestThumbnail
}
function getSmallThumbnail(thumbnails: Array<ThumbnailInfo>) {
  let smallestThumbnail: ThumbnailInfo | null = null
  for (const thumbnail of thumbnails) {
    if (
      thumbnail.data !== null &&
      (!smallestThumbnail ||
        Math.abs(48 - thumbnail.height) < Math.abs(48 - smallestThumbnail.height))
    ) {
      smallestThumbnail = thumbnail
    }
  }
  return smallestThumbnail
}
const filelistRef = useTemplateRef('_filelist')

function refresh() {
  useMachinesCacheStore().clearFileInfo(directory.value)
  filelistRef.value?.refresh()
}
async function requestFileInfo(directory: string, fileIndex: number, fileCount: number) {
  if (fileIndex === 0) {
    hasThumbnails.value = false
  }

  if (fileinfoDirectory.value === directory) {
    if (isConnected.value && fileIndex < fileCount) {
      // Update progress
      fileinfoProgress.value = fileIndex

      // Try to get file info for the next file
      let file = { ...filelist.value[fileIndex] }
      if (file && !file.isDirectory) {
        let gotFileInfo = false
        try {
          // Check if it is possible to parse this file
          const filename = combine(directory, file.name)
          if (isGCodePath(file.name, gcodesDirectory.value)) {
            // Get the fileinfo either from our cache or from the Duet
            let fileInfo = useMachinesCacheStore().fileInfos[filename]
            if (!fileInfo) {
              fileInfo = await useMachinesStore().getFileInfo({
                filename,
                readThumbnailContent: true,
              })
              console.log(fileInfo)
              useMachinesCacheStore().setFileInfo({ filename, fileInfo })
            }

            // Start again if the number of files has changed
            if (fileCount !== filelist.value.length) {
              fileIndex = -1
              fileCount = filelist.value.length
              console.log('requestFileInfoaaa')
              filelist.value[fileIndex] = file
              requestFileInfo(directory, fileIndex, fileCount)
              return
            }

            // Set file info
            gotFileInfo = true
            file.height = fileInfo.height
            file.layerHeight = fileInfo.layerHeight
            file.filament = fileInfo.filament
            file.generatedBy = fileInfo.generatedBy
            file.printTime = fileInfo.printTime ? fileInfo.printTime : null
            file.simulatedTime = fileInfo.simulatedTime ? fileInfo.simulatedTime : null
            file.thumbnails = fileInfo.thumbnails ? fileInfo.thumbnails : []
            if (fileInfo.thumbnails && fileInfo.thumbnails.length !== 0) {
              hasThumbnails.value = true
            }
          }
        } catch (e) {
          // Deal with the error. If the connection has been terminated, the next call will invalidate everything
          if (!(e instanceof DisconnectedError) && !(e instanceof InvalidPasswordError)) {
            console.warn(e)
            log(LogType.error, t('error.fileinfoRequestFailed', [file.name]), getErrorMessage(e))
          }
        }

        // Remove loading state from the items if no info could be found
        if (!gotFileInfo) {
          file.height = null
          file.layerHeight = null
          file.filament = []
          file.generatedBy = null
          file.printTime = null
          file.simulatedTime = null
          file.thumbnails = null
        }
      }

      // Move on to the next item
      console.log('requestFileInfobbb')

      // Use differenceWith to find the difference
      console.log(
        'now actually saving, filelist.value[fileIndex].generatedBy before',
        filelist.value[fileIndex].generatedBy,
      )
      filelist.value[fileIndex] = file
      // triggerRef(filelist)
      console.log(
        'now actually saving, filelist.value[fileIndex].generatedBy after',
        filelist.value[fileIndex].generatedBy,
      )

      requestFileInfo(directory, fileIndex + 1, fileCount)
    } else {
      // No longer connected or finished
      fileinfoProgress.value = -1
      fileinfoDirectory.value = null
    }
  }
}
async function directoryLoaded(directory: string) {
  if (fileinfoDirectory.value !== directory) {
    fileinfoDirectory.value = directory
    for (const item of filelist.value) {
      if (item.isDirectory) {
        item.height = null
        item.layerHeight = null
        item.filament = null
        item.generatedBy = null
        item.printTime = null
        item.simulatedTime = null
        item.thumbnails = null
      }
    }
    console.log('requestFileInfoccc')
    console.log(filelist.value)

    await requestFileInfo(directory, 0, filelist.value.length)
  }
}
function fileClicked(item: JobListItem) {
  if (!isPrinting.value) {
    startJobDialog.value.title = t('dialog.startJob.title', [item.name])
    startJobDialog.value.prompt = t('dialog.startJob.prompt', [item.name])
    startJobDialog.value.item = item
    startJobDialog.value.shown = true
  }
}
async function start(item: JobListItem | null) {
  if (item !== null) {
    await useMachinesStore().sendCode(
      `M32 "${escapeFilename(combine(directory.value, item && item.name ? item.name : selection.value[0].name))}"`,
    )
  }
}
async function simulate(item: JobListItem) {
  await useMachinesStore().sendCode(
    `M37 P"${escapeFilename(combine(directory.value, item && item.name ? item.name : selection.value[0].name))}"`,
  )
}

async function contextMenuAction(menuItem: _ContextMenuItem) {
  let path = combine(directory.value, selection.value[0].name)
  if (menuItem.path) {
    await useRouter().push(menuItem.path)
  }
  eventbus.$emit(menuItem.action, path)
}

watch(gcodesDirectory, (newVal, oldVal) => {
  if (equals(directory.value, oldVal) || !startsWith(directory.value, newVal)) {
    directory.value = newVal
  }
})

watch(lastJobFile, (newVal, oldVal) => {
  if (newVal !== null && equals(directory.value, extractDirectory(newVal))) {
    // Refresh the filelist after a short moment so DSF and RRF can update the simulation time first
    setTimeout(filelistRef.value!.refresh.bind(this), 2000)
  }
})

onMounted(() => {
  directory.value = gcodesDirectory.value
})

const columnHelper = createColumnHelper<JobListItem>()

let columns = [
  columnHelper.display({
    id: 'select',
    header: ({ table }) =>
      h(Checkbox, {
        modelValue: table.getIsAllPageRowsSelected()
          ? table.getIsAllPageRowsSelected()
          : table.getIsSomeRowsSelected()
            ? 'indeterminate'
            : false,
        'onUpdate:modelValue': (value) => table.toggleAllPageRowsSelected(!!value),
        ariaLabel: 'Select all',
      }),
    cell: (info) =>
      h(Checkbox, {
        class: 'cursor-pointer',
        modelValue: info.row.getIsSelected(),
        'onUpdate:modelValue': (value) => info.row.toggleSelected(!!value),
        ariaLabel: 'Select row',
        onClick: (e: Event) => e.stopPropagation(),
      }),
    enableSorting: false,
    enableHiding: false,
  }),
  columnHelper.accessor((row) => row.isDirectory, {
    id: 'isDirectory',
    cell: (info) => (info.getValue() ? h(FolderOpenIcon, { size: 18 }) : h(FileIcon, { size: 18 })),
    header: () => i18n.global.t('list.baseFileList.fileType'),
  }),
  columnHelper.accessor((row) => row.name, {
    id: 'name',
    cell: (info) => info.getValue(),
    header: () => i18n.global.t('list.baseFileList.fileName'),
  }),
  columnHelper.accessor((row) => row.size, {
    id: 'size',
    cell: (info) => prettyBytes(info.getValue()),
    header: () => i18n.global.t('list.baseFileList.size'),
  }),
  columnHelper.accessor((row) => row.lastModified, {
    id: 'lastModified',
    cell: (info) => {
      const date = info.getValue()
      return date
        ? DateTime.fromJSDate(date).toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS)
        : '?'
    },
    header: () => i18n.global.t('list.baseFileList.lastModified'),
  }),
  columnHelper.accessor((row) => row.height, {
    id: 'height',
    cell: (info) => info.getValue(),
    header: () => i18n.global.t('list.jobs.height'),
  }),
  columnHelper.accessor((row) => row.layerHeight, {
    id: 'layerHeight',
    cell: (info) => info.getValue(),
    header: () => i18n.global.t('list.jobs.layerHeight'),
  }),
  columnHelper.accessor((row) => row.filament, {
    id: 'filament',
    cell: (info) => info.getValue(),
    header: () => i18n.global.t('list.jobs.filament'),
  }),
  columnHelper.accessor((row) => row.generatedBy, {
    id: 'generatedBy',
    cell: (info) => info.getValue(),
    header: () => i18n.global.t('list.jobs.generatedBy'),
  }),
  columnHelper.accessor((row) => row.printTime, {
    id: 'printTime',
    cell: (info) => info.getValue(),
    header: () => i18n.global.t('list.jobs.printTime'),
  }),
  columnHelper.accessor((row) => row.simulatedTime, {
    id: 'simulatedTime',
    cell: (info) => info.getValue(),
    header: () => i18n.global.t('list.jobs.simulatedTime'),
  }),
]

async function downloadZIP(items: { name: string; isDir: boolean }[]) {
  // if (!items || !(items instanceof Array)) {
  //   items = innerValue.value.slice()
  // }

  // Download the selected files
  let downloadedFiles: Array<FileTransferItem>
  try {
    downloadedFiles = await useMachinesStore().download({
      files: items.map((item) => combine(directory, item.name)),
      type: 'blob',
      closeProgressOnSuccess: true,
    })
  } catch (e) {
    if (!(e instanceof DisconnectedError) && !(e instanceof OperationCancelledError)) {
      // should be handled before we get here
      console.warn(e)
    }
    return
  }

  // Compress downloaded files and save the new archive
  const notification = makeNotification(
    LogType.info,
    t('notification.compress.title'),
    t('notification.compress.message'),
    0,
  )
  try {
    const zip = new JSZip()
    for (const file of downloadedFiles) {
      zip.file(extractFileName(file.filename), file.content)
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    saveAs(zipBlob, 'download.zip')
  } catch (e) {
    console.warn(e)
    makeNotification(LogType.error, t('notification.compress.errorTitle'), getErrorMessage(e))
  }
  notification.close()
}

function remove() {
  console.log('todo remove')
  // removeDialog.value.directory = innerDirectory.value
  // removeDialog.value.items = innerValue.value.slice()
  // removeDialog.value.shown = true
}

// async function removeCallback() {
//   if (innerDoingFileOperation.value) {
//     return
//   }

//   innerDoingFileOperation.value = true
//   const deletedItems: any[] = []
//   const _directory = directory // todo correctly type
//   for (const item of removeDialog.value.items) {
//     try {
//       await useMachinesStore().delete({
//         filename: combine(_directory, item.name),
//         recursive: item.isDirectory ? true : undefined,
//       })

//       deletedItems.push(item)
//       innerFilelist.value = innerFilelist.value.filter(
//         (file) => file.isDirectory !== item.isDirectory || file.name !== item.name,
//       )
//       innerValue.value = innerValue.value.filter(
//         (file) => file.isDirectory !== item.isDirectory || file.name !== item.name,
//       )
//     } catch (e) {
//       makeNotification(
//         LogType.error,
//         t('notification.delete.errorTitle', [item.name]),
//         getErrorMessage(e),
//       )
//     }
//   }

//   if (deletedItems.length) {
//     log(
//       LogType.success,
//       deletedItems.length > 1
//         ? t('notification.delete.successMultiple', [deletedItems.length])
//         : t('notification.delete.success', [deletedItems[0].name]),
//     )
//   }
//   innerDoingFileOperation.value = false
// }
</script>
