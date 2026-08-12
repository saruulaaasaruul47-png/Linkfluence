export class MemoryBroker {
  constructor({ maxAttempts = 5, baseDelayMs = 0 } = {}) {
    this.handlers = new Map();
    this.deadLetters = [];
    this.maxAttempts = maxAttempts;
    this.baseDelayMs = baseDelayMs;
  }

  async connect() {}
  async close() {}

  subscribe(topic, handler) {
    const handlers = this.handlers.get(topic) || [];
    handlers.push(handler);
    this.handlers.set(topic, handlers);
  }

  async publish(topic, event) {
    const handlers = [...this.handlers.entries()]
      .filter(([pattern]) => pattern === '*' || pattern === topic || (pattern.endsWith('.*') && topic.startsWith(pattern.slice(0, -1))))
      .flatMap(([, registered]) => registered);
    for (const handler of handlers) {
      let attempt = 0;
      while (attempt < this.maxAttempts) {
        attempt += 1;
        try {
          await handler({ ...event, topic, deliveryAttempt: attempt });
          break;
        } catch (error) {
          if (attempt >= this.maxAttempts) {
            this.deadLetters.push({ topic, event, attempts: attempt, error: String(error?.message || error) });
            throw error;
          }
          if (this.baseDelayMs) {
            await new Promise((resolve) => setTimeout(resolve, this.baseDelayMs * (2 ** (attempt - 1))));
          }
        }
      }
    }
  }
}
