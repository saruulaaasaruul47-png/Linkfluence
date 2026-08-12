import asyncHandler from 'express-async-handler';
import { sendSuccess } from '../../shared/utils/response.js';
import { contractService } from './contract.service.js';
export const contractController = {
  list: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Contracts loaded.', await contractService.list(req.user, req.validated.query))),
  get: asyncHandler(async (req, res) => sendSuccess(res, 200, 'Contract loaded.', { contract: await contractService.get(req.user, req.validated.params.id) })),
  action: asyncHandler(async (req, res) => {
    const contract = req.validated.body.action === 'APPROVE'
      ? await contractService.approve(req.user, req.validated.params.id)
      : await contractService.requestChanges(req.user, req.validated.params.id, req.validated.body.note);
    sendSuccess(res, 200, 'Contract action saved.', { contract });
  }),
  document: asyncHandler(async (req, res) => {
    const document = await contractService.document(req.user, req.validated.params.id, req.validated.query.version);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
    res.status(200).send(document.buffer);
  }),
};
