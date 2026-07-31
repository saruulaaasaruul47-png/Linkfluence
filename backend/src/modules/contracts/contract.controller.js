import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { contractService } from './contract.service.js';
export const contractController = {
  get: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Contract loaded.', { contract: await contractService.get(req.user.id, req.validated.params.id) })),
  action: asyncHandler(async (req, res) => {
    const contract = req.validated.body.action === 'APPROVE'
      ? await contractService.approve(req.user.id, req.validated.params.id)
      : await contractService.requestChanges(req.user.id, req.validated.params.id, req.validated.body.note);
    sendSuccess(res, 200, 'Contract action saved.', { contract });
  }),
  document: asyncHandler(async (req, res) => {
    const document = await contractService.document(req.user.id, req.validated.params.id, req.validated.query.version);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
    res.status(200).send(document.body);
  }),
};
