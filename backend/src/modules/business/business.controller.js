import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { businessService } from './business.service.js';

export const businessController = {
  create: asyncHandler(async (req, res) => {
    const data = await businessService.create(req.user.id, req.validated.body);
    sendSuccess(res, 201, 'Business profile created successfully.', data);
  }),
  get: asyncHandler(async (req, res) => {
    const profile = await businessService.get(req.user.id);
    sendSuccess(res, 200, 'Business profile retrieved successfully.', { profile });
  }),
  update: asyncHandler(async (req, res) => {
    const profile = await businessService.update(req.user.id, req.validated.body);
    sendSuccess(res, 200, 'Business profile updated successfully.', { profile });
  }),
  remove: asyncHandler(async (req, res) => {
    const user = await businessService.remove(req.user.id);
    sendSuccess(res, 200, 'Business profile deleted successfully.', { user });
  }),
  listMembers: asyncHandler(async (req, res) => {
    const members = await businessService.listMembers(req.user.id);
    sendSuccess(res, 200, 'Business members retrieved successfully.', { members });
  }),
  inviteMember: asyncHandler(async (req, res) => {
    const member = await businessService.inviteMember(req.user.id, req.validated.body);
    sendSuccess(res, 201, 'Business member invited successfully.', { member });
  }),
  acceptMember: asyncHandler(async (req, res) => {
    const member = await businessService.acceptMember(req.user.id, req.validated.params.memberId);
    sendSuccess(res, 200, 'Business invitation accepted successfully.', { member });
  }),
  updateMember: asyncHandler(async (req, res) => {
    const member = await businessService.updateMember(
      req.user.id,
      req.validated.params.memberId,
      req.validated.body,
    );
    sendSuccess(res, 200, 'Business member updated successfully.', { member });
  }),
  removeMember: asyncHandler(async (req, res) => {
    await businessService.removeMember(req.user.id, req.validated.params.memberId);
    sendSuccess(res, 200, 'Business member removed successfully.');
  }),
};
