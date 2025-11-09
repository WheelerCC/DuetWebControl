import { createApp } from 'vue'
import './styles.css' // Import Tailwind CSS

import i18n from './i18n'
import router from './routes'

import './plugins'
import './registerServiceWorker'

import { createPinia } from 'pinia'
import App from './App.vue'
;(window as any)._duetModelSetArray = (array: object, index: string | number, value: any) =>
  (array[index] = value)

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(i18n)
app.mount('#app')
