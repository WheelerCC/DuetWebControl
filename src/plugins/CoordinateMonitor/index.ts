import { registerRoute } from '../../routes'

import CoordinateMonitor from './CoordinateMonitor.vue'

// Register a route via Settings -> Object Model
registerRoute(CoordinateMonitor, {
  Control: {
    CoordinateMonitor: {
      icon: 'mdi-tools',
      caption: 'plugins.coordinateMonitor.menuCaption',
      path: '/CoordinateMonitor',
    },
  },
})
