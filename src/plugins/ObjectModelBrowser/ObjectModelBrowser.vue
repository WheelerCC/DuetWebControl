<template>
  <div class="grid grid-cols-1 md:grid-cols-2">
    <div ref="leftContainer" :cols="active.length === 0 ? 12 : 6">
      {{ modelTree }}
      <!-- <v-treeview :items="modelTree" open-on-click activatable v-model:active="active">
        <template #label="{ item }">
          {{ item.getLabel() }}
        </template>
        <template #append="{ item }">
          <Badge v-if="item.type">
            {{ item.type }}
          </Badge>
        </template>
      </v-treeview> -->

      <div class="flex justify-center">
        <Button v-show="active.length === 0" :disabled="uiFrozen" @click="refresh">
          <RefreshCwIcon />
          {{ $t('button.refresh.caption') }}
        </Button>
      </div>
    </div>
    <div ref="rightContainer" v-show="active.length !== 0" class="flex">
      <div>
        {{ $t('plugins.objectModelBrowser.selectedNode') }}
        <template v-if="active.length > 0">
          <input
            ref="activeInput"
            type="text"
            :value="active[0]"
            class="text-center"
            :class="darkTheme ? 'white--text' : ''"
            readonly
            @click="selectInput"
          />
          <Copy @click="copy" />
        </template>
        <template v-else>
          {{ $t('plugins.objectModelBrowser.none') }}
        </template>
      </div>
      <Button :disabled="uiFrozen" @click="refresh">
        <RefreshCwIcon />
        {{ $t('button.refresh.caption') }}
      </Button>

      <Alert :value="apiFileError !== null" outlined type="warning">
        {{ $t('plugins.objectModelBrowser.documentationNotAvailable') }}
      </Alert>

      <div v-show="apiDocumentation !== null" outlined class="pa-3">
        <template v-if="apiDocumentationSummary !== null">
          <h4>{{ $t('plugins.objectModelBrowser.summary') }}</h4>
          <span v-html="apiDocumentationSummary"></span>
        </template>

        <template v-if="apiDocumentationRemarks !== null">
          <br v-if="apiDocumentationSummary !== null" />
          <h4>{{ $t('plugins.objectModelBrowser.remarks') }}</h4>
          <span v-html="apiDocumentationRemarks"></span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useRootStore } from '@/stores'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { useSettingsStore } from '@/stores/settings'
import { getErrorMessage } from '@/utils/errors'
import { DriverId, isDriverId } from '@duet3d/objectmodel'
import { Copy, RefreshCwIcon } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

let activeInputRef = useTemplateRef('activeInput')
let rightContainerRef = useTemplateRef('rightContainer')
let leftContainerRef = useTemplateRef('leftContainer')
let { t } = useI18n()
// List of regexs to resolve properties in the XML documentation.
// It's a shame the C# XML compiler doesn't include the property types...
const propertyAdjustments = [
  { pattern: /(\[\d+\])+$/g, substitute: '' },
  { pattern: /s\[\d+\]/g, substitute: '' },
  { pattern: /.+\.mcutemp\./, substitute: 'minmaxcurrent`1.' },
  { pattern: /.+\.v12\./, substitute: 'minmaxcurrent`1.' },
  { pattern: /.+\.vin\./, substitute: 'minmaxcurrent`1.' },
  { pattern: 'fan.thermostatic', substitute: 'fanthermostaticcontrol' },
  { pattern: /^input\./, substitute: 'inputchannel.' },
  { pattern: 'heat.heater.model.pid.', substitute: 'heatermodelpid.' },
  { pattern: 'job.file.', substitute: 'parsedfileinfo.' },
  { pattern: 'parsedfileinfo.thumbnail.', substitute: 'parsedthumbnail.' },
  { pattern: 'move.axe.', substitute: 'axis.' },
  { pattern: /^move.calibration.(final|initial)./, substitute: 'movedeviations.' },
  { pattern: 'move.idle.', substitute: 'motorsidlecontrol.' },
  { pattern: /^move.queue\[\d+\]\./, substitute: 'movequeueitem.' },
  { pattern: /^sensors.analog\[\d+\]\./, substitute: 'analogsensor.' },
  { pattern: /^sensors.gpin\[\d+\]\./, substitute: 'gpinputport.' },
  { pattern: /^state.gpout\[\d+\]\./, substitute: 'gpoutputport.' },
]

interface ModelTreeItem {
  id: string
  getLabel: () => string | number
  type: 'array' | 'object' | 'value'
  children: Array<ModelTreeItem>
}

let { uiFrozen } = storeToRefs(useRootStore())
let { darkTheme } = storeToRefs(useSettingsStore())
let { model } = storeToRefs(useMachinesModelStore())

let active = ref<string[]>([])
let modelTree = ref<ModelTreeItem[]>([])
let apiFile = ref<Document | null>(null)
let apiFileError = ref(null)
let documentationFloating = ref(false)

let apiDocumentation = computed(() => {
  if (apiFile.value !== null && active.value.length > 0) {
    let selectedNode = active.value[0].toLowerCase()
    propertyAdjustments.forEach(
      (item) => (selectedNode = selectedNode.replace(item.pattern, item.substitute)),
    )
    // NOTE: If kinematics properties are queried, they may need require treatment here

    const propertyNames = [selectedNode],
      segments = selectedNode.split('.')
    if (segments.length > 2) {
      propertyNames.push(
        `${segments[0]}${segments[1]}.${segments.slice(2).reduce((a, b) => a + '.' + b)}`,
      )
      propertyNames.push(segments.slice(1).reduce((a, b) => a + '.' + b))
      if (segments.length > 3) {
        propertyNames.push(
          `${segments[0]}${segments[1]}${segments[2]}.${segments.slice(3).reduce((a, b) => a + '.' + b)}`,
        )
        propertyNames.push(segments.slice(2).reduce((a, b) => a + '.' + b))
      }
    }

    const members = apiFile.value.documentElement.getElementsByTagName('member')
    for (let i = 0; i < propertyNames.length; i++) {
      const propertyName = propertyNames[i]
      for (let k = 0; k < members.length; k++) {
        const node = members[k],
          tagName = node.getAttribute('name')
        if (tagName!.startsWith('P:') && tagName!.toLowerCase().endsWith(propertyName)) {
          return node
        }
      }
    }
  }
  return null
})
let apiDocumentationSummary = computed(() => {
  if (apiDocumentation.value !== null) {
    const nodes: ArrayLike<Element> = apiDocumentation.value.getElementsByTagName('summary')
    console.log(nodes)
    return nodes.length === 0
      ? null
      : nodes[0].innerHTML
          .trim()
          .replace(/\n/g, '<br>')
          .replace(/<see cref="P:DuetAPI\.ObjectModel\.(.*)".*\/>/g, '$1')
  }
  return null
})
let apiDocumentationRemarks = computed(() => {
  if (apiDocumentation.value !== null) {
    const nodes: ArrayLike<Element> = apiDocumentation.value.getElementsByTagName('remarks')
    return nodes.length === 0
      ? null
      : nodes[0].innerHTML
          .trim()
          .replace(/\n/g, '<br>')
          .replace(/<see cref="P:DuetAPI\.ObjectModel\.(.*)".*\/>/g, '$1')
  }
  return null
})

function makeModelTree(
  obj: object | Array<any> | null,
  path: Array<string>,
  parentObj?: any,
): Array<ModelTreeItem> {
  //   if (obj instanceof Array) {
  //     const that = this
  //     return obj.map((item, index) => {
  //       const itemPath = path.slice(0),
  //         parentPropertyName = itemPath[itemPath.length - 1]
  //       itemPath[itemPath.length - 1] += `[${index}]`

  //       return {
  //         id: itemPath.join('.'),
  //         // FIXME Vue 2 requires the array's parent object to be referenced, should be obsolete in Vue 3
  //         getLabel: () => {
  //           if (parentObj instanceof Map) {
  //             return that.getItemLabel(index, parentObj.get(parentPropertyName)[index])
  //           }
  //           return parentPropertyName.includes('[')
  //             ? item.toString()
  //             : that.getItemLabel(index, parentObj[parentPropertyName][index])
  //         },
  //         type: that.getItemType(item),
  //         children: that.makeModelTree(item, itemPath, obj),
  //       }
  //     })
  //   } else if (obj instanceof Map) {
  //     return Array.from(obj.keys())
  //       .sort()
  //       .map((key) => {
  //         const itemPath = path.slice(0)
  //         itemPath.push(key)

  //         return {
  //           id: itemPath.join('.'),
  //           getLabel: () => getItemLabel(key, obj.get(key)),
  //           type: getItemType(obj.get(key)),
  //           children: makeModelTree(obj.get(key), itemPath, obj),
  //         }
  //       })
  //   } else if (!isDriverId(obj) && obj instanceof Object) {
  //     return Object.keys(obj)
  //       .sort()
  //       .map((key) => {
  //         const itemPath = path.slice(0)
  //         itemPath.push(key)

  //         return {
  //           id: itemPath.join('.'),
  //           getLabel: () => getItemLabel(key, (obj as any)[key]),
  //           type: getItemType((obj as any)[key]),
  //           children: makeModelTree((obj as any)[key], itemPath, obj),
  //         }
  //       })
  //   }
  return []
}
function getItemLabel(name: string | number, value: any) {
  try {
    if (value === null) {
      return `${name} = null`
    }
    if (typeof value === 'string' && (value || value === '')) {
      return `${name} = "${value}"`
    }
    if (isDriverId(value)) {
      // FIXME: No longer needed once upgraded to Vue 3
      const driverId = new DriverId()
      driverId.update(value)
      return `${name} = "${driverId.toString()}"`
    }
    if (value instanceof Object) {
      return name
    }
    return `${name} = ${value}`
  } catch {
    return `${name} = ${t('generic.noValue')}`
  }
}
function getItemType(obj: any) {
  if (obj instanceof Array) {
    return 'array'
  }
  if (obj !== null && !isDriverId(obj) && obj instanceof Object) {
    return 'object'
  }
  return 'value'
}
function selectInput(e: Event) {
  ;(e.target as HTMLInputElement).select()
}
function copy() {
  activeInputRef.value?.focus()
  activeInputRef.value?.select()
  document.execCommand('copy')
}
function refresh() {
  modelTree.value = makeModelTree(model.value, [])
}
function onScroll() {
  //   const rightContainer = this.$refs.rightContainer as HTMLDivElement
  //   const documentationTop = rightContainer.getBoundingClientRect().y
  //   if (
  //     (this.$refs.leftContainer as HTMLDivElement).getBoundingClientRect().y === documentationTop &&
  //     documentationTop < 64
  //   ) {
  //     rightContainer.style.paddingTop = `${-documentationTop + 60}px`
  //   } else {
  //     rightContainer.style.paddingTop = '0px'
  //   }
}

watch(active, (newVal, oldVal) => {
  if (newVal.length > 0) {
    nextTick(() => {
      onScroll()

      const activeInput = activeInputRef.value
      if (activeInput) {
        activeInput.style.width = '0px'
        nextTick(() => {
          activeInput.style.width = `${activeInput.scrollWidth + 8}px`
        })
      }
    })
  }
})

onMounted(async () => {
  if (apiFile.value === null) {
    try {
      const apiFileContent = await useMachinesStore().download({
        filename: 'DuetAPI.xml',
        type: 'text',
        showError: false,
        showSuccess: false,
        rawPath: true,
      })

      const parser = new DOMParser()
      apiFile.value = parser.parseFromString(apiFileContent[0].content, 'application/xml')
      apiFileError.value = null
    } catch (e) {
      apiFileError.value = getErrorMessage(e)
      console.warn(e)
    }
  }
  refresh()
})
</script>
