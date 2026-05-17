import { getAuthenticatedHttpClient, getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform';

const NAU_EXT_BASE_PATH = '/payment/nau_extensions';

/**
 * Build the absolute URL of a nau_extensions endpoint. Falls back to the
 * ecommerce base url configured for the MFE.
 */
function nauExtensionsUrl(path) {
  const { ECOMMERCE_BASE_URL } = getConfig();
  return `${ECOMMERCE_BASE_URL}${NAU_EXT_BASE_PATH}${path}`;
}

/**
 * Lazily resolves the status of a single basket against the nau_extensions
 * `BasketPaymentStatusView`. Returns the JSON returned by the API or `null`
 * on error so callers can decide whether to keep the previous state.
 */
export async function fetchBasketPaymentStatus(orderNumber) {
  if (!orderNumber) { return null; }
  const httpClient = getAuthenticatedHttpClient();
  try {
    const { data } = await httpClient.get(
      nauExtensionsUrl('/basket-payment-status/'),
      { params: { order_number: orderNumber } },
    );
    return data;
  } catch (err) {
    return null;
  }
}

/**
 * Fetches the authenticated user's pending baskets (PayGate attempts without
 * an order yet). Returns an empty list on error so the Order History page
 * keeps working even if the extension API is unavailable.
 */
export async function fetchPendingBaskets() {
  const httpClient = getAuthenticatedHttpClient();
  try {
    const { data } = await httpClient.get(nauExtensionsUrl('/pending-baskets/'));
    return data.results || [];
  } catch (err) {
    return [];
  }
}

// eslint-disable-next-line import/prefer-default-export
export async function getOrders(page = 1, pageSize = 20) {
  const { ORDER_HISTORY_API_URL, RECEIPT_URL, ECOMMERCE_BASE_URL } = getConfig();

  const ECOMMERCE_API_BASE_URL = `${ECOMMERCE_BASE_URL}/api/v2`;
  const ECOMMERCE_RECEIPT_BASE_URL = RECEIPT_URL
    ? `${RECEIPT_URL}` : `${ECOMMERCE_BASE_URL}/checkout/receipt/`;
  const ECOMMERCE_ORDERS_API_URL = ORDER_HISTORY_API_URL
    ? `${ORDER_HISTORY_API_URL}` : `${ECOMMERCE_API_BASE_URL}/orders/`;

  const httpClient = getAuthenticatedHttpClient();
  const { username } = getAuthenticatedUser();

  const { data } = await httpClient.get(`${ECOMMERCE_ORDERS_API_URL}`, {
    params: {
      username,
      page,
      page_size: pageSize,
    },
  });

  const transformedResults = data.results.map(({
    total_excl_tax, // eslint-disable-line camelcase
    lines,
    number,
    currency,
    date_placed, // eslint-disable-line camelcase
  }) => {
    const lineItems = lines.map(({
      title,
      quantity,
      description,
    }) => ({
      title,
      quantity,
      description,
    }));

    return {
      datePlaced: date_placed, // eslint-disable-line camelcase
      total: total_excl_tax, // eslint-disable-line camelcase
      orderId: number,
      currency,
      lineItems,
      receiptUrl: `${ECOMMERCE_RECEIPT_BASE_URL}?order_number=${number}`,
      // Orders returned by the standard ecommerce /api/v2/orders/ endpoint
      // always correspond to fulfilled orders, so we mark them as paid up
      // front. Pending baskets (no order yet) are merged in by the saga
      // and start as "pending".
      status: 'paid',
      courseUrl: '',
    };
  });

  // Merge in pending baskets (PayGate attempts that did not yet result in an
  // order). The Order History page will lazily try to confirm them via
  // BasketPaymentStatusView when it renders each row.
  const pending = await fetchPendingBaskets();
  const pendingResults = pending
    .filter(p => !transformedResults.some(o => o.orderId === p.order_number))
    .map(p => ({
      datePlaced: p.date_placed,
      total: p.total,
      orderId: p.order_number,
      currency: p.currency,
      lineItems: p.lines,
      receiptUrl: `${ECOMMERCE_RECEIPT_BASE_URL}?order_number=${p.order_number}`,
      status: p.status || 'pending',
      courseUrl: p.course_url || '',
    }));

  const merged = [...pendingResults, ...transformedResults];

  return {
    count: data.count + pendingResults.length,
    pageCount: Math.ceil((data.count + pendingResults.length) / pageSize),
    currentPage: page,
    next: data.next,
    previous: data.previous,
    orders: merged,
  };
}

