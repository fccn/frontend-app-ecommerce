import { getAuthenticatedHttpClient, getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { getConfig } from '@edx/frontend-platform';

// eslint-disable-next-line import/prefer-default-export
export async function getOrders(page = 1, pageSize = 20) {
  const { ORDER_HISTORY_URL, RECEIPT_URL, ECOMMERCE_BASE_URL } = getConfig();
  
  const ECOMMERCE_API_BASE_URL = `${ECOMMERCE_BASE_URL}/api/v2`;
  const ECOMMERCE_RECEIPT_BASE_URL = RECEIPT_URL
    ? `${RECEIPT_URL}` : `${ECOMMERCE_BASE_URL}/checkout/receipt/`;
  const ECOMMERCE_ORDERS_URL = ORDER_HISTORY_URL
    ? `${ORDER_HISTORY_URL}` : `${ECOMMERCE_API_BASE_URL}/orders/`;

  const httpClient = getAuthenticatedHttpClient();
  const { username } = getAuthenticatedUser();

  const { data } = await httpClient.get(`${ECOMMERCE_ORDERS_URL}`, {
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
