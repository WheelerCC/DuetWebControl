filepath: /Users/william/DuetWebControl/src/components/misc/NotificationDisplay.vue
<template>
  <!-- File Transfer Notification -->
  <!-- <Snackbar
    v-if="fileTransferNotification"
    open
    color="info"
    :timeout="-1"
    class="fixed left-0 right-0 top-0 z-50 rounded shadow"
  >
    <Progress
      :color="progressColor"
      :indeterminate="fileTransferNotification.progress === 0"
      :value="fileTransferNotification.progress"
      striped
      class="absolute left-0 right-0 top-0 rounded"
    />

    <div class="flex items-center mt-1">
      <Icon :name="fileTransferIcon" class="mr-4" />
      <div>
        <strong>
          {{
            t(`notification.${fileTransferNotification.type}.title`, [
              fileTransferNotification.filename,
              displayTransferSpeed(fileTransferNotification.speed),
              Math.round(fileTransferNotification.progress || 0),
            ])
          }}
        </strong>
        <p class="mb-0">
          {{ t(`notification.${fileTransferNotification.type}.message`) }}
        </p>
      </div>
    </div>
    <template #actions>
      <Button color="white" variant="ghost" @click.stop="cancel">
        {{ t('generic.cancel') }}
      </Button>
    </template>
  </Snackbar>

  <Snackbar
    v-else-if="notification"
    open
    :color="notification.type || 'info'"
    :timeout="-1"
    @click="clicked"
  >
    <Progress
      v-if="animateProgress"
      ref="progressBar"
      :color="progressColor"
      :indeterminate="notification.progress === 0"
      :model-value="100"
      class="animate-progress"
    />
    <Progress
      v-else-if="notification.progress !== null"
      :color="progressColor"
      :indeterminate="notification.progress === 0"
      :model-value="notification.progress"
    />

    <div
      class="flex items-center"
      :class="{ 'mt-1': notification.timeout && notification.timeout > 0 }"
    >
      <Icon v-if="notification.icon" :name="notification.icon" class="mr-4" />
      <div>
        <strong v-if="notification.title" v-html="notificationTitle" />
        <p v-if="notification.message" class="mb-0" v-html="notificationMessage" />
      </div>
    </div>
    <template #actions>
      <Button color="white" variant="ghost" @click.stop="close">
        {{ notification.cancel ? t('generic.cancel') : t('generic.close') }}
      </Button>
    </template>
  </Snackbar> -->
  <div></div>
</template>

<script setup lang="ts">
// import { displayTransferSpeed } from '@/utils/display'
// import { FileTransferType, Notification } from '@/utils/notifications'
// import { computed, nextTick, ref, watch } from 'vue'
// import { useI18n } from 'vue-i18n'

// // Replace these with your shadcn-vue or custom equivalents
// import { Button } from '@/components/ui/button'
// import { Progress } from '@/components/ui/progress'
// const { t } = useI18n()

// const autoCloseTimer = ref<NodeJS.Timeout | null>(null)
// const fileTransferNotifications = ref<any>(null)
// const notifications = ref<any>(null)
// const whenShown = ref<Date | null>(null)

// const progressBar = ref<HTMLElement | null>(null)

// const fileTransferNotification = computed<Notification | null>(() =>
//   fileTransferNotifications.value.length > 0 ? fileTransferNotifications.value[0] : null,
// )
// const notification = computed<Notification | null>(() =>
//   notifications.value.length > 0 ? notifications.value[0] : null,
// )

// const animateProgress = computed(
//   () => notification.value && notification.value.timeout !== null && notification.value.timeout > 0,
// )

// const progressColor = computed(() => {
//   // Replace with your theme logic if needed
//   return document.documentElement.classList.contains('dark') ? 'gray-800' : 'gray-200'
// })

// const fileTransferIcon = computed(() => {
//   if (fileTransferNotification.value) {
//     switch (fileTransferNotification.value.type) {
//       case FileTransferType.upload:
//         return 'cloud-upload'
//       case FileTransferType.download:
//         return 'cloud-download'
//       case FileTransferType.systemPackageInstall:
//         return 'cog-sync'
//       default:
//         return ''
//     }
//   }
//   return ''
// })

// const notificationTitle = computed(() =>
//   notification.value && notification.value.title
//     ? notification.value.title.replace(/\n/g, '<br>')
//     : '',
// )
// const notificationMessage = computed(() =>
//   notification.value && notification.value.message
//     ? notification.value.message.replace(/\n/g, '<br>')
//     : '',
// )

// // Watchers
// watch(notification, (to, from) => {
//   notificationChanged(to, from)
// })
// watch(fileTransferNotification, (to) => {
//   if (notification.value) {
//     if (to) {
//       notificationChanged(null, notification.value)
//     } else {
//       notificationChanged(notification.value, null)
//     }
//   }
// })

// // Methods
// function clicked() {
//   if (notification.value && notification.value.route) {
//     window.location.href = notification.value.route
//     notification.value.close?.()
//   }
// }

// function cancel() {
//   fileTransferNotification.value?.cancel?.()
// }

// function close() {
//   if (notification.value?.cancel) {
//     notification.value.cancel()
//   } else if (notification.value?.close) {
//     notification.value.close()
//   }
// }

// function notificationChanged(to: Notification | null, from: Notification | null) {
//   if (to === from) return

//   if (from) {
//     if (whenShown.value) {
//       from.timeDisplayed = new Date().getTime() - whenShown.value.getTime()
//     }
//     if (autoCloseTimer.value) {
//       clearInterval(autoCloseTimer.value)
//       autoCloseTimer.value = null
//     }
//   }

//   if (to) {
//     whenShown.value = new Date()
//     if (to.timeout !== null && to.timeout > 0) {
//       nextTick(() => {
//         if (progressBar.value) {
//           // You can use Tailwind's animate-[custom] utilities if you add them via plugin
//           // Or use transition classes for progress bar animation
//         }
//       })
//       autoCloseTimer.value = setInterval(close, Math.max(to.timeout - (to.timeDisplayed || 0), 0))
//     }
//   }
// }
</script>
