<template>
  <CodeBtn
    class="h-15"
    v-bind="$props"
    :code="'M112\nM999'"
    :log="false"
    variant="destructive"
    :disabled="isDisabled"
    :title="$t('button.emergencyStop.title')"
  >
    <Zap />
    {{ $t('button.emergencyStop.caption') }}
  </CodeBtn>
</template>

<script setup lang="ts">
import eventbus from '@/utils/eventbus'
import { Zap } from 'lucide-vue-next'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import CodeBtn from './CodeBtn.vue'

const isDisabled = ref(false)

onMounted(() => {
  eventbus.$on('dialog-closing', onDialogClosing)
})

onBeforeUnmount(() => {
  eventbus.$off('dialog-closing', onDialogClosing)
})

function onDialogClosing() {
  isDisabled.value = true
  setTimeout(() => {
    isDisabled.value = false
  }, 500)
}
</script>
