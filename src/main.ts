import '@mdi/font/css/materialdesignicons.css'
import { createApp } from 'vue'

import i18n from './i18n'
import router from './routes'

import './components'
import './plugins'
import './registerServiceWorker'

import { createPinia } from 'pinia'
import App from './App.vue'
;(window as any)._duetModelSetArray = (array: object, index: string | number, value: any) =>
  (array[index] = value)

import { createVuetify } from 'vuetify'

const pinia = createPinia()
const app = createApp(App)
const vuetify = createVuetify({
  theme: {
    defaultTheme:
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light',
  },
  icons: {
    defaultSet: 'mdi',
  },
})

// Register global properties the Vue 3 way

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(vuetify)
app.mount('#app')
