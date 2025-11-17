<template>
  <Button :disabled="isBusy || !canUpload" @click="chooseFile" class="cursor-pointer">
    <CloudUpload />{{ caption }}
    <input
      color="{{innerColor}}"
      @drop="dragDrop"
      @dragleave="dragLeave"
      @dragover="dragOver"
      ref="fileInput"
      type="file"
      :accept="accept"
      hidden
      multiple
      @change="fileSelected"
    />
    <!-- <FirmwareUpdateDialog
        v-model:shown="confirmUpdate"
        :multiple-updates="multipleUpdates"
        v-model:update-wi-fi-firmware="updates.wifiServer"
        @confirmed="startUpdate"
      />
      <ConfigUpdatedDialog v-model:shown="confirmFirmwareReset" /> -->
  </Button>
  <!-- <v-btn

      :color="innerColor"
      @dragover.prevent.stop="dragOver"
      @dragleave.prevent.stop="dragLeave"
      @drop.prevent.stop="dragDrop" -->
</template>

<script setup lang="ts">
import { Board, MachineStatus, NetworkInterfaceType } from '@duet3d/objectmodel'
import JSZip from 'jszip'
import { computed, PropType, ref, watch } from 'vue'

import { Button } from '@/components/ui/button'
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { isPrinting } from '@/utils/enums'
import { DisconnectedError, getErrorMessage } from '@/utils/errors'
import Events from '@/utils/events'
import { log, LogType } from '@/utils/logging'
import { combine, escapeFilename, isSdPath, pathObj } from '@/utils/path'

import { displayTime } from '@/utils/display'
import eventbus from '@/utils/eventbus'
import { makeNotification } from '@/utils/notifications'
import { CloudUpload } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const props = defineProps({
  block: Boolean,
  color: {
    type: String,
    default: null,
  },
  directory: {
    default: null,
    type: String,
  },
  fab: Boolean,
  machine: {
    default: null,
    type: String,
  },
  target: {
    type: String as PropType<UploadType>,
    required: true,
  },
  uploadPrint: Boolean,
})

let innerColor = ref(props.color)
let extracting = ref(false)
let uploading = ref(false)
let confirmUpdate = ref(false)
let updates = ref({
  webInterface: false,
  firmwareBoards: [] as number[],
  wifiServer: false,
  wifiServerSpiffs: false,
  display: false,
  codeSent: false,
})
let confirmReset = ref(false)

const webExtensions: string[] = [
  '.htm',
  '.html',
  '.ico',
  '.xml',
  '.css',
  '.map',
  '.js',
  '.ttf',
  '.eot',
  '.svg',
  '.woff',
  '.woff2',
  '.jpeg',
  '.jpg',
  '.png',
]

const emit = defineEmits(['uploadComplete', 'uploadFailed'])

function chooseFile() {
  if (!isBusy.value && fileInput.value !== null) {
    ;(fileInput.value as HTMLInputElement).click()
  }
}

defineExpose({
  chooseFile,
})
async function fileSelected(e: Event) {
  if (e.target !== null) {
    const inputElement = e.target as HTMLInputElement
    if (inputElement.files) {
      try {
        await doUpload(inputElement.files)
      } finally {
        inputElement.value = ''
      }
    }
  }
}

function isWebFile(filename: string): boolean {
  if (
    webExtensions.some((extension) => filename.toLowerCase().endsWith(extension)) ||
    filename === 'manifest.json' ||
    filename === 'manifest.json.gz' ||
    filename === 'robots.txt'
  ) {
    return true
  }

  const matches = /(\.[^.]+).gz$/i.exec(filename)
  return matches !== null && webExtensions.includes(matches[1].toLowerCase())
}

function getFirmwareName(fileName: string): string | null {
  let result: string | null = null
  for (const board of useMachinesModelStore().boards) {
    if (board && board.firmwareFileName) {
      const binRegEx = new RegExp(board.firmwareFileName.replace(/\.bin$/, '(.*)\\.bin'), 'i')
      const uf2RegEx = new RegExp(board.firmwareFileName.replace(/\.uf2$/, '(.*)\\.uf2'), 'i')
      if (binRegEx.test(fileName) || uf2RegEx.test(fileName)) {
        result = board.firmwareFileName
        updates.value.firmwareBoards.push(board.canAddress || 0)
      }
    }
  }
  return result
}

function getBinaryName<T extends Extract<keyof Board, string>>(
  key: T,
  fileName: string,
): string | null {
  for (const board of useMachinesModelStore().boards) {
    if (board && board[key]) {
      const boardValue = board[key] as string
      const binRegEx = new RegExp(boardValue.replace(/\.bin$/, '(.*)\\.bin'), 'i')
      const uf2RegEx = new RegExp(boardValue.replace(/\.uf2$/, '(.*)\\.uf2'), 'i')
      if (binRegEx.test(fileName) || uf2RegEx.test(fileName)) {
        return boardValue
      }
    }
  }
  return null
}

async function doUpload(
  files: FileList | Array<File>,
  zipName?: string,
  startTime?: Date,
): Promise<void> {
  if (files.length === 0) {
    // Skip empty upload requests
    return
  }

  // Cannot start more than one file via Upload & Start or Install Plugin
  if (
    (props.target === UploadType.start || props.target === UploadType.plugin) &&
    files.length !== 1
  ) {
    makeNotification(
      LogType.error,
      t(`button.upload.${props.target}.caption`),
      t('error.uploadStartWrongFileCount'),
    )
    return
  }

  // Check if a ZIP file may be extracted
  if (!zipName) {
    if (
      files.length > 1 &&
      Array.from(files).some((file) => file.name.toLowerCase().endsWith('.zip'))
    ) {
      makeNotification(
        LogType.error,
        t(`button.upload.${props.target}.caption`),
        t('error.uploadNoSingleZIP'),
      )
      return
    }

    if (useMachinesModelStore().sbc !== null && files[0].name.toLowerCase() === 'dsf-update.zip') {
      await useMachinesStore().installSystemPackage({
        filename: files[0].name,
        packageData: files[0],
      })
      return
    }

    if (files[0].name.toLowerCase().endsWith('.zip')) {
      const zip = new JSZip(),
        zipFiles: Array<string> = [],
        target = props.target
      const notification = makeNotification(
        LogType.info,
        t('notification.decompress.title'),
        t('notification.decompress.message'),
        0,
      )
      extracting.value = true
      try {
        try {
          notification.progress = 0
          await zip.loadAsync(files[0], { checkCRC32: true })

          // Check if this is a plugin (permitted on Upload&Start, Files -> System, Settings -> Machine, Plugins)
          if (
            [UploadType.start, UploadType.system, UploadType.update, UploadType.plugin].includes(
              props.target,
            )
          ) {
            let isPlugin = false
            zip.forEach(function (file) {
              if (file === 'plugin.json') {
                isPlugin = true
              }
            })

            if (isPlugin) {
              eventbus.$emit(Events.installPlugin, {
                machine: props.machine || useRootStore().selectedMachine,
                zipFilename: files[0].name,
                zipBlob: files[0],
                zipFile: zip,
                start: props.target === UploadType.start,
              })
              return
            } else if (props.target === UploadType.plugin) {
              // Don't proceed if this is no plugin file
              return
            }
          }

          // Get a list of files to unpack
          zip.forEach(function (file) {
            if (
              !file.endsWith('/') &&
              (target !== UploadType.filaments || file.split('/').length === 2)
            ) {
              zipFiles.push(file)
            }
          })

          // Could we get anything useful?
          if (zipFiles.length === 0) {
            makeNotification(
              LogType.error,
              t(`button.upload.${props.target}.caption`),
              t('error.uploadNoFiles'),
            )
            return
          }

          // Do NOT allow index.html.gz to be uploaded in SBC mode (wrong package)
          if (
            useMachinesModelStore().sbc !== null &&
            zipFiles.some((file) => file === 'index.html.gz')
          ) {
            makeNotification(
              LogType.error,
              t(`button.upload.${props.target}.caption`),
              t('notification.decompress.standaloneUpdateInSbcModeError'),
            )
            return
          }

          // Extract everything and start the upload
          const extractedFiles: Array<File> = []
          let filesExtracted = 0
          for (const name of zipFiles) {
            const blob = await zip.file(name)!.async('blob')
            extractedFiles.push(new File([blob], name))
            notification.progress = Math.round((++filesExtracted / zipFiles.length) * 100)
          }
          doUpload(extractedFiles, files[0].name, new Date())
        } finally {
          extracting.value = false
          notification.close()
        }
        return
      } catch (e) {
        makeNotification(LogType.error, t('notification.decompress.errorTitle'), getErrorMessage(e))
        throw e
      }
    }
  }

  if (props.target === UploadType.plugin) {
    // Don't proceed if this is no plugin file
    return
  }

  // Check what types of files we have and where they need to go
  updates.value.webInterface = false
  updates.value.firmwareBoards = []
  updates.value.wifiServer = false
  updates.value.wifiServerSpiffs = false
  updates.value.display = false

  let skipUpload = false
  for (let i = 0; i < files.length; i++) {
    let content = files[i],
      filename = combine(destinationDirectory.value, content.name)
    if ([UploadType.firmware, UploadType.system, UploadType.update].includes(props.target)) {
      if (isSdPath('/' + content.name)) {
        filename = combine('0:/', content.name)
      } else if (isWebFile(content.name)) {
        filename = combine(useMachinesModelStore().directories.web, content.name)
        updates.value.webInterface =
          updates.value.webInterface || /index.html(\.gz)?/i.test(content.name)
      } else if (useMachinesModelStore().sbc !== null && /\.deb$/.test(content.name)) {
        await useMachinesStore().installSystemPackage({
          filename: content.name,
          packageData: content,
        })
        skipUpload = true
      } else {
        const firmwareFileName = getFirmwareName(content.name)
        const bootloaderFileName = getBinaryName('bootloaderFileName', content.name)
        const iapFileNameSBC = getBinaryName('iapFileNameSBC', content.name)
        const iapFileNameSD = getBinaryName('iapFileNameSD', content.name)

        if (firmwareFileName) {
          filename = combine(useMachinesModelStore().directories.firmware, firmwareFileName)
        } else if (bootloaderFileName) {
          filename = combine(useMachinesModelStore().directories.firmware, bootloaderFileName)
        } else if (useMachinesModelStore().sbc && iapFileNameSBC) {
          filename = combine(useMachinesModelStore().directories.firmware, iapFileNameSBC)
        } else if (iapFileNameSD) {
          filename = combine(useMachinesModelStore().directories.firmware, iapFileNameSD)
        } else if (
          !useMachinesModelStore().sbc &&
          useMachinesModelStore().network.interfaces.some(
            (iface) => iface.type === NetworkInterfaceType.wifi,
          )
        ) {
          if (
            useMachinesModelStore().boards.some(
              (board) => board.wifiFirmwareFileName === content.name,
            )
          ) {
            filename = combine(useMachinesModelStore().directories.firmware, content.name)
            updates.value.wifiServer = true
          } else if (content.name.endsWith('.bin') || content.name.endsWith('.uf2')) {
            filename = combine(useMachinesModelStore().directories.firmware, content.name)
            if (content.name === 'PanelDueFirmware.bin' || content.name === 'DuetScreen.bin') {
              updates.value.display = true
            }
          }
        } else if (content.name.endsWith('.bin') || content.name.endsWith('.uf2')) {
          filename = combine(useMachinesModelStore().directories.firmware, content.name)
          if (content.name === 'PanelDueFirmware.bin' || content.name === 'DuetScreen.bin') {
            updates.value.display = true
          }
        }
      }
    }

    Object.defineProperty(content, 'name', {
      writable: true,
      value: filename,
    })
  }
  const askForUpdate =
    updates.value.firmwareBoards.length > 0 ||
    updates.value.wifiServer ||
    updates.value.wifiServerSpiffs ||
    updates.value.display

  // Start uploading
  if (skipUpload) {
    return
  }

  uploading.value = true
  try {
    if (files.length === 1) {
      await useMachinesStore().upload({
        filename: files[0].name,
        content: files[0],
        showSuccess: !zipName,
      })
    } else {
      const filelist: any[] = [] // todo correctly type
      for (let i = 0; i < files.length; i++) {
        filelist.push({
          filename: files[i].name,
          content: files[i],
        })
      }
      await useMachinesStore().upload({
        files: filelist,
        showSuccess: !zipName,
        closeProgressOnSuccess: askForUpdate,
      })
    }
    emit('uploadComplete', files)
  } catch (e) {
    uploading.value = false
    emit('uploadFailed', { files, error: e })
    return
  }
  uploading.value = false

  // Deal with Upload & Start
  if (props.target === UploadType.start) {
    await useMachinesStore().sendCode(`M32 "${escapeFilename(files[0].name)}"`)
  }

  // Deal with updates
  if (askForUpdate) {
    // Ask user to perform an update
    confirmUpdate.value = true
  } else if (useRootStore().selectedMachine === location.host && updates.value.webInterface) {
    // Reload the web interface immediately if it was the only update
    location.reload(true)
  }

  // Deal with config files
  const configFile = combine(useMachinesModelStore().directories.system, pathObj.configFile)
  for (let file of files) {
    const fullName = combine(destinationDirectory.value, file.name)
    if (
      !isPrinting(useMachinesModelStore().state.status) &&
      (fullName === pathObj.configFile || fullName === configFile || fullName === pathObj.boardFile)
    ) {
      // Ask for firmware reset when config.g or 0:/sys/board.txt (RRF on LPC) has been replaced
      confirmReset.value = true
      break
    }
  }

  // Show success after uploading a ZIP
  if (zipName) {
    const secondsPassed = startTime
      ? Math.round((new Date().getTime() - startTime.getTime()) / 1000)
      : 0
    makeNotification(
      LogType.success,
      t('notification.upload.success', [zipName, displayTime(secondsPassed)]),
      null,
    )
  }
}

async function startUpdate() {
  // Don't show a reset confirmation while updating
  confirmReset.value = false

  // Update expansion boards
  useMachinesStore().setBoardsBeingUpdated(updates.value.firmwareBoards)
  for (let i = 0; i < updates.value.firmwareBoards.length; i++) {
    const boardToUpdate = updates.value.firmwareBoards[i]
    if (boardToUpdate > 0) {
      useMachinesStore().setBoardBeingUpdated(boardToUpdate)
      try {
        await useMachinesStore().sendCode(`M997 B${boardToUpdate}`)
        await waitForUpdate()
      } catch (e) {
        if (!(e instanceof DisconnectedError)) {
          console.warn(e)
          log(LogType.error, t('generic.error'), getErrorMessage(e))
        }
      }
    }
  }

  // Update other modules if applicable
  const modules: Array<number> = []
  if (updates.value.firmwareBoards.includes(0)) {
    modules.push(0)
  }
  if (updates.value.wifiServer) {
    modules.push(1)
  }
  if (updates.value.wifiServerSpiffs) {
    modules.push(2)
  }
  // module 3 means put wifi server into bootloader mode, not supported here
  if (updates.value.display) {
    modules.push(4)
  }

  if (modules.length > 0) {
    useMachinesStore().setBoardBeingUpdated(0)
    updates.value.codeSent = true
    try {
      await useMachinesStore().sendCode(`M997 S${modules.join(':')}`)
      await waitForUpdate()
    } catch (e) {
      if (!(e instanceof DisconnectedError)) {
        console.warn(e)
        log(LogType.error, t('generic.error'), getErrorMessage(e))
      }
    }
  }

  // Update complete
  useMachinesStore().setBoardBeingUpdated(-1)
  useMachinesStore().setBoardsBeingUpdated([])

  // Ask for a firmware reset if expansion boards but not the main board have been updated
  confirmReset.value =
    !modules.includes(0) && updates.value.firmwareBoards.some((board) => board > 0)
}
async function waitForUpdate() {
  do {
    // Wait in 2-second intervals until the status is no longer "Updating"
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Stop if the connection has been interrupted
    if (!isConnected.value) {
      return
    }
  } while (useMachinesModelStore().state.status === MachineStatus.updating)
}
function dragOver(e: DragEvent) {
  if (!isBusy.value) {
    innerColor.value = 'success'
  }
}
function dragLeave(e: DragEvent) {
  innerColor.value = props.color
}
async function dragDrop(e: DragEvent) {
  innerColor.value = props.color
  if (!isBusy.value && e.dataTransfer && e.dataTransfer.files.length) {
    await doUpload(e.dataTransfer.files)
  }
}

const { uiFrozen, isConnected } = storeToRefs(useRootStore())

const caption = computed(() => {
  if (extracting.value) {
    return t('generic.extracting')
  }
  if (uploading.value) {
    return t('generic.uploading')
  }
  return t(`button.upload.${props.target}.caption`)
})
const title = computed(() => {
  return t(`button.upload.${props.target}.title`)
})
const canUpload = computed(() => {
  return isConnected.value && !uiFrozen.value
})
const accept = computed(() => {
  switch (props.target) {
    case UploadType.gcodes:
      return '.g,.gcode,.gc,.gco,.nc,.ngc,.tap'
    case UploadType.start:
      return '.g,.gcode,.gc,.gco,.nc,.ngc,.tap,.zip'
    case UploadType.macros:
      return '*'
    case UploadType.filaments:
      return '.zip'
    case UploadType.firmware:
      return '.zip,.bin,.uf2'
    case UploadType.menu:
      return '*'
    case UploadType.system:
      return (
        '.zip,.bin,.uf2,.json,.g,.csv,.xml' + (useMachinesModelStore().sbc !== null ? ',.deb' : '')
      )
    case UploadType.web:
      return '.zip,.csv,.json,.htm,.html,.ico,.xml,.css,.map,.js,.ttf,.eot,.svg,.woff,.woff2,.jpeg,.jpg,.png,.gz'
    case UploadType.plugin:
      return '.zip'
    case UploadType.update:
      return '.zip,.bin,.uf2'
    default:
      return undefined
  }
})
const destinationDirectory = computed(() => {
  if (props.directory) {
    return props.directory
  }

  switch (props.target) {
    case UploadType.gcodes:
      return useMachinesModelStore().directories.gCodes
    case UploadType.start:
      return useMachinesModelStore().directories.gCodes
    case UploadType.firmware:
      return useMachinesModelStore().directories.firmware
    case UploadType.macros:
      return useMachinesModelStore().directories.macros
    case UploadType.filaments:
      return useMachinesModelStore().directories.filaments
    case UploadType.menu:
      return useMachinesModelStore().directories.menu
    case UploadType.system:
      return useMachinesModelStore().directories.system
    case UploadType.web:
      return useMachinesModelStore().directories.web
    case UploadType.plugin:
      return undefined // not applicable
    case UploadType.update:
      return useMachinesModelStore().directories.firmware
    default:
      return undefined
  }
})
const isBusy = computed(() => {
  return extracting.value || uploading.value
})
const confirmFirmwareReset = computed({
  get() {
    return !confirmUpdate.value && confirmReset.value
  },
  set(newValue) {
    confirmReset.value = newValue
  },
})
const multipleUpdates = computed(() => {
  let numUpdates = updates.value.firmwareBoards.length
  numUpdates += updates.value.wifiServer ? 1 : 0
  numUpdates += updates.value.wifiServerSpiffs ? 1 : 0
  numUpdates += updates.value.display ? 1 : 0
  return numUpdates > 1
})

watch(isConnected, (newVal, oldVal) => {
  if (
    newVal &&
    useRootStore().selectedMachine === location.host &&
    updates.value.codeSent &&
    updates.value.webInterface
  ) {
    // Reload the web interface when the connection could be established again
    location.reload(true)
  }
})

const fileInput = ref<HTMLInputElement | null>(null)
</script>

<script lang="ts">
/**
 * Types of uploads
 */
export enum UploadType {
  /**
   * Upload to /gcodes
   */
  gcodes = 'gcodes',

  /**
   * Upload & start (to /gcodes)
   */
  start = 'start',

  /**
   * Upload to /macros
   */
  macros = 'macros',

  /**
   * Upload to /filaments
   */
  filaments = 'filaments',

  /**
   * Upload to /firmware (used to be /sys)
   */
  firmware = 'firmware',

  /**
   * Upload to /menu
   */
  menu = 'menu',

  /**
   * Upload to /sys
   */
  system = 'system',

  /**
   * Upload to /www
   */
  web = 'web',

  /**
   * Upload for plugin installation
   */
  plugin = 'plugin',

  /**
   * Upload for general updates (firmware, web interface)
   */
  update = 'update',
}
</script>
