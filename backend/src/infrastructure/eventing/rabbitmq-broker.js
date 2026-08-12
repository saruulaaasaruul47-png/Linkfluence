import amqp from 'amqplib';

const exchange = 'influence.events';
const retryExchange = 'influence.events.retry';
const deadExchange = 'influence.events.dead';

export class RabbitMqBroker {
  constructor({ url, maxAttempts = 5, baseDelayMs = 1000 }) {
    this.url = url;
    this.maxAttempts = maxAttempts;
    this.baseDelayMs = baseDelayMs;
    this.subscriptions = [];
  }

  subscribe(topic, handler) {
    this.subscriptions.push({ topic, handler });
  }

  async connect() {
    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createConfirmChannel();
    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    await this.channel.assertExchange(retryExchange, 'topic', { durable: true });
    await this.channel.assertExchange(deadExchange, 'topic', { durable: true });
    for (const subscription of this.subscriptions) await this.#consume(subscription);
  }

  async #consume({ topic, handler }) {
    const queue = `influence.${topic.replaceAll('*', 'all')}`;
    await this.channel.assertQueue(queue, { durable: true });
    await this.channel.bindQueue(queue, exchange, topic);
    await this.channel.consume(queue, async (message) => {
      if (!message) return;
      const attempt = Number(message.properties.headers?.['x-attempt'] || 1);
      const routingKey = message.fields.routingKey;
      try {
        const event = JSON.parse(message.content.toString('utf8'));
        await handler({ ...event, topic: routingKey, deliveryAttempt: attempt });
        this.channel.ack(message);
      } catch (error) {
        const headers = { ...message.properties.headers, 'x-attempt': attempt + 1, 'x-error': String(error?.message || error).slice(0, 500) };
        if (attempt >= this.maxAttempts) {
          this.channel.publish(deadExchange, routingKey, message.content, { persistent: true, headers });
        } else {
          const retryQueue = `${queue}.retry.${attempt}`;
          await this.channel.assertQueue(retryQueue, {
            durable: true,
            expires: this.baseDelayMs * (2 ** attempt) + 60_000,
            messageTtl: this.baseDelayMs * (2 ** (attempt - 1)),
            deadLetterExchange: exchange,
            deadLetterRoutingKey: routingKey,
          });
          await this.channel.bindQueue(retryQueue, retryExchange, routingKey);
          this.channel.publish(retryExchange, routingKey, message.content, { persistent: true, headers });
        }
        this.channel.ack(message);
      }
    }, { noAck: false });
  }

  async publish(topic, event) {
    if (!this.channel) throw new Error('RabbitMQ broker is not connected.');
    this.channel.publish(exchange, topic, Buffer.from(JSON.stringify(event)), {
      persistent: true,
      contentType: 'application/json',
      messageId: event.id,
      timestamp: Date.now(),
    });
    await this.channel.waitForConfirms();
  }

  async close() {
    await this.channel?.close().catch(() => {});
    await this.connection?.close().catch(() => {});
  }
}
