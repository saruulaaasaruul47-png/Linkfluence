import { AUTH_ERROR } from '../constants/auth.constants.js';
import { AppError } from '../errors/AppError.js';

export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const details = {};
      for (const issue of result.error.issues) {
        const path = issue.path.filter((part) => part !== 'body' && part !== 'params' && part !== 'query');
        details[path.join('.') || 'request'] = issue.message;
      }
      next(new AppError('Please check the submitted information.', 400, AUTH_ERROR.VALIDATION, details));
      return;
    }

    req.validated = result.data;
    next();
  };
}
