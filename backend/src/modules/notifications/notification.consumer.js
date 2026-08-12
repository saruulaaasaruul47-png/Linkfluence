import { sendNotificationEmail } from './notification.email.js';
import { notificationConsumerRepository } from './notification.consumer.repository.js';
import { realtimeGateway } from '../../infrastructure/realtime/realtime.gateway.js';

const supported = ['offer.*', 'proposal.*', 'contract.*', 'payment.*', 'deliverable.*', 'proof.*', 'payout.*', 'deadline.*', 'collaboration.*', 'showcase.*'];
const preferenceKey = { offer: 'offerEmail', proposal: 'proposalEmail', contract: 'contractEmail', payment: 'paymentEmail', deliverable: 'deliverableEmail', proof: 'proofEmail', payout: 'payoutEmail', deadline: 'deadlineEmail' };
const typeByGroup = { offer: 'WORK_OFFER', proposal: 'PROPOSAL', contract: 'CONTRACT', payment: 'PAYMENT', deliverable: 'DELIVERABLE', proof: 'DELIVERABLE', payout: 'PAYMENT', deadline: 'SYSTEM', collaboration: 'SYSTEM', showcase: 'SYSTEM' };

function participants(context) {
  const root = context?.collaboration || context?.payment?.collaboration || context;
  const business = root?.business?.user || context?.campaign?.business?.user;
  const creator = root?.creator?.user;
  return [business, creator].filter(Boolean);
}

function copy(group, topic) {
  const action = topic.split('.')[1]?.replaceAll('_', ' ') || 'updated';
  const label = group.charAt(0).toUpperCase() + group.slice(1);
  return { title: `${label} ${action}`, body: `Your ${group} has a new ${action} update.` };
}

function notificationHref(group, context, userId) {
  if (group === 'proposal') {
    const businessUserId = context?.campaign?.business?.user?.id;
    return userId === businessUserId
      ? `/business/proposals/${context.id}`
      : '/creator/proposals';
  }
  if (group === 'offer') {
    const businessUserId = context?.business?.user?.id;
    return userId === businessUserId ? '/business/responses' : '/creator/work-requests';
  }
  const collaboration = context?.collaboration
    || context?.payment?.collaboration
    || (context?.business && context?.creator ? context : null);
  const collaborationId = context?.collaborationId
    || collaboration?.id
    || context?.payment?.collaborationId;
  const businessUserId = collaboration?.business?.user?.id;
  const side = userId === businessUserId ? 'business' : 'creator';
  if (group === 'contract' && context?.id) return `/${side}/contracts/${context.id}`;
  if (group === 'payment' || group === 'payout') return side === 'business' ? '/business/payments' : '/creator/wallet';
  return collaborationId ? `/${side}/collaborations/${collaborationId}` : null;
}

export async function handleNotificationEvent(event) {
  const group = event.topic.split('.')[0];
  const context = await notificationConsumerRepository.context(event.topic, event.aggregateId, event.payload || {});
  if (!context) return;
  const recipients = participants(context).filter((user) => user.id !== event.payload?.actorId);
  if (!recipients.length) return;
  const content = copy(group, event.topic);
  await notificationConsumerRepository.createMany(recipients.map((user) => ({
    userId: user.id,
    sourceEventId: event.id,
    type: typeByGroup[group],
    title: content.title,
    body: content.body,
    href: notificationHref(group, context, user.id),
    data: { topic: event.topic, aggregateId: event.aggregateId, ...event.payload },
  })));
  const saved = await notificationConsumerRepository.findBySourceEvent(event.id);
  const savedByUser = new Map(saved.map((item) => [item.userId, item]));
  for (const user of recipients) {
    const notification = savedByUser.get(user.id);
    const href = notificationHref(group, context, user.id);
    if (notification) {
      realtimeGateway.user(user.id, 'notification:created', {
        id: notification.id,
        sourceEventId: event.id,
        type: typeByGroup[group],
        ...content,
        href,
        data: event.payload,
        unread: true,
        createdAt: notification.createdAt,
      });
    }
    const preference = await notificationConsumerRepository.preference(user.id);
    if (preference?.emailEnabled === false || preference?.[preferenceKey[group]] === false) continue;
    await sendNotificationEmail({ email: user.email, name: user.displayName, ...content, href });
  }
}

export function registerNotificationConsumers(broker) {
  supported.forEach((topic) => broker.subscribe(topic, handleNotificationEvent));
}
