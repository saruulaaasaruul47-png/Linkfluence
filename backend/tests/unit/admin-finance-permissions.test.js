import assert from 'node:assert/strict';
import test from 'node:test';
import { FINANCE_PERMISSIONS, hasFinancePermission, requireFinancePermission } from '../../src/modules/admin/finance.permissions.js';

test('super admin receives every finance permission', () => {
  const user = { id: 'admin-1', roles: ['ADMIN'] };
  for (const permission of Object.values(FINANCE_PERMISSIONS)) {
    assert.equal(hasFinancePermission(user, permission), true);
  }
});

test('viewer cannot access finance permissions implicitly', () => {
  assert.equal(hasFinancePermission({ id: 'viewer-1', roles: ['VIEWER'] }, FINANCE_PERMISSIONS.VIEW_FINANCE), false);
});

test('finance permission middleware returns a typed 403 error', () => {
  let received;
  requireFinancePermission(FINANCE_PERMISSIONS.MANAGE_REFUNDS)({ user: { roles: ['VIEWER'] } }, {}, (error) => { received = error; });
  assert.equal(received?.statusCode, 403);
  assert.equal(received?.code, 'FINANCE_PERMISSION_REQUIRED');
});
