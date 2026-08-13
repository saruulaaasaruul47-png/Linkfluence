import { AppError } from '../../shared/errors/AppError.js';
import { messagingRepository } from './messaging.repository.js';
import { realtimeGateway } from '../../infrastructure/realtime/realtime.gateway.js';
import { mediaService } from '../media/media.service.js';

const missing = () => new AppError('Conversation was not found.', 404, 'CONVERSATION_NOT_FOUND');
const requestMissing = () => new AppError('Message request was not found.', 404, 'MESSAGE_REQUEST_NOT_FOUND');
const directKey = (left, right) => [left, right].sort().join(':');
const messageDto = (item) => ({
  id: item.id, body: item.body || '', attachment: item.attachment || null,
  sender: item.sender ? { id: item.sender.id, name: item.sender.displayName, avatarUrl: item.sender.avatarUrl } : undefined,
  senderId: item.senderId, status: item.status, editedAt: item.editedAt, createdAt: item.createdAt,
});
function conversationDto(item, userId) {
  const member = item.members.find((entry) => entry.userId === userId);
  const peers = item.members.filter((entry) => entry.userId !== userId).map((entry) => ({
    id: entry.user.id, name: entry.user.displayName, avatarUrl: entry.user.avatarUrl,
  }));
  const latest = item.messages?.[0];
  return {
    id: item.id, title: item.title || peers.map((peer) => peer.name).join(', '),
    peers, lastMessage: latest ? messageDto(latest) : null,
    collaboration: item.collaboration ? {
      id: item.collaboration.id, campaignId: item.collaboration.campaign?.id,
      campaign: item.collaboration.campaign?.title, contractId: item.collaboration.contract?.id,
    } : null,
    lastReadAt: member?.lastReadAt, updatedAt: item.updatedAt,
  };
}
function requestDto(item, userId) {
  const incoming = item.recipientId === userId;
  const peer = incoming ? item.sender : item.recipient;
  return {
    id: item.id,
    status: item.status,
    direction: incoming ? 'INCOMING' : 'OUTGOING',
    initialMessage: item.initialMessage,
    senderRole: item.senderRole.toLowerCase(),
    recipientRole: item.recipientRole.toLowerCase(),
    peer: { id: peer.id, name: peer.displayName, avatarUrl: peer.avatarUrl },
    conversationId: item.conversationId || null,
    decidedAt: item.decidedAt,
    createdAt: item.createdAt,
  };
}
async function membership(id, userId) {
  const record = await messagingRepository.findMembership(id, userId);
  if (!record) throw missing();
  return record;
}

export const messagingService = {
  async createRequest(userId, payload) {
    const recipientType = payload.recipientType;
    const senderRole = recipientType === 'CREATOR' ? 'BUSINESS' : 'CREATOR';
    const [actor, recipient] = await Promise.all([
      messagingRepository.actorChannels(userId),
      messagingRepository.recipientChannel(recipientType, payload.recipientId),
    ]);
    if (!recipient || recipient.user.id === userId) throw new AppError('Recipient channel was not found.', 404, 'MESSAGE_RECIPIENT_NOT_FOUND');
    if (!actor?.[`${senderRole.toLowerCase()}Profile`]) {
      throw new AppError(`A ${senderRole.toLowerCase()} channel is required to contact this profile.`, 403, 'MESSAGE_CHANNEL_REQUIRED');
    }
    const key = directKey(userId, recipient.user.id);
    const conversation = await messagingRepository.findDirect(key);
    if (conversation) return { existing: true, conversationId: conversation.id, request: null };
    const [sameDirection, reverseDirection] = await Promise.all([
      messagingRepository.findPendingRequest(userId, recipient.user.id),
      messagingRepository.findPendingRequest(recipient.user.id, userId),
    ]);
    if (sameDirection || reverseDirection) {
      const existing = sameDirection || reverseDirection;
      return { existing: true, conversationId: null, request: requestDto(existing, userId) };
    }
    const created = await messagingRepository.transaction(async (tx) => {
      const request = await tx.messageRequest.create({
        data: {
          senderId: userId,
          recipientId: recipient.user.id,
          senderRole,
          recipientRole: recipientType,
          initialMessage: payload.message,
        },
        include: { sender: { select: { id: true, displayName: true, avatarUrl: true } }, recipient: { select: { id: true, displayName: true, avatarUrl: true } } },
      });
      await tx.notification.create({
        data: {
          userId: recipient.user.id,
          type: 'DIRECT_MESSAGE',
          title: 'New message request',
          body: payload.message.slice(0, 180),
          href: `/${recipientType.toLowerCase()}/messages`,
          data: { messageRequestId: request.id },
        },
      });
      await tx.outboxEvent.create({ data: { topic: 'message.requested', aggregateId: request.id, payload: { requestId: request.id, senderId: userId, recipientId: recipient.user.id } } });
      return request;
    });
    return { existing: false, conversationId: null, request: requestDto(created, userId) };
  },
  async requests(userId, filters) {
    const result = await messagingRepository.requests(userId, filters);
    return {
      items: result.items.map((item) => requestDto(item, userId)),
      pagination: { page: filters.page, limit: filters.limit, total: result.total, totalPages: Math.ceil(result.total / filters.limit) },
    };
  },
  async decideRequest(userId, id, action) {
    const request = await messagingRepository.request(id);
    if (!request || request.recipientId !== userId) throw requestMissing();
    if (request.status !== 'PENDING') return requestDto(request, userId);
    const accepted = action === 'ACCEPT';
    return messagingRepository.transaction(async (tx) => {
      const claimed = await tx.messageRequest.updateMany({
        where: { id, recipientId: userId, status: 'PENDING' },
        data: { status: accepted ? 'ACCEPTED' : 'DECLINED', decidedAt: new Date() },
      });
      if (claimed.count !== 1) return requestDto(await messagingRepository.request(id, tx), userId);
      let conversationId = null;
      if (accepted) {
        const conversation = await tx.conversation.upsert({
          where: { directKey: directKey(request.senderId, request.recipientId) },
          update: {},
          create: { directKey: directKey(request.senderId, request.recipientId) },
        });
        conversationId = conversation.id;
        await tx.conversationMember.createMany({
          data: [{ conversationId, userId: request.senderId }, { conversationId, userId: request.recipientId }],
          skipDuplicates: true,
        });
        await tx.message.create({ data: { conversationId, senderId: request.senderId, body: request.initialMessage, status: 'SENT' } });
        await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
        await tx.messageRequest.update({ where: { id }, data: { conversationId } });
      }
      await tx.notification.create({
        data: {
          userId: request.senderId,
          type: 'DIRECT_MESSAGE',
          title: accepted ? 'Message request accepted' : 'Message request declined',
          body: accepted ? 'You can now continue the conversation.' : 'The recipient declined this message request.',
          href: accepted ? `/${request.senderRole.toLowerCase()}/messages` : null,
          data: { messageRequestId: id, conversationId },
        },
      });
      await tx.outboxEvent.create({ data: { topic: accepted ? 'message.request_accepted' : 'message.request_declined', aggregateId: id, payload: { requestId: id, conversationId, senderId: request.senderId, recipientId: request.recipientId } } });
      return requestDto(await messagingRepository.request(id, tx), userId);
    });
  },
  async create(userId, collaborationId) {
    const collaboration = await messagingRepository.findCollaboration(collaborationId, userId);
    if (!collaboration) throw missing();
    if (collaboration.conversation) return { id: collaboration.conversation.id };
    return messagingRepository.transaction(async (tx) => {
      const existing = await tx.conversation.findUnique({ where: { collaborationId } });
      if (existing) return { id: existing.id };
      const created = await tx.conversation.create({
        data: {
          collaborationId, title: collaboration.campaign?.title || 'Collaboration',
          members: { create: [{ userId: collaboration.business.userId }, { userId: collaboration.creator.userId }] },
        },
      });
      return { id: created.id };
    });
  },
  async list(userId, filters) {
    const result = await messagingRepository.list(userId, filters);
    return {
      items: result.items.map((item) => conversationDto(item, userId)),
      pagination: { page: filters.page, limit: filters.limit, total: result.total, totalPages: Math.ceil(result.total / filters.limit) },
    };
  },
  async messages(userId, id, { cursor, limit }) {
    await membership(id, userId);
    const records = await messagingRepository.messages(id, cursor, limit);
    const hasMore = records.length > limit;
    const items = records.slice(0, limit);
    return { items: items.reverse().map(messageDto), nextCursor: hasMore ? items.at(-1)?.id : null };
  },
  async send(userId, id, payload) {
    await membership(id, userId);
    const attachmentAsset = payload.attachment?.mediaAssetId
      ? await mediaService.requireWorkspaceAsset(userId, payload.attachment.mediaAssetId)
      : null;
    const attachment = attachmentAsset ? {
      mediaAssetId: attachmentAsset.id,
      name: attachmentAsset.originalName,
      url: attachmentAsset.url,
      mimeType: attachmentAsset.mimeType,
      sizeBytes: attachmentAsset.sizeBytes,
    } : null;
    const message = messageDto(await messagingRepository.transaction(async (tx) => {
      const created = await tx.message.create({
        data: { conversationId: id, senderId: userId, body: payload.body || null, attachment: attachment || undefined, status: 'SENT' },
        include: { sender: { select: { id: true, displayName: true, avatarUrl: true } } },
      });
      await tx.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
      await tx.conversationMember.update({ where: { conversationId_userId: { conversationId: id, userId } }, data: { lastReadAt: new Date() } });
      const recipients = await tx.conversationMember.findMany({ where: { conversationId: id, userId: { not: userId } }, select: { userId: true } });
      if (recipients.length) {
        await tx.notification.createMany({
          data: recipients.map((recipient) => ({
            userId: recipient.userId,
            type: 'MESSAGE',
            title: 'New private message',
            body: payload.body?.slice(0, 180) || `Attachment: ${attachment?.name}`,
            href: null,
            data: { conversationId: id, messageId: created.id },
          })),
        });
      }
      await tx.outboxEvent.create({ data: { topic: 'message.created', aggregateId: created.id, payload: { conversationId: id, senderId: userId } } });
      return created;
    }));
    realtimeGateway.conversation(id, 'message:created', { conversationId: id, message });
    return message;
  },
  async edit(userId, id, messageId, body) {
    await membership(id, userId);
    const updated = await messagingRepository.transaction(async (tx) => {
      const message = await tx.message.findFirst({ where: { id: messageId, conversationId: id, senderId: userId, deletedAt: null } });
      if (!message) throw new AppError('Message was not found.', 404, 'MESSAGE_NOT_FOUND');
      return tx.message.update({ where: { id: messageId }, data: { body, editedAt: new Date() }, include: { sender: { select: { id: true, displayName: true, avatarUrl: true } } } });
    });
    const message = messageDto(updated);
    realtimeGateway.conversation(id, 'message:edited', { conversationId: id, message });
    return message;
  },
  async remove(userId, id, messageId) {
    await membership(id, userId);
    const result = await messagingRepository.transaction(async (tx) => tx.message.updateMany({
      where: { id: messageId, conversationId: id, senderId: userId, deletedAt: null },
      data: { deletedAt: new Date(), body: null, attachment: undefined },
    }));
    if (result.count !== 1) throw new AppError('Message was not found.', 404, 'MESSAGE_NOT_FOUND');
    realtimeGateway.conversation(id, 'message:deleted', { conversationId: id, messageId });
    return null;
  },
  async read(userId, id) {
    await membership(id, userId);
    await messagingRepository.transaction(async (tx) => {
      const now = new Date();
      await tx.conversationMember.update({ where: { conversationId_userId: { conversationId: id, userId } }, data: { lastReadAt: now } });
      await tx.message.updateMany({ where: { conversationId: id, senderId: { not: userId }, status: { not: 'READ' }, deletedAt: null }, data: { status: 'READ' } });
    });
    realtimeGateway.conversation(id, 'message:read', { conversationId: id, userId, readAt: new Date().toISOString() });
    return null;
  },
  async delivered(userId, id) {
    await membership(id, userId);
    const deliveredAt = new Date().toISOString();
    const result = await messagingRepository.transaction((tx) => tx.message.updateMany({
      where: { conversationId: id, senderId: { not: userId }, status: 'SENT', deletedAt: null },
      data: { status: 'DELIVERED' },
    }));
    if (result.count) realtimeGateway.conversation(id, 'message:delivered', { conversationId: id, userId, deliveredAt });
    return { count: result.count, deliveredAt };
  },
};
