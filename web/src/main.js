import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import 'lxgw-wenkai-webfont/lxgwwenkai-regular.css';
import 'lxgw-wenkai-webfont/lxgwwenkai-bold.css';
import './styles/theme.css';
import { useScale } from './store/scale';

const pinia = createPinia();
const app = createApp(App).use(pinia).use(router);
// 挂载前就把字号倍率定下来，开着开关时首屏不会先闪一下原大小
useScale(pinia).init();
app.mount('#app');
