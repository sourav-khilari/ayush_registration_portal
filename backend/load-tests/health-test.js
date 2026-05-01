import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '60s', target: 100 },
    { duration: '60s', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(95)<1000'],
  },
};

export default function () {
  const url = 'http://localhost:5002/api/health';
  const res = http.get(url);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
