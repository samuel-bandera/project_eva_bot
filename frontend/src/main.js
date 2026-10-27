import { createApp, watch } from 'vue';
import { createPinia } from 'pinia';

import { Quasar, Notify, Dialog, Dark } from 'quasar';
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/src/css/index.sass';
import './assets/theme.css';

import App from './App.vue';
import router from './router/index.js';
import { useTheme } from './composables/useTheme.js';
import { usePreferences } from './composables/usePreferences.js';

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.use(Quasar, {
  plugins: { Notify, Dialog },
  config: {
    iconSet: 'material-icons',
    brand: {
      primary:   'var(--primary)',
      secondary: '#e8ddcc',
      accent:    '#a83232',
      dark:      '#171717',
      positive:  '#2e7d32',
      negative:  '#c62828',
      info:      '#0277bd',
      warning:   '#f57c00',
    },
    notify: {
      position: 'top-right',
      timeout: 3500,
      progress: true,
      classes: 'evalbot-notify',
    },
    dark: false,
  },
});

const { temaAplicado } = useTheme();
usePreferences();

Dark.set(temaAplicado.value === 'dark');

watch(temaAplicado, (nuevo) => {
  Dark.set(nuevo === 'dark');
});

app.mount('#app')
;
