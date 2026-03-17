import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import App from './App.vue';
import router from './router';
import './styles/design-tokens.css';
import './styles/global.css';
import './styles/element-plus.css';
import './styles/animations.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(ElementPlus);
app.mount('#app');

// 移除 loading 屏幕
const loadingScreen = document.getElementById('loading-screen');
if (loadingScreen) {
  loadingScreen.style.opacity = '0';
  setTimeout(() => loadingScreen.remove(), 300);
}
