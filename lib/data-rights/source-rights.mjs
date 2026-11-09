/**
 * Side-effect-free, fail-closed rights gate for commercial dataset operations.
 * This module makes no network calls and grants no implicit permissions.
 * Wire requireSourceRight() before any new source adapter collects/reuses data.
 */
export const ACTIONS = Object.freeze([
  'collect', 'derive_price', 'display', 'retain', 'redistribute', 'model_training'
]);
const allowedActions = new Set(ACTIONS);
export function evaluateSourceRight(source, action, now = new Date()) {
  if (!allowedActions.has(action)) return { allowed: false, reason: 'unknown_action' };
  if (!source || typeof source !== 'object') return { allowed: false, reason: 'unknown_source' };
  if (source.status !== 'approved') return { allowed: false, reason: 'not_approved' };
  if (!source.active) return { allowed: false, reason: 'inactive' };
  if (!Array.isArray(source.allowedActions) || !source.allowedActions.includes(action)) {
    return { allowed: false, reason: 'action_not_licensed' };
  }
  if (typeof source.licenceUrl !== 'string' || !/^https:\/\//i.test(source.licenceUrl)) {
    return { allowed: false, reason: 'missing_licence_evidence' };
  }
  if (typeof source.approvedBy !== 'string' || source.approvedBy.trim().length === 0) {
    return { allowed: false, reason: 'missing_approval' };
  }
  if (typeof source.reviewedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(source.reviewedAt)) {
    return { allowed: false, reason: 'missing_review_date' };
  }
  const reviewed = new Date(source.reviewedAt + 'T00:00:00.000Z');
  const clock = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(reviewed.getTime()) || !Number.isFinite(clock.getTime()) || reviewed > clock) {
    return { allowed: false, reason: 'invalid_review_date' };
  }
  if (source.expiresAt != null) {
    if (typeof source.expiresAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(source.expiresAt)) {
      return { allowed: false, reason: 'invalid_expiry' };
    }
    const expiry = new Date(source.expiresAt + 'T23:59:59.999Z');
    if (!Number.isFinite(expiry.getTime()) || clock > expiry) {
      return { allowed: false, reason: 'expired' };
    }
  }
  if (action === 'derive_price' && !source.allowedActions.includes('collect')) {
    return { allowed: false, reason: 'no_collection_right' };
  }
  return { allowed: true, reason: 'approved' };
}
export function requireSourceRight(registry, sourceId, action, now = new Date()) {
  const sources = Array.isArray(registry?.sources) ? registry.sources : [];
  const source = sources.find(s => s?.id === sourceId);
  const decision = evaluateSourceRight(source, action, now);
  if (!decision.allowed) {
    const error = new Error('Source rights denied: ' + sourceId + ': ' + action + ': ' + decision.reason);
    error.code = 'SOURCE_RIGHTS_DENIED';
    throw error;
  }
  return source;
}