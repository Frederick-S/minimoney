import { createApp } from 'vue'
import "@github/spark/spark"
import vuetify from './plugins/vuetify'

import App from './App.vue'

import "./main.css"
import "./styles/theme.css"
import "./index.css"

createApp(App).use(vuetify).mount('#root')
