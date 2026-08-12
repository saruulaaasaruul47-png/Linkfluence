const target = process.env.SMOKE_URL || 'http://localhost:3000/api/v1/health';
const requests = Math.max(5, Math.min(500, Number(process.env.SMOKE_REQUESTS || 50)));
const durations = [];
for (let index = 0; index < requests; index += 1) {
  const started = performance.now();
  const response = await fetch(target, { headers: { 'x-request-id': `smoke-${Date.now()}-${index}` } });
  if (!response.ok) throw new Error(`Smoke request failed with ${response.status}.`);
  await response.arrayBuffer();
  durations.push(performance.now() - started);
}
durations.sort((left, right) => left - right);
const percentile = (value) => durations[Math.min(durations.length - 1, Math.ceil((value / 100) * durations.length) - 1)];
console.log(JSON.stringify({ target, requests, minMs: Number(durations[0].toFixed(2)), p50Ms: Number(percentile(50).toFixed(2)), p95Ms: Number(percentile(95).toFixed(2)), maxMs: Number(durations.at(-1).toFixed(2)) }, null, 2));
