<template>
  <div>
    <!-- <v-dialog v-model="internalShown" persistent width="720" @keydown.escape="dismissed">
    <v-card>
      <v-card-title>
        <span class="headline">
          {{ $t('dialog.update.title') }}
        </span>
      </v-card-title>

      <v-card-text>
        {{ $t('dialog.update.prompt') }}

        <v-checkbox
          v-if="includesWiFiFirmware"
          :input-value="updateWiFiFirmware"
          :label="$t('dialog.update.updateWiFiFirmware')"
          class="mt-3"
          hide-details
          @change="$emit('update:updateWiFiFirmware', $event)"
        />

        <v-alert :value="!!dsfVersion && isDuetFirmware" type="warning" class="mt-3">
          {{ $t('dialog.update.sbcWarning') }}
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="blue darken-1" text @click="dismissed">
          {{ $t('generic.no') }}
        </v-btn>
        <v-btn color="blue darken-1" text @click="confirmed">
          {{ $t('generic.yes') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog> -->
  </div>
</template>

<script setup lang="ts">
import { useMachinesModelStore } from '@/stores/machineModel'
import { computed, ref, watch } from 'vue'

const emit = defineEmits(['confirmed', 'dismissed', 'update:shown'])
const props = defineProps({
  multipleUpdates: Boolean,
  updateWiFiFirmware: Boolean,
  initshown: {
    type: Boolean,
    required: true,
  },
})

const _shown = ref(props.initshown)
const includesWiFiFirmware = ref(false)
const shown = ref({
  get(): boolean {
    return _shown.value
  },
  set(value: boolean) {
    _shown.value = value
    if (value) {
      confirmed()
    } else {
      dismissed()
    }
  },
})

watch(shown, (newVal, oldVal) => {
  if (newVal) {
    includesWiFiFirmware.value = props.multipleUpdates && props.updateWiFiFirmware
  }
})

const isDuetFirmware = computed(() => {
  return useMachinesModelStore().boards.length > 0 &&
    useMachinesModelStore().boards[0].firmwareFileName
    ? useMachinesModelStore().boards[0].firmwareFileName.startsWith('Duet')
    : true
})
const dsfVersion = computed(() => {
  return useMachinesModelStore().sbc?.dsf.version ?? null
})

function confirmed() {
  emit('confirmed')
  emit('update:shown', false)
}
function dismissed() {
  emit('dismissed')
  emit('update:shown', false)
}
</script>
