import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
const confirmed = new Counter('confirmed'), soldOut = new Counter('sold_out'), unexpected = new Counter('unexpected');
export const options = { scenarios: { last_room: { executor: 'per-vu-iterations', vus: 20, iterations: 1, maxDuration: '30s' } }, thresholds: { checks: ['rate==1'], unexpected: ['count==0'], confirmed: ['count==1'] }, summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'max'] };
export default function () {
  const response = http.post(`${__ENV.BASE_URL}/api/bookings`, __ENV.BOOKING_BODY, { headers: { 'Content-Type': 'application/json', Origin: __ENV.ORIGIN, Cookie: __ENV.TEST_COOKIE, 'Idempotency-Key': `k6-${__ENV.RUN_ID}-vu-${String(__VU).padStart(4, '0')}` }, responseCallback: http.expectedStatuses(201, 409) });
  const ok = response.status === 201;
  const full = response.status === 409 && response.json('error.code') === 'SOLD_OUT';
  confirmed.add(ok ? 1 : 0); soldOut.add(full ? 1 : 0); unexpected.add(ok || full ? 0 : 1);
  check(response, { 'confirmed or expected sold out': () => ok || full });
}
