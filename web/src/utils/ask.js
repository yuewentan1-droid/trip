import { createApp, h } from 'vue';
import FieldModal from '../components/FieldModal.vue';

/** 纸上问话，取代 window.confirm：await ask({ title, body, ok, cancel, icon }) */
export function ask(q) {
  return new Promise(done => {
    const box = document.createElement('div');
    document.body.appendChild(box);
    const app = createApp({
      render: () => h(FieldModal, { q, onDone: ok => { app.unmount(); box.remove(); done(ok); } })
    });
    app.mount(box);
  });
}
