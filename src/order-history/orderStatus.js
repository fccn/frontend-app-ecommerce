/**
 * Order statuses, as reported by the ecommerce orders API.
 *
 * These are the values of `ecommerce.extensions.fulfillment.status.ORDER` and are
 * returned verbatim by both `/api/v2/orders/` and the NAU
 * `/payment/nau_extensions/order-payment-status/` endpoint, so the page has a
 * single vocabulary to reason about.
 *
 * The pipeline ecommerce allows is:
 *
 *     Pending -> (Open, Payment Error)
 *     Open    -> (Complete, Fulfillment Error)
 *
 * `Pending` is the status of an order whose payment has not been confirmed yet.
 * On NAU that means a Multibanco reference the learner can still go and pay.
 */
export const ORDER_STATUS = {
  PENDING: 'Pending',
  PAYMENT_ERROR: 'Payment Error',
  OPEN: 'Open',
  FULFILLMENT_ERROR: 'Fulfillment Error',
  COMPLETE: 'Complete',
};

/**
 * Statuses that mean the money has actually been taken. `Open` and
 * `Fulfillment Error` are paid orders whose enrolment has not completed yet, so
 * the learner is entitled to a receipt for all three.
 */
const PAID_STATUSES = [
  ORDER_STATUS.COMPLETE,
  ORDER_STATUS.OPEN,
  ORDER_STATUS.FULFILLMENT_ERROR,
];

export const isPaid = status => PAID_STATUSES.includes(status);

/**
 * Only `Pending` orders are worth asking the payment processor about. Resolving
 * anything else would re-run `handle_payment` against orders that are already
 * settled.
 */
export const isPending = status => status === ORDER_STATUS.PENDING;

/**
 * Map an order status onto the message used to label it and the badge variant
 * used to colour it.
 */
export function statusPresentation(status) {
  switch (status) {
    case ORDER_STATUS.PENDING:
      return { messageKey: 'ecommerce.order.history.status.pending', variant: 'warning' };
    case ORDER_STATUS.PAYMENT_ERROR:
      return { messageKey: 'ecommerce.order.history.status.failed', variant: 'danger' };
    case ORDER_STATUS.FULFILLMENT_ERROR:
      return { messageKey: 'ecommerce.order.history.status.fulfillment.error', variant: 'warning' };
    default:
      // Complete and Open are both "paid" as far as the learner is concerned.
      return { messageKey: 'ecommerce.order.history.status.paid', variant: 'success' };
  }
}
