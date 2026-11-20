export function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('on'));
  setTimeout(() => {
    el.classList.remove('on');
    setTimeout(() => el.remove(), 350);
  }, 2200);
}
