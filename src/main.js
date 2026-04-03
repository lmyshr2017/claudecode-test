import { createApp }  from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// Vant components used across the app
import {
  Button, Form, Field, CellGroup, Cell,
  Tab, Tabs, NavBar, Tabbar, TabbarItem,
  Popup, ActionSheet, TimePicker, DatePicker,
  Stepper, Progress, Dialog, Toast,
  Icon, Loading, Empty, Skeleton,
} from 'vant'
import 'vant/lib/index.css'

// Global styles (must come AFTER vant CSS to allow overrides)
import '@/styles/index.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

;[
  Button, Form, Field, CellGroup, Cell,
  Tab, Tabs, NavBar, Tabbar, TabbarItem,
  Popup, ActionSheet, TimePicker, DatePicker,
  Stepper, Progress, Dialog, Toast,
  Icon, Loading, Empty, Skeleton,
].forEach(c => app.use(c))

app.mount('#app')
