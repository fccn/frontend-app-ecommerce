import { getAuthenticatedHttpClient, getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform';

const NAU_EXT_BASE_PATH = '/payment/nau_extensions';

function nauExtensionsUrl(path) {
  const { ECOMMERCE_BASE_URL } = getConfig();
  return `${ECOMMERCE_BASE_URL}${NAU_EXT_BASE_PATH}${path}`;
}

/**
 * Lazily resolve the payment status of a single order.
 *
 * Asynchronous payment methods (Multibanco references) are not confirmed while
 * the user is in the browser, so their order is placed in the `Pending` status.
 * This asks ecommerce to check with PayGate whether the payment has landed and,
 * if it has, to fulfil the order. There is no background job: this is called
 * once per pending row when the Order History page is opened.
 *
 * Returns the order's status, or null when the check could not be made -- in
 * which case the row keeps the status the orders API reported.
 */
export async function fetchOrderPaymentStatus(orderNumber) {
  if (!orderNumber) { return null; }
  const httpClient = getAuthenticatedHttpClient();
  try {
    const { data } = await httpClient.get(
      nauExtensionsUrl('/order-payment-status/'),
      { params: { order_number: orderNumber } },
    );
    return data;
  } catch (err) {
    return null;
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
    status,
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
      status,
    };
  });

  return {
    count: data.count,
    pageCount: Math.ceil(data.count / pageSize),
    currentPage: page,
    next: data.next,
    previous: data.previous,
    orders: transformedResults,
  };
}
