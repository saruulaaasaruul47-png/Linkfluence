import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { collaborationService } from './collaboration.service.js';
export const collaborationController = {
  list: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Collaborations loaded.', await collaborationService.list(req.user.id, req.validated.query))),
  get: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Collaboration loaded.', { collaboration: await collaborationService.get(req.user.id, req.validated.params.id) })),
  updateTerms: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Terms updated.', { collaboration: await collaborationService.updateTerms(req.user.id, req.validated.params.id, req.validated.body) })),
  lockAgreement: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Agreement locked.', { collaboration: await collaborationService.lockAgreement(req.user.id, req.validated.params.id, req.validated.body) })),
  agreementAction: asyncHandler(async (req, res) => {
    const result = req.validated.body.action === 'APPROVE'
      ? await collaborationService.approveAgreement(req.user.id, req.validated.params.id, req.validated.body)
      : await collaborationService.requestAgreementChanges(req.user.id, req.validated.params.id, req.validated.body);
    sendSuccess(res, 200, 'Agreement action saved.', { collaboration: result });
  }),
  toggleTask: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Task updated.', { collaboration: await collaborationService.toggleTask(req.user.id, req.validated.params.id, req.validated.params.taskId) })),
  addFile: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Project file added.', await collaborationService.addFile(req.user.id, req.validated.params.id, req.validated.body))),
  addActivity: asyncHandler(async (req, res) => sendSuccess(res, 201, 'Activity note added.', { collaboration: await collaborationService.addActivity(req.user.id, req.validated.params.id, req.validated.body.message) })),
};
