import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import 'vuetify/styles'

export default createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#2196F3',
          'primary-darken-1': '#1976D2',
          secondary: '#FFC107',
          'secondary-darken-1': '#FFA000',
          accent: '#FF5722',
          error: '#F44336',
          warning: '#FF9800',
          info: '#2196F3',
          success: '#4CAF50',
          surface: '#FFFFFF',
          'surface-bright': '#FFFFFF',
          'surface-light': '#EEEEEE',
          'surface-variant': '#424242',
          'on-surface-variant': '#EEEEEE',
          background: '#FAFAFA',
          'on-background': '#1F1F1F',
          'on-surface': '#1F1F1F',
          'on-primary': '#FFFFFF',
          'on-secondary': '#000000',
          'on-accent': '#FFFFFF',
          'on-error': '#FFFFFF',
          'on-warning': '#000000',
          'on-info': '#FFFFFF',
          'on-success': '#FFFFFF',
        },
      },
    },
  },
})