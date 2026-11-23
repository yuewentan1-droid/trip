import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/login', component: () => import('../views/Login.vue') },
  { path: '/register', component: () => import('../views/Register.vue') },
  { path: '/', component: () => import('../views/Home.vue') },
  { path: '/think/:id', component: () => import('../views/Think.vue') },
  { path: '/mine', component: () => import('../views/Mine.vue') },
  { path: '/review/:id', component: () => import('../views/Review.vue') },
  { path: '/visits', component: () => import('../views/Visits.vue') },
  { path: '/town', component: () => import('../views/Town.vue') },
  { path: '/garden/:userId', component: () => import('../views/Garden.vue') }
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(to => {
  const token = localStorage.getItem('token');
  const open = to.path === '/login' || to.path === '/register' || to.path === '/visits'
    || to.path.startsWith('/garden/');
  if (!token && !open) return { path: '/login', query: { to: to.fullPath } };
  if (token && (to.path === '/login' || to.path === '/register')) return '/';
});

export default router;
