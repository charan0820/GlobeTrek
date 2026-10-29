import http from 'k6/http';
import { check } from 'k6';
export const options = { vus: 5, duration: '10s', thresholds: { http_req_failed: ['rate==0'], checks: ['rate==1'] }, summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'] };
export default function () {
  const response = http.get(`${__ENV.BASE_URL || 'http://localhost:3001'}/api/hotels?city=Jaipur&sort=price_asc`);
  check(response, { 'list succeeds': r => r.status === 200 && r.json('success') === true });
}
