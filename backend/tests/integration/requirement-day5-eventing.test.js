import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { MemoryBroker } from '../../src/infrastructure/eventing/memory-broker.js';
import { OutboxWorker } from '../../src/infrastructure/eventing/outbox.worker.js';

describe('Requirement Day 5 event delivery', () => {
  test('retries a failed notification consumer and records a dead letter', async () => {
    const broker = new MemoryBroker({ maxAttempts: 3, baseDelayMs: 0 });
    let calls = 0;
    broker.subscribe('payment.*', async () => { calls += 1; throw new Error('Simulated email provider outage.'); });
    await assert.rejects(() => broker.publish('payment.funded', { id: 'event-1', payload: {} }), /provider outage/);
    assert.equal(calls, 3);
    assert.equal(broker.deadLetters.length, 1);
    assert.deepEqual({ topic: broker.deadLetters[0].topic, attempts: broker.deadLetters[0].attempts }, { topic: 'payment.funded', attempts: 3 });
  });

  test('supports topic wildcard consumers and delivers successful events once', async () => {
    const broker = new MemoryBroker();
    const received = [];
    broker.subscribe('contract.*', async (event) => received.push(event));
    await broker.publish('contract.activated', { id: 'event-2', payload: { contractId: 'contract-1' } });
    assert.equal(received.length, 1);
    assert.equal(received[0].deliveryAttempt, 1);
  });

  test('waits for an active outbox pass before shutdown completes', async () => {
    const worker = new OutboxWorker({ broker: new MemoryBroker() });
    let releaseRun;
    let markStarted;
    const started = new Promise((resolve) => { markStarted = resolve; });
    const blockedRun = new Promise((resolve) => { releaseRun = resolve; });

    worker.runOnce = async () => {
      markStarted();
      await blockedRun;
    };

    worker.start(60_000);
    await started;

    let stopped = false;
    const stopping = worker.stop().then(() => { stopped = true; });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(stopped, false);

    releaseRun();
    await stopping;
    assert.equal(stopped, true);
  });
});
