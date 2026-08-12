import { AppError } from '../../shared/errors/AppError.js';
import { encryptPayoutAccount } from './payout-account.crypto.js';
import { payoutAccountRepository } from './payout-account.repository.js';

const dto = (item) => ({ id: item.id, provider: item.provider, accountName: item.accountName, bankCode: item.bankCode, last4: item.last4, currency: item.currency, isDefault: item.isDefault, verifiedAt: item.verifiedAt, createdAt: item.createdAt });

export const payoutAccountService = {
  async list(userId) { return (await payoutAccountRepository.list(userId)).map(dto); },
  async create(userId, payload) {
    const item = await payoutAccountRepository.transaction(async (tx) => {
      if (payload.isDefault) await tx.payoutAccount.updateMany({ where: { userId }, data: { isDefault: false } });
      return tx.payoutAccount.create({ data: {
        userId,
        provider: payload.provider,
        accountName: payload.accountName,
        accountNumberEncrypted: encryptPayoutAccount(payload.accountNumber),
        bankCode: payload.bankCode || null,
        last4: payload.accountNumber.slice(-4),
        currency: payload.currency,
        isDefault: payload.isDefault,
      } });
    });
    return dto(item);
  },
  async remove(userId, id) {
    const removed = await payoutAccountRepository.remove(userId, id);
    if (!removed.count) throw new AppError('Payout account was not found or is already used.', 409, 'PAYOUT_ACCOUNT_NOT_REMOVABLE');
  },
};
