import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '45s', target: 10 },
    { duration: '60s', target: 20 },
    { duration: '90s', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_failed': ['rate<0.02'],
    'http_req_duration': ['p(95)<1200'],
  },
};

const BASE = 'http://localhost:5002';

export default function () {
  const email = __ENV.TEST_EMAIL || 'aroy123@gmail.com';
  const password = __ENV.TEST_PASSWORD || 'Aroy@123';

  // 1) Login
  const loginRes = http.post(
    `${BASE}/api/users/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginRes, {
    'login status 200': (r) => r.status === 200,
    'login has token': (r) => {
      try {
        const j = r.json();
        return !!j.token;
      } catch (e) {
        return false;
      }
    },
  });

  let token;
  try {
    token = loginRes.json().token;
  } catch (e) {
    token = null;
  }

  // 2) If login succeeded, call profile
  if (token) {
    const profileRes = http.get(`${BASE}/api/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    check(profileRes, {
      'profile status 200': (r) => r.status === 200,
    });
  }

  sleep(1);
}
