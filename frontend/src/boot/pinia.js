// src/boot/pinia.js
import { createPinia } from 'pinia';
import { boot } from 'quasar/wrappers';

export default boot(({ app }) => {
    const pinia = createPinia();
    app.use(pinia);
});