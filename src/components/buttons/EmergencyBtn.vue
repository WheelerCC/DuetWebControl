<template>
  <code-btn
    v-bind="$props"
    :code="'M112\nM999'"
    :log="false"
    :color="color || 'error'"
    :disabled="$props.disabled || isDisabled"
    :title="$t('button.emergencyStop.title')"
  >
    <v-icon class="mr-1"> mdi-flash </v-icon>
    <span class="hidden-xs-only">
      {{ $t('button.emergencyStop.caption') }}
    </span>
  </code-btn>
</template>

<script lang="ts">
import eventbus from '@/utils/eventbus'
import { defineComponent } from 'vue'

export default defineComponent({
  props: {
    color: {
      type: String,
      default: null,
    },
  },
  data() {
    return {
      isDisabled: false,
    }
  },
  mounted() {
    eventbus.$on('dialog-closing', this.onDialogClosing)
  },
  beforeUnmount() {
    eventbus.$off('dialog-closing', this.onDialogClosing)
  },
  methods: {
    onDialogClosing() {
      this.isDisabled = true

      const that = this
      setTimeout(function () {
        that.isDisabled = false
      }, 500)
    },
  },
})
</script>
