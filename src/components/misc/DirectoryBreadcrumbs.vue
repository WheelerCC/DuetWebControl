<template>
  <Breadcrumb>
    <BreadcrumbList>
      <template v-for="(item, index) in pathItems" :key="item.href">
        <BreadcrumbItem>
          <DropdownMenu v-if="item.showDropdown">
            <DropdownMenuTrigger as-child>
              <BreadcrumbLink class="flex items-center gap-1">
                {{ item.title }}
                <ChevronDownIcon class="h-4 w-4" />
              </BreadcrumbLink>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                v-if="firmwareDirectoryDiffers"
                @click="changeDirectory(directories.firmware)"
              >
                <BinaryIcon />
                {{ t('directory.firmware') }}
              </DropdownMenuItem>
              <DropdownMenuItem v-if="hasDirectDisplay" @click="changeDirectory(directories.menu)">
                <ListOrderedIcon />
                {{ t('directory.menu') }}
              </DropdownMenuItem>
              <DropdownMenuItem @click="changeDirectory(directories.system)">
                <Cog class="mr-3 h-4 w-4" />
                {{ t('directory.system') }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <!-- Regular Breadcrumb Item -->
          <BreadcrumbLink v-else @click="changeDirectory(item.href)">
            <!-- {{ item.title }} -->
            {{ item.href }}
          </BreadcrumbLink>
        </BreadcrumbItem>

        <!-- Separator (don't show after last item) -->
        <BreadcrumbSeparator v-if="index < pathItems.length - 1">
          {{ '/' }}
        </BreadcrumbSeparator>
      </template>
    </BreadcrumbList>
  </Breadcrumb>

  <!-- <v-breadcrumbs :items="pathItems" divider=">">
    <template #item="{ item }">
      <v-menu v-if="item.showDropdown" offset-y>
        <template #activator="{ props }">
          <v-breadcrumbs-item
            v-bind="props"
            href="javascript:void(0)"
            @dragover="item.href && dragOver(item.href, $event)"
            @drop.prevent="item.href && dragDrop(item.href, $event)"
          >
            {{ item.title }}
            <v-icon class="ml-1"> mdi-menu-down </v-icon>
          </v-breadcrumbs-item>
        </template>
        <v-list>
          <v-list-item
            v-if="firmwareDirectoryDiffers"
            @click="changeDirectory(directories.firmware)"
          >
            <v-icon class="mr-3"> mdi-update </v-icon> {{ $t('directory.firmware') }}
          </v-list-item>
          <v-list-item v-if="hasDirectDisplay" @click="changeDirectory(directories.menu)">
            <v-icon class="mr-3"> mdi-format-list-numbered </v-icon> {{ $t('directory.menu') }}
          </v-list-item>
          <v-list-item @click="changeDirectory(directories.system)">
            <v-icon class="mr-3"> mdi-cog </v-icon> {{ $t('directory.system') }}
          </v-list-item>
        </v-list>
      </v-menu>
      <v-breadcrumbs-item
        v-else
        href="javascript:void(0)"
        :disabled="item.disabled"
        @click="item.href && changeDirectory(item.href)"
        @dragover="item.href && dragOver(item.href, $event)"
        @drop.prevent="item.href && dragDrop(item.href, $event)"
      >
        {{ item.title }}
      </v-breadcrumbs-item>
    </template>
  </v-breadcrumbs> -->
</template>

<script setup lang="ts">
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const directory = defineModel<string>('directory', { required: true })

import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { getErrorMessage } from '@/utils/errors'
import { log, LogType } from '@/utils/logging'

import { combine, equals, pathObj, startsWith } from '@/utils/path'
import { BinaryIcon, ChevronDownIcon, Cog, ListOrderedIcon } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { isBaseFileListDataTransfer } from '../table/columns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

let { t } = useI18n()

interface BreadcrumbItem {
  showDropdown: boolean
  title: string
  disabled: boolean
  href: string
}

let { directories } = storeToRefs(useMachinesModelStore())

const emit = defineEmits(['input'])

function changeDirectory(_directory: string) {
  directory.value = _directory
}

function dragOver(_directory: string, e: DragEvent) {
  if (e.dataTransfer === null) {
    return
  }

  const jsonData = e.dataTransfer.getData('application/json')
  if (jsonData) {
    const data = JSON.parse(jsonData)
    if (
      isBaseFileListDataTransfer(data) &&
      !data.items.some(
        (dataItem) => dataItem.isDirectory && _directory === combine(data.directory, dataItem.name),
      )
    ) {
      e.preventDefault()
      e.stopPropagation()
    }
  } else {
    // Fix for Chrome: It does not grant access to dataTransfer on the same domain "for security reasons"...
    e.preventDefault()
    e.stopPropagation()
  }
}
async function dragDrop(_directory: string, e: DragEvent) {
  if (e.dataTransfer === null) {
    return
  }

  const jsonData = e.dataTransfer.getData('application/json')
  if (jsonData) {
    const data = JSON.parse(jsonData)
    if (
      isBaseFileListDataTransfer(data) &&
      !data.items.some(
        (dataItem) => dataItem.isDirectory && _directory === combine(data.directory, dataItem.name),
      )
    ) {
      const data = JSON.parse(jsonData)
      for (let i = 0; i < data.items.length; i++) {
        const from = combine(data.directory, data.items[i].name)
        const to = combine(_directory, data.items[i].name)
        try {
          await useMachinesStore().move({ from, to })
        } catch (e) {
          log(LogType.error, t('error.move', [data.items[i].name, _directory]), getErrorMessage(e))
          break
        }
      }
    }
  }
}

let pathItems = computed(() => {
  let pathItems = directory.value.split('/')
  if (pathItems[0] === '') {
    pathItems[0] = '0:'
  }
  pathItems = pathItems.filter((item) => item !== '')

  let rootCaption = pathItems.length === 0 ? t('generic.noValue') : pathItems[0],
    showDropdown = false
  if (pathItems.length > 1) {
    if (startsWith(directory.value, directories.value.gCodes)) {
      pathItems.shift()
      pathItems[0] = directories.value.gCodes
      rootCaption = t('directory.gcodes')
    } else if (startsWith(directory.value, directories.value.macros)) {
      pathItems.shift()
      pathItems[0] = directories.value.macros
      rootCaption = t('directory.macros')
    } else if (startsWith(directory.value, directories.value.filaments)) {
      pathItems.shift()
      pathItems[0] = directories.value.filaments
      rootCaption = t('directory.filaments')
    } else if (startsWith(directory.value, directories.value.menu)) {
      pathItems.shift()
      pathItems[0] = directories.value.menu
      rootCaption = t('directory.menu')
      showDropdown = true
    } else if (startsWith(directory.value, pathObj.system)) {
      pathItems.shift()
      pathItems[0] = pathObj.system
      rootCaption = t('directory.system')
      showDropdown = true
    } else if (startsWith(directory.value, directories.value.system)) {
      pathItems.shift()
      pathItems[0] = directories.value.system
      rootCaption = t('directory.system')
      showDropdown = true
    } else if (startsWith(directory.value, directories.value.firmware)) {
      pathItems.shift()
      pathItems[0] = directories.value.firmware
      rootCaption = t('directory.firmware')
      showDropdown = true
    } else if (startsWith(directory.value, directories.value.web)) {
      pathItems.shift()
      pathItems[0] = directories.value.web
      rootCaption = t('directory.web')
    }
  }
  showDropdown =
    showDropdown &&
    pathItems.length === 1 &&
    (hasDirectDisplay.value || firmwareDirectoryDiffers.value)

  let items: Array<BreadcrumbItem> = [],
    path = '',
    index = 0
  for (const item of pathItems) {
    path = combine(path, item)
    if (index === 0) {
      items.push({
        showDropdown,
        title: item.startsWith('0:') ? rootCaption : t('generic.sdCard', [/^(\d+)/.exec(item)![1]]),
        disabled: !showDropdown && index === pathItems.length - 1,
        href: path,
      })
    } else {
      items.push({
        showDropdown: false,
        title: item,
        disabled: index === pathItems.length - 1,
        href: path,
      })
    }
    index++
  }
  return items
})

let firmwareDirectoryDiffers = computed(() => {
  return !equals(directories.value.firmware, directories.value.system)
})

let hasDirectDisplay = computed(() => {
  return (
    useMachinesModelStore().boards.length > 0 &&
    useMachinesModelStore().boards[0].directDisplay !== null
  )
})
</script>
