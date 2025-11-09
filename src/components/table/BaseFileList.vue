<template>
  <Card class="py-0">
    <CardContent class="px-0">
      <DataTable
        v-model:innerValue="innerValue"
        v-model:sort-by="internalSortBy"
        v-model:sort-desc="internalSortDesc"
        v-model:row-selection="rowSelection"
        v-model:right-clicked-item="rightClickedItem"
        v-model:items="downstreamInnerFilelist"
        v-model:data="data"
        :columns="columns"
        :loading="downstreamLoading"
        :customSort="sort"
        @item-click="(payload) => onItemClick(payload)"
      >
        <template v-slot:contextmenu>
          <slot name="contextmenu"> </slot>
        </template>
      </DataTable>
    </CardContent>
  </Card>
</template>

<script setup lang="ts" generic="TData, TValue">
import { AccessorFnColumnDef, DisplayColumnDef, type SortingState } from '@tanstack/vue-table'

import { useRootStore } from '@/stores'
import { useMachinesCacheStore } from '@/stores/machineCache'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { defaultMachine } from '@/stores/misc'
import { displayTime } from '@/utils/display'
import { DisconnectedError, getErrorMessage, OperationCancelledError } from '@/utils/errors'
import eventbus from '@/utils/eventbus'
import Events from '@/utils/events'
import { log, LogType } from '@/utils/logging'
import { makeNotification } from '@/utils/notifications'
import { combine, filesAffectDirectory, getVolume } from '@/utils/path'
import { FileListItem } from '@duet3d/connectors'
import saveAs from 'file-saver'
import { storeToRefs } from 'pinia'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Card, CardContent } from '../ui/card'
import { BaseFileListItem, FilamentsListItem, JobListItem, MacroListItem } from './columns'
import DataTable from './data-table.vue'

const rightClickedItem = defineModel<{ name: string; isDir: boolean } | null>('rightClickedItem', {
  required: true,
})
const filelist = defineModel<MacroListItem[] | FileListItem[]>('filelist', { required: true })
const directory = defineModel<string>('directory', { required: true })
const loading = defineModel<boolean>('loading', { required: true })
const selection = defineModel<{ name: string; isDir: boolean }[]>('selection', { required: true })

const {
  //   data,
  columns,
  sortTable,

  value,

  doingFileOperation,
  noDragDrop,
  noDownload,
  noEdit,
  noFilesText = '',
  noRename,
} = defineProps<{
  columns: (
    | AccessorFnColumnDef<JobListItem, any>
    | AccessorFnColumnDef<FilamentsListItem, any>
    | DisplayColumnDef<JobListItem, any>
    | DisplayColumnDef<FilamentsListItem, any>
  )[]
  // columns: GroupColumnDef<JobListItem, unknown>[]
  //   headers?: BaseFileListHeader[]
  sortTable?: string
  value?: BaseFileListItem[]

  doingFileOperation?: boolean
  noDragDrop?: boolean
  noDownload?: boolean
  noEdit?: boolean
  noFilesText?: string
  noRename?: boolean
}>()

defineExpose({
  refresh,
  download,
  edit,
})

let { isConnected, selectedMachine } = storeToRefs(useRootStore())
let { volumes } = storeToRefs(useMachinesModelStore())
let { transferringFiles } = storeToRefs(useMachinesStore())
// todo save sorting
// let { sorting } = storeToRefs(useMachinesCacheStore())
let { t } = useI18n()

/**
 * Maximum permitted size of files to edit (defaults to 32MiB)
 */
const maxEditFileSize = 33554432

let initialDirectory = ref(directory)
let innerDirectory = ref(directory)
let innerFilelist = ref<JobListItem[]>([])
let innerFilelistLoaded = ref(false)
let innerLoading = ref(false)
let innerDoingFileOperation = ref(false)
let refreshAfterTransfer = ref(false)
let innerValue = ref<BaseFileListItem[]>([])
let prevSelection = ref<BaseFileListItem[]>([])

let downstreamInnerFilelist = computed(() => innerFilelist.value)

const defaultData: JobListItem[] = [
  {
    name: 'tanner',
    isDirectory: false,
    size: 10101,
    lastModified: null,
    height: 123,
    layerHeight: 456,
    filament: [789],
    generatedBy: 'noone knows',
    printTime: 987,
    simulatedTime: 654,
  },
]

const data = ref(defaultData)

function rerender(innerFilelist: JobListItem[]) {
  let future = data.value
  if (future[0]?.height) future[0].height++
  data.value = (innerFilelist ?? []).map((file) => {
    return {
      name: file.name,
      isDirectory: file.isDirectory,
      size: file.size,
      lastModified: file.lastModified,
      height: 123,
      layerHeight: file.layerHeight,
      filament: file.filament,
      generatedBy: file.generatedBy,
      printTime: file.printTime,
      simulatedTime: file.simulatedTime,
    }
  })
  // data.value = [
  //   ...future,
  //   {
  //     name: 'tanner',
  //     size: 10101,
  //     lastModified: DateTime.now(),
  //     height: 123,
  //     layerHeight: 456,
  //     filament: [789],
  //     generatedBy: 'noone knows',
  //     printTime: 987,
  //     simulatedTime: 654,
  //   },
  // ]
  console.log('new data', data.value)
}

watch(
  innerFilelist,
  (newVal, oldVal) => {
    rerender(newVal)
  },
  { deep: true },
)
let downstreamLoading = computed(() => loading.value || innerLoading.value)
let contextMenu = ref({
  shown: false,
  touchTimer: null as NodeJS.Timeout | null,
  x: 0,
  y: 0,
})
let editDialog = ref({
  shown: false,
  filename: '',
  content: '',
})
let forceMoveDialog = ref({
  from: '',
  to: '',
  shown: false,
})
let renameDialog = ref({
  shown: false,
  directory: '',
  item: null as BaseFileListItem | null,
})
let removeDialog = ref({
  shown: false,
  directory: '',
  items: [] as BaseFileListItem[],
})

const sorting = ref<SortingState>([])
const rowSelection = ref<{ [rowNumber: string]: boolean }>({})

watch(rowSelection, (newVal, oldVal) => {
  selection.value = Object.keys(newVal).map((rowIndex) => {
    let row: BaseFileListItem = innerFilelist.value[rowIndex]
    return {
      name: row.name,
      isDir: row.isDirectory,
    }
  })
})

let isMounted = computed(() => {
  const volume = getVolume(innerDirectory.value)
  return volume >= 0 && volume < volumes.value.length && volumes.value[volume].mounted
})

let isLoading = computed(() => {
  return loading.value || innerLoading.value || doingFileOperation || innerDoingFileOperation.value
})

let foldersSelected = computed(() => {
  return innerValue.value.some((item) => item.isDirectory)
})

let filesSelected = computed(() => {
  return innerValue.value.some((item) => !item.isDirectory)
})
let canEditFile = computed(() => {
  return innerValue.value.length > 0 && innerValue.value[0].size < maxEditFileSize
})
let noItemsText = computed(() => {
  return innerFilelistLoaded.value || isMounted.value || selectedMachine.value === defaultMachine
    ? noFilesText
    : 'list.baseFileList.driveUnmounted'
})
let internalSortBy = computed({
  get(): string {
    return sortTable && sorting.value[sortTable] ? sorting.value[sortTable].column : ''
  },
  set(value: string) {
    useMachinesCacheStore().setSorting({
      table: sortTable!,
      column: value,
      descending: internalSortDesc.value,
    })
  },
})
let internalSortDesc = computed({
  get(): boolean {
    return sortTable && sorting.value[sortTable] ? sorting.value[sortTable].descending : false
  },
  set(value: boolean) {
    useMachinesCacheStore().setSorting({
      table: sortTable!,
      column: internalSortBy.value,
      descending: value,
    })
  },
})

function sort(
  items: Array<BaseFileListItem>,
  sortBy: Array<keyof BaseFileListItem> = ['name'],
  sortDesc: Array<boolean>,
) {
  // Sort by index
  items.sort((a, b) => {
    const first = a[sortBy[0]],
      second = b[sortBy[0]]
    if (first === second) {
      return 0
    }
    if (first === null || first === undefined) {
      return -1
    }
    if (second === null || second === undefined) {
      return 1
    }
    if (typeof first === 'number' && typeof second === 'number') {
      return first - second
    }
    if (typeof first === 'string' && typeof second === 'string') {
      return first.localeCompare(second, undefined, { sensitivity: 'base' })
    }
    if (first instanceof Array && second instanceof Array) {
      const firstSum = first.length ? first.reduce((a: number, b: number) => a + b) : 0
      const secondSum = second.length ? second.reduce((a: number, b: number) => a + b) : 0
      return firstSum - secondSum
    }
    if (first instanceof Date && second instanceof Date) {
      return first.getTime() - second.getTime()
    }
    console.warn(`[base-file-list] Invalid sort key type ${sortBy} (${typeof first})`)
    return 0
  })

  // Deal with descending order
  if (sortDesc[0]) {
    items.reverse()
  }

  // Then make sure directories come first
  items.sort((a, b) => (a.isDirectory === b.isDirectory ? 0 : a.isDirectory ? -1 : 1))
  return items
}

function refresh() {
  nextTick(() => loadDirectory(innerDirectory.value))
}

async function loadDirectory(directory: string) {
  console.log('calling loadDirectory', directory)
  // Make sure the requested volume is actually available
  const volume = getVolume(directory)
  if (
    !isConnected.value ||
    (volume >= 0 &&
      volume < useMachinesModelStore().volumes.length &&
      !useMachinesModelStore().volumes[volume].mounted)
  ) {
    innerDirectory.value =
      volume === getVolume(initialDirectory.value) ? initialDirectory.value : `${volume}:`
    innerFilelist.value = []
    innerFilelistLoaded.value = false
    console.log('exit early 1')
    return
  }

  // Update our path even if we"re still busy loading
  innerDirectory.value = directory
  if (innerLoading.value || loading.value) {
    console.log('exit early 2')
    return
  }

  // Load file list
  innerLoading.value = true
  innerFilelistLoaded.value = false
  try {
    const files: FileListItem[] = await useMachinesStore().getFileList(directory)

    // Check if another directory was requested while files were being loaded
    if (directory !== innerDirectory.value) {
      innerLoading.value = false
      loadDirectory(innerDirectory.value)
      console.log('loading innerDirectory instead', directory)
      return
    }

    // Assign new file list
    console.log('Updating innerFileList, we should see MAYBE WILL')
    innerFilelist.value = files
    innerFilelistLoaded.value = true
    innerValue.value = []
    nextTick(function () {
      emit('directoryLoaded', directory)
    })
  } catch (e) {
    if (!(e instanceof DisconnectedError)) {
      console.warn(e)
      makeNotification(LogType.error, t('error.filelistRequestFailed'), getErrorMessage(e))
    }
  }
  console.log('done loading', directory)
  innerLoading.value = false
}
function displayLoadingValue(
  item: BaseFileListItem,
  prop: keyof BaseFileListItem,
  precision?: number,
  unit = '',
) {
  if (item.isDirectory) {
    return ''
  }

  const itemValue = item[prop]
  if (itemValue === undefined) {
    return t('generic.loading')
  }
  if (itemValue === null) {
    return t('generic.noValue')
  }

  let displayValue: string | number | bigint | boolean | Date
  if (itemValue instanceof Array) {
    if (itemValue.length === 0) {
      return t('generic.noValue')
    }
    displayValue = itemValue.reduce((a, b) => a + b)
  } else {
    displayValue = itemValue
  }

  if (typeof displayValue === 'number' && precision !== undefined) {
    displayValue = displayValue.toFixed(precision)
  }
  return `${displayValue} ${unit}`
}

function displayTimeValue(item: BaseFileListItem, prop: keyof BaseFileListItem) {
  if (item.isDirectory) {
    return ''
  }
  const itemValue = item[prop]
  return typeof itemValue === 'number' ? displayTime(itemValue) : t('generic.noValue')
}

function onItemTouchStart(props: any, e: TouchEvent) {
  contextMenu.value.touchTimer = setTimeout(function () {
    contextMenu.value.touchTimer = null
    onItemContextmenu(
      props,
      new MouseEvent('contextmenu', {
        clientX: e.targetTouches[0].clientX,
        clientY: e.targetTouches[0].clientY,
      }),
    )
  }, 1000)
}

function onItemTouchEnd() {
  if (contextMenu.value.touchTimer) {
    clearTimeout(contextMenu.value.touchTimer)
    contextMenu.value.touchTimer = null
  }
}

function onItemClick(props) {
  console.log(props)
  if (props.isDirectory) {
    loadDirectory(combine(innerDirectory.value, props.name))
  } else {
    emit('fileClicked', props)
  }
}

function onItemContextmenu(props, e: MouseEvent) {
  if (contextMenu.value.shown) {
    return
  }
  onItemTouchEnd()

  // Deal with selection
  prevSelection.value = innerValue.value
  if (!props.isSelected) {
    innerValue.value = []
    nextTick(() => props.select(true))
  }

  // Open the context menu
  contextMenu.value.shown = false
  contextMenu.value.x = e.clientX
  contextMenu.value.y = e.clientY
  nextTick(() => {
    contextMenu.value.shown = true
  })
}

watch(
  filelist,
  (newVal, oldVal) => {
    console.log('filelist!')
  },
  { deep: true },
)

async function forceMove() {
  try {
    await useMachinesStore().move({
      from: forceMoveDialog.value.from,
      to: forceMoveDialog.value.to,
      force: true,
    })
  } catch (e) {
    makeNotification(
      LogType.error,
      `Failed to move ${forceMoveDialog.value.from} to ${forceMoveDialog.value.to}`,
      getErrorMessage(e),
    )
  }
}

async function download(item: BaseFileListItem) {
  try {
    const filename = item && item.name ? item.name : innerValue.value[0].name
    const files = await useMachinesStore().download({
      filename: combine(innerDirectory.value, filename),
      type: 'blob',
    })
    const blob: Blob = files[0].content
    saveAs(blob, filename)
  } catch (e) {
    if (!(e instanceof DisconnectedError) && !(e instanceof OperationCancelledError)) {
      // should be handled before we get here
      console.warn(e)
    }
  }
}

async function edit(item: BaseFileListItem) {
  try {
    const filename = combine(innerDirectory.value, item.name)
    const response = await useMachinesStore().download({
      filename,
      type: 'text',
      showSuccess: false,
    })
    editDialog.value.filename = filename
    editDialog.value.content = response[0].content
    editDialog.value.shown = true
  } catch (e) {
    if (!(e instanceof DisconnectedError) && !(e instanceof OperationCancelledError)) {
      // should be handled before we get here
      console.warn(e)
    }
  }
}

function rename(item: BaseFileListItem) {
  renameDialog.value.directory = innerDirectory.value
  renameDialog.value.item = item && item.name ? item : innerValue.value[0]
  renameDialog.value.shown = true
}

async function renameCallback(newFilename: string) {
  const oldFilename = renameDialog.value.item!.name
  if (innerDoingFileOperation.value) {
    return
  }

  innerDoingFileOperation.value = true
  try {
    await useMachinesStore().move({
      from: combine(renameDialog.value.directory, oldFilename),
      to: combine(renameDialog.value.directory, newFilename),
    })
    makeNotification(LogType.success, t('notification.rename.success', [oldFilename, newFilename]))
  } catch (e) {
    console.warn(e)
    log(
      LogType.error,
      t('notification.rename.error', [oldFilename, newFilename]),
      getErrorMessage(e),
    )
  }
  innerDoingFileOperation.value = false
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
  if (
    machine === useRootStore().selectedMachine &&
    ((files !== undefined && filesAffectDirectory(files, directory.value)) ||
      volume === getVolume(directory.value))
  ) {
    // File or directory has been changed in the current directory
    if (transferringFiles) {
      refreshAfterTransfer.value = true
    } else {
      refresh()
    }
  }
}

onMounted(() => {
  // Perform initial load
  if (isConnected.value) {
    refresh()
  }

  // Keep track of file changes
  eventbus.$on(Events.filesOrDirectoriesChanged, filesOrDirectoriesChanged)
})

onUnmounted(() => {
  // No longer keep track of file changes
  eventbus.$off(Events.filesOrDirectoriesChanged, filesOrDirectoriesChanged)
})

let emit = defineEmits([
  'fileClicked',
  'directoryLoaded',
  'update:directory',
  'input',
  'update:loading',
  'update:filelist',
])
watch(isConnected, (newVal, oldVal) => {
  if (newVal) {
    refresh()
  } else {
    innerDirectory.value = initialDirectory.value
    innerFilelist.value = []

    editDialog.value.shown = false
    renameDialog.value.shown = false
  }
})
watch(selectedMachine, (newVal, oldVal) => {
  // TODO store current directory per selected machine
  innerDirectory.value = initialDirectory.value
  innerFilelist.value = []
  refreshAfterTransfer.value = false

  editDialog.value.shown = false
  renameDialog.value.shown = false
})
watch(isMounted, (newVal, oldVal) => {
  if (!newVal || !innerFilelistLoaded.value) {
    refresh()
  }
})
watch(transferringFiles, (newVal, oldVal) => {
  if (!newVal && refreshAfterTransfer.value) {
    refreshAfterTransfer.value = false
    refresh()
  }
})
watch(directory, (newVal, oldVal) => {
  loadDirectory(newVal)
})
watch(innerDirectory, (newVal, oldVal) => {
  if (directory.value !== newVal) {
    emit('update:directory', newVal)
  }
})
watch(innerFilelist, (newVal, oldVal) => {
  if (filelist.value !== newVal) {
    emit('update:filelist', newVal)
  }
})
watch(innerLoading, (newVal, oldVal) => {
  if (loading.value !== newVal) {
    emit('update:loading', newVal)
  }
})
watch(innerValue, (newVal, oldVal) => {
  if (value !== newVal) {
    emit('input', newVal)
  }
})
// watch('contextMenu.shown', (newVal, oldVal) => {
//   if (!newVal) {
//     // Restore previously selected items
//     innerValue.value = prevSelection.value
//   }
// })
</script>
