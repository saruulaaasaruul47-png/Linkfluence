import { AppError } from '../../shared/errors/AppError.js';
import { notificationRepository } from './notification.repository.js';
const dto = (item) => ({ id: item.id, type: item.type, title: item.title, body: item.body, href: item.href, data: item.data, readAt: item.readAt, unread: !item.readAt, createdAt: item.createdAt });
export const notificationService = {
  async list(userId, filters) {
    const result = await notificationRepository.list(userId, filters);
    return { items: result.items.map(dto), unreadCount: result.unreadCount, pagination: { page: filters.page, limit: filters.limit, total: result.total, totalPages: Math.ceil(result.total / filters.limit) } };
  },
  async read(userId, id) {
    const result = await notificationRepository.read(userId, id);
    if (!result.count) throw new AppError('Notification was not found.', 404, 'NOTIFICATION_NOT_FOUND');
    return null;
  },
  async readAll(userId) { await notificationRepository.readAll(userId); return null; },
  async preference(userId) {
    const saved = await notificationRepository.preference(userId);
    return saved || {
      emailEnabled: true, offerEmail: true, proposalEmail: true, contractEmail: true,
      paymentEmail: true, deliverableEmail: true, proofEmail: true, payoutEmail: true, deadlineEmail: true,
    };
  },
  savePreference(userId, payload) { return notificationRepository.savePreference(userId, payload); },
};
