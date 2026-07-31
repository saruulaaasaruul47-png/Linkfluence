import { Router } from 'express';
import { authRouter } from '../modules/auth/index.js';
import { businessRouter } from '../modules/business/index.js';
import { businessCampaignRouter, campaignRouter } from '../modules/campaigns/index.js';
import { collectionRouter } from '../modules/collections/index.js';
import { creatorRouter } from '../modules/creator/index.js';
import { discoveryRouter, searchRouter } from '../modules/discovery/index.js';
import { interactionRouter } from '../modules/interactions/index.js';
import {
  businessesRouter,
  categoriesRouter,
  creatorsRouter,
} from '../modules/marketplace/index.js';
import { mediaRouter } from '../modules/media/index.js';
import { ownerPortfolioRouter, publicPortfolioRouter } from '../modules/portfolio/index.js';
import {
  businessProposalRouter,
  campaignProposalRouter,
  creatorProposalRouter,
  proposalRouter,
} from '../modules/proposals/index.js';
import { showcaseRouter } from '../modules/showcase/index.js';
import { businessSourcingRouter, creatorInvitationRouter } from '../modules/sourcing/index.js';
import { userRouter } from '../modules/users/index.js';
import { offerRouter } from '../modules/offers/index.js';
import { collaborationRouter } from '../modules/collaborations/index.js';
import { contractRouter } from '../modules/contracts/index.js';
import { collaborationPaymentRouter, paymentRouter } from '../modules/payments/index.js';
import { collaborationDeliverableRouter } from '../modules/deliverables/index.js';
import { collaborationReviewRouter } from '../modules/reviews/index.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Influence Hub API is healthy.',
    data: { status: 'ok' },
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/creator', creatorRouter);
apiRouter.use('/business', businessRouter);
apiRouter.use('/media', mediaRouter);
apiRouter.use('/creator/portfolio', ownerPortfolioRouter);
apiRouter.use('/portfolio', publicPortfolioRouter);
apiRouter.use('/creators', creatorsRouter);
apiRouter.use('/businesses', businessesRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/marketplace', discoveryRouter);
apiRouter.use('/search', searchRouter);
apiRouter.use('/library', interactionRouter);
apiRouter.use('/collections', collectionRouter);
apiRouter.use('/showcase', showcaseRouter);
apiRouter.use('/campaigns', campaignRouter);
apiRouter.use('/campaigns', campaignProposalRouter);
apiRouter.use('/business/campaigns', businessCampaignRouter);
apiRouter.use('/proposals', proposalRouter);
apiRouter.use('/creator/proposals', creatorProposalRouter);
apiRouter.use('/business/proposals', businessProposalRouter);
apiRouter.use('/business', businessSourcingRouter);
apiRouter.use('/creator/invitations', creatorInvitationRouter);
apiRouter.use('/offers', offerRouter);
apiRouter.use('/collaborations', collaborationRouter);
apiRouter.use('/collaborations', collaborationPaymentRouter);
apiRouter.use('/collaborations', collaborationDeliverableRouter);
apiRouter.use('/collaborations', collaborationReviewRouter);
apiRouter.use('/contracts', contractRouter);
apiRouter.use('/payments', paymentRouter);
