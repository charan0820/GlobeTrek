import http from "k6/http";
import { check } from "k6";
import { Rate } from "k6/metrics";
const unexpected = new Rate("unexpected_failures");
const conflicts = new Rate("expected_sold_out");
const fixture = JSON.parse(__ENV.FIXTURE);
const base = __ENV.BASE_URL;
const contention = __ENV.MODE === "contention";
export const options = {
  ...(contention
    ? {
        scenarios: {
          race: {
            executor: "per-vu-iterations",
            vus: 20,
            iterations: 1,
            maxDuration: "30s",
          },
        },
        thresholds: { unexpected_failures: ["rate==0"] },
      }
    : {
        vus: 5,
        duration: "15s",
        thresholds: { unexpected_failures: ["rate==0"] },
      }),
  summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
};
export default function () {
  if (contention) {
    const user = fixture.users[__VU - 1];
    const r = http.post(
      `${base}/api/reservations`,
      JSON.stringify({ quoteId: user.quote }),
      {
        headers: {
          "Content-Type": "application/json",
          Cookie: user.cookie,
          Origin: base,
          "Idempotency-Key": `load-${fixture.name}-${__VU}-00000000`,
        },
        responseCallback: http.expectedStatuses(200, 201, 409),
      },
    );
    const expected =
      r.status === 201 ||
      (r.status === 409 && r.json("error.code") === "SOLD_OUT");
    unexpected.add(!expected);
    conflicts.add(r.status === 409);
    check(r, { "known reservation outcome": () => expected });
  } else {
    const path =
      __ENV.MODE === "quote"
        ? "/api/quotes"
        : __ENV.MODE === "recovery"
          ? fixture.recoveryPath
          : `/api/catalog?country=${__ITER % 2 ? "JP" : "IN"}&kind=attractions`;
    const r =
      __ENV.MODE === "quote"
        ? http.post(`${base}${path}`, JSON.stringify(fixture.quoteSource), {
            headers: {
              "Content-Type": "application/json",
              Cookie: fixture.users[0].cookie,
              Origin: base,
            },
          })
        : http.get(`${base}${path}`);
    unexpected.add(![200, 201].includes(r.status));
    check(r, { "successful response": () => [200, 201].includes(r.status) });
  }
}
