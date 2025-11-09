<template>
  <!-- <div class="w-full flex flex-row gap-1.5"> -->
  <!-- TODO this is completely scuffed -->
  <div>
    <Command className="rounded-lg border shadow-md md:min-w-[450px]">
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem value="calendar"> Calendar </CommandItem>
          <CommandItem value="search-emoji"> Search Emoji </CommandItem>
          <CommandItem value="calculator"> Calculator </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem value="profile"> Profile </CommandItem>
          <CommandItem value="billing"> Billing </CommandItem>
          <CommandItem value="settings"> Settings </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>

    <Combobox v-model="code" by="value" class="w-full m-2">
      <ComboboxAnchor>
        <div class="relative w-full">
          <ComboboxInput
            ref="input"
            :disabled="uiFrozen"
            :placeholder="$t('input.code.placeholder')"
            :display-value="(val) => val?.text ?? val ?? ''"
            maxlength="255"
            :loading="doingCode"
            @click="click"
            @keyup.down="showItems = true"
            @blur="wasFocused = showItems = ignoreEnter = false"
            @change="change"
            @keyup.enter="sendOnEnter"
            @update:model-value="code = $event ?? ''"
          />
          <span class="absolute start-0 inset-y-0 flex items-center justify-center px-3">
            <Search class="size-4 text-muted-foreground" />
          </span>
        </div>
      </ComboboxAnchor>

      <ComboboxList v-if="showItems">
        <ComboboxEmpty v-if="!displayedCodes.length">
          {{ t('input.code.noMatch') }}
        </ComboboxEmpty>
        <ComboboxGroup>
          <ComboboxItem
            v-for="item in displayedCodes"
            :key="item.value"
            :value="item"
            class="flex items-center gap-2"
          >
            <code>{{ item.text }}</code>
            <Button
              variant="ghost"
              size="icon"
              @click.prevent.stop="removeLastSentCode(item.value)"
            >
              <Delete class="w-4 h-4" />
            </Button>
          </ComboboxItem>
        </ComboboxGroup>
      </ComboboxList>
    </Combobox>
  </div>

  <!-- 
    <Input
      :disabled="uiFrozen"
      :loading="doingCode"
      maxlength="255"
      @click="click"
      @keyup.down="showItems = true"
      @blur="wasFocused = showItems = ignoreEnter = false"
      @change="change"
      @keyup.enter="sendOnEnter"
      @update:search-input="code = $event ?? ''"
      :search-input="code instanceof Object ? code.value : (code ?? '')"
      :items="displayedCodes"
      id="email"
      type="email"
      :placeholder="$t('input.code.placeholder')"
    />
    <Button :disabled="uiFrozen" :loading="doingCode" @click="send" type="submit">
      <SendHorizontal class="w-4 h-4 mr-2" /> {{ $t('input.code.send') }}
    </Button> -->
  <!-- </div> -->
</template>

<script setup lang="ts">
import {
  Combobox,
  ComboboxAnchor,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { useRootStore } from '@/stores'
import { useMachinesCacheStore } from '@/stores/machineCache'
import { useMachinesModelStore } from '@/stores/machineModel'
import { useMachinesStore } from '@/stores/machines'
import { useSettingsStore } from '@/stores/settings'
import { MessageBox } from '@duet3d/objectmodel'
import { Delete, Search } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '../ui/button'

const { t } = useI18n()

const conditionalKeywords = [
  'abort',
  'echo',
  'if',
  'elif',
  'else',
  'while',
  'break',
  'continue',
  'var',
  'global',
  'set',
]

let code = ref<string | { value: string }>('')
let ignoreEnter = ref(false)
let wasFocused = ref(false)
let showItems = ref(false)
let sendPending = ref(false)
let doingCode = ref(false)

let { uiFrozen } = storeToRefs(useRootStore())
let { state } = storeToRefs(useMachinesModelStore())
let { lastSentCodes } = storeToRefs(useMachinesCacheStore())
let props = defineProps({
  grow: Boolean,
  solo: Boolean,
})

let displayedCodes = computed(() => {
  if (showItems && !useSettingsStore().disableAutoComplete) {
    const currentCode = (
      code.value instanceof Object ? code.value.value : (code.value ?? '')
    ).toLowerCase()
    return lastSentCodes.value
      .filter((_code) => currentCode === '' || _code.toLowerCase().includes(currentCode))
      .map((_code) => ({ text: _code, value: _code }))
      .reverse()
  }
  return []
})

let messageBox = computed(() => {
  return state.value.messageBox as MessageBox | null
})

function click() {
  if (wasFocused.value) {
    showItems.value = !showItems.value
  } else {
    wasFocused.value = true
  }
}

function removeLastSentCode(code: string) {
  useMachinesCacheStore().removeLastSentCode(code)
}

function change(value: string | { value: string } | null) {
  code.value = value !== null ? value : ''
}

function hasUnprecedentedParameters(_code: string) {
  return !_code || /(M23|M28|M30|M32|M36|M117)[^0-9]/i.test(_code)
}

async function sendOnEnter() {
  if (ignoreEnter.value) {
    ignoreEnter.value = false
  } else {
    await send()
  }
}

watch(code, (newVal, oldVal) => {
  if (typeof newVal === 'string' && newVal.length >= 2) {
    showItems.value = true
  }
})

watch(messageBox, (newVal, oldVal) => {
  if (newVal) {
    // Don't handle "Enter" immediately when returning from a message box
    ignoreEnter.value = true
    setTimeout(() => (ignoreEnter.value = false), 1000)
  }
})

async function send() {
  ignoreEnter.value = false
  showItems.value = false

  const _code = code.value instanceof Object ? code.value.value : code.value
  if (_code.trim() !== '' && !doingCode.value) {
    let codeToSend = '',
      bareCode = '',
      inQuotes = false,
      inExpression = false,
      inWhiteSpace = false,
      inComment = false
    if (
      !hasUnprecedentedParameters(codeToSend) &&
      !conditionalKeywords.some((keyword) => _code.trim().startsWith(keyword))
    ) {
      // Convert code to upper-case and remove comments
      for (let i = 0; i < _code.length; i++) {
        const char = code[i]
        if (inQuotes) {
          if (i < _code.length - 1 && char === '\\' && _code[i + 1] === '"') {
            codeToSend += '\\"'
            i++
          } else {
            if (char === '"') {
              inQuotes = false
            }
            codeToSend += char
          }
        } else if (inExpression) {
          codeToSend += char
          inExpression = char !== '}'
        } else if (inComment) {
          codeToSend += char
          inComment = char !== ')'
        } else {
          if (char === '"') {
            // don't convert escaped strings
            inQuotes = true
          } else if (char === ' ' || char === '\t') {
            // remove duplicate white spaces
            if (inWhiteSpace) {
              continue
            }
            inWhiteSpace = true
          } else if (char === ';') {
            // stop when final comments start
            break
          } else if (char === '(') {
            // don't process chars from encapsulated comments
            inComment = true
          } else if (char === '{') {
            // don't process chars from expressions
            inExpression = true
          }
          inWhiteSpace = false
          codeToSend += char.toUpperCase()
          bareCode += _code.toUpperCase()
        }
      }
    } else {
      // Don't modify the user input
      codeToSend = _code
    }

    // Send the code and wait for completion
    doingCode.value = true
    try {
      const reply = await useMachinesStore().sendCode({
        code: codeToSend,
        fromInput: true,
      })

      if (
        !inQuotes &&
        !useSettingsStore().disableAutoComplete &&
        !reply!.startsWith('Error: ') &&
        !reply!.startsWith('Warning: ') &&
        bareCode.indexOf('M587') === -1 &&
        bareCode.indexOf('M589') === -1
      ) {
        // Automatically remember successful codes
        useMachinesCacheStore().addLastSentCode(codeToSend.trim())
      }
    } catch {
      // handled before we get here
    }
    doingCode.value = false
  }
}
</script>
