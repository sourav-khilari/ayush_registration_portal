import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '60s', target: 50 },
    { duration: '60s', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_failed': ['rate<0.02'],
    'http_req_duration': ['p(95)<1500'],
  },
};

const BASE = 'http://localhost:5002';

export default function () {
  const payload = JSON.stringify({
    email: __ENV.TEST_EMAIL || 'test@example.com',
    password: __ENV.TEST_PASSWORD || 'testpass',
  });

  const params = { headers: { 'Content-Type': 'application/json' } };
  const res = http.post(`${BASE}/api/users/login`, payload, params);
  check(res, { 'login success': (r) => r.status === 200 || r.status === 401 });
  sleep(1);
}
