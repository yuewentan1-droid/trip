import axios from 'axios';
import { toast } from '../utils/toast';

const http = axios.create({ baseURL: '/api' });

http.interceptors.request.use(c => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = 'Bearer ' + t;
  return c;
});

http.interceptors.response.use(r => {
  const { code, msg, data } = r.data;
  if (code === 0) return data;
  if (code === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // 串门名册不用登录，令牌过期也别把人从名册上赶走
    if (location.pathname !== '/login' && location.pathname !== '/visits')
      location.href = '/login?to=' + encodeURIComponent(location.pathname + location.search);
  } else if (!r.config.silent) toast(msg);
  const e = new Error(msg);
  e.code = code;
  e.data = data;
  return Promise.reject(e);
});

export const api = {
  register: d => http.post('/auth/register', d),
  login: d => http.post('/auth/login', d),
  me: () => http.get('/auth/me'),
  updateMe: d => http.put('/auth/me', d),
  updatePassword: d => http.put('/auth/password', d),
  doneTour: () => http.post('/auth/tour'),

  topics: category => http.get('/topics', { params: { category } }),
  addTopic: d => http.post('/topics', d),
  updTopic: (id, d) => http.put(`/topics/${id}`, d),
  delTopic: id => http.delete(`/topics/${id}`),
  upload: file => {
    const form = new FormData();
    form.append('file', file);
    return http.post('/upload', form);
  },

  sessions: () => http.get('/sessions'),
  newSession: d => http.post('/sessions', d),
  session: id => http.get(`/sessions/${id}`),
  updSession: (id, d) => http.put(`/sessions/${id}`, d),
  delSession: id => http.delete(`/sessions/${id}`),
  finish: (id, d = {}) => http.post(`/sessions/${id}/finish`, d),
  pick: id => http.post(`/sessions/${id}/pick`),
  place: (id, placement) => http.post(`/sessions/${id}/place`, { placement }),

  addThought: (id, d) => http.post(`/sessions/${id}/thoughts`, d),
  updThought: (id, d) => http.put(`/thoughts/${id}`, d),
  delThought: id => http.delete(`/thoughts/${id}`),

  milestones: id => http.get(`/sessions/${id}/milestones`),
  addMilestone: (id, d) => http.post(`/sessions/${id}/milestones`, d),
  delMilestone: id => http.delete(`/milestones/${id}`),

  visits: params => http.get('/visits', { params }),
  garden: id => http.get(`/garden/${id}`, { silent: true }),
  gardenSession: (id, sid) => http.get(`/garden/${id}/session/${sid}`, { silent: true }),
  gardenMessages: (id, page = 1, q = '') =>
    http.get(`/garden/${id}/messages`, { params: { page, q }, silent: true }),
  addMessage: (id, d) => http.post(`/garden/${id}/messages`, d, { silent: true }),
  replyMessage: (id, d) => http.put(`/messages/${id}/reply`, d, { silent: true }),
  delMessage: id => http.delete(`/messages/${id}`, { silent: true }),
  inbox: () => http.get('/messages/inbox', { silent: true }),
  outbox: () => http.get('/messages/outbox', { silent: true }),
  notices: () => http.get('/notices', { silent: true }),
  knocks: () => http.get('/knocks', { silent: true }),
  knock: id => http.post(`/garden/${id}/knock`, {}, { silent: true }),
  decideKnock: (id, d) => http.post(`/knocks/${id}/decide`, d, { silent: true }),
  seenKnock: id => http.post(`/knocks/${id}/seen`, {}, { silent: true }),
  keep: (gid, sid) => http.post(`/garden/${gid}/session/${sid}/keep`, {}, { silent: true }),
  unkeep: sid => http.delete(`/keeps/${sid}`, { silent: true }),
  keeps: () => http.get('/keeps', { silent: true })
};
