import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import 'lxgw-wenkai-webfont/lxgwwenkai-regular.css';
import 'lxgw-wenkai-webfont/lxgwwenkai-bold.css';
import './styles/theme.css';

createApp(App).use(createPinia()).use(router).mount('#app');
