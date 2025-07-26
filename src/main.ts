import { createApp } from 'vue'
import vuetify from './plugins/vuetify'
import router from './router'

import App from './App.vue'

import "./main.css"

createApp(App).use(vuetify).use(router).mount('#root')