/* eslint-disable global-require */
import React from 'react';
import { render, screen, waitFor } from '../testing';

import ConnectedOrderHistoryPage from './OrderHistoryPage';
import * as service from './service';

const storeMocks = require('../store/__mocks__/mockStore');

const requiredOrderHistoryPageProps = {
  isB2CSubsEnabled: false,
  fetchOrders: () => {},
};

// Match all media queries. This will result in rendering
// both the desktop and mobile views at the same time.
// eslint-disable-next-line no-unused-vars
global.matchMedia = (media) => ({
  addListener: () => {},
  removeListener: () => {},
  matches: true,
});

const matchSnapshot = (store) => {
  const { container } = render(
    <ConnectedOrderHistoryPage {...requiredOrderHistoryPageProps} />,
    store,
  );
  expect(container.querySelector('section')).toMatchSnapshot();
};

describe('<OrderHistoryPage />', () => {
  beforeEach(() => {
    jest
      .spyOn(service, 'fetchBasketPaymentStatus')
      .mockResolvedValue(null);
  });
  afterEach(() => { jest.restoreAllMocks(); });

  describe('Renders correctly in various states', () => {
    it('renders orders table with pagination', () => {
      matchSnapshot(storeMocks);
    });

    it('renders empty orders', () => {
      const storeMockWithoutOrders = {
        ...storeMocks,
        orderHistory: {
          ...storeMocks.orders,
          orders: [],
          count: 0,
          pageCount: 0,
          currentPage: null,
        },
      };

      matchSnapshot(storeMockWithoutOrders);
    });

    it('renders loading state', () => {
      const storeMockWithLoading = {
        ...storeMocks,
        orderHistory: {
          ...storeMocks.orders,
          loading: true,
          loadingError: false,
          orders: [],
          count: 0,
          pageCount: 0,
          currentPage: null,
        },
      };

      matchSnapshot(storeMockWithLoading);
    });
  });

  describe('Lazy payment status resolution and action buttons', () => {
    const storeWithOneOrder = (overrides = {}) => ({
      ...storeMocks,
      orderHistory: {
        ...storeMocks.orderHistory,
        loading: false,
        loadingError: false,
        count: 1,
        pageCount: 1,
        currentPage: 1,
        orders: [{
          datePlaced: '2026-05-07T00:39:20Z',
          total: '5.00',
          orderId: 'OPENEDX-100120',
          currency: 'EUR',
          lineItems: [{
            title: 'Lugar em Teste',
            quantity: 1,
            description: 'Lugar em Teste',
          }],
          receiptUrl: 'http://example.com/checkout/receipt/?order_number=OPENEDX-100120',
          status: 'pending',
          courseUrl: '',
          ...overrides,
        }],
      },
    });

    it(
      'renders a "pending" status badge for an order that is not paid yet '
        + 'and does NOT show the "Order details" or "Go to course" buttons',
      async () => {
        render(
          <ConnectedOrderHistoryPage {...requiredOrderHistoryPageProps} />,
          storeWithOneOrder(),
        );
        await waitFor(() => {
          // service.fetchBasketPaymentStatus is called for every pending row
          // on mount (lazy resolution requirement).
          expect(service.fetchBasketPaymentStatus).toHaveBeenCalledWith('OPENEDX-100120');
        });
        // status badge present
        expect(screen.getAllByTestId('order-status-pending').length).toBeGreaterThan(0);
        // no action buttons for non-paid orders
        expect(screen.queryByTestId('order-details-link')).toBeNull();
        expect(screen.queryByTestId('go-to-resource-link')).toBeNull();
      },
    );

    it(
      'renders a "paid" status badge with both "Order details" and "Go to course" '
        + 'buttons when the order is paid and a course_url is known',
      async () => {
        render(
          <ConnectedOrderHistoryPage {...requiredOrderHistoryPageProps} />,
          storeWithOneOrder({
            status: 'paid',
            courseUrl: 'https://lms.example.com/courses/course-v1:FCT+TP+2026/course/',
          }),
        );
        await waitFor(() => {
          expect(screen.getAllByTestId('order-status-paid').length).toBeGreaterThan(0);
        });
        // The "Order details" hyperlink uses the existing receiptUrl.
        const details = screen.getAllByTestId('order-details-link')[0];
        expect(details).toHaveAttribute(
          'href',
          'http://example.com/checkout/receipt/?order_number=OPENEDX-100120',
        );
        // The new "Go to course" hyperlink uses the courseUrl.
        const goToCourse = screen.getAllByTestId('go-to-resource-link')[0];
        expect(goToCourse).toHaveAttribute(
          'href',
          'https://lms.example.com/courses/course-v1:FCT+TP+2026/course/',
        );
      },
    );

    it(
      'when BasketPaymentStatusView later returns "paid" for a pending row, '
        + 'the page lazily updates the status badge to "paid"',
      async () => {
        service.fetchBasketPaymentStatus.mockResolvedValueOnce({
          order_number: 'OPENEDX-100120',
          status: 'paid',
          course_url: 'https://lms.example.com/courses/x/course/',
        });

        render(
          <ConnectedOrderHistoryPage {...requiredOrderHistoryPageProps} />,
          storeWithOneOrder(),
        );

        await waitFor(() => {
          expect(screen.getAllByTestId('order-status-paid').length).toBeGreaterThan(0);
        });
        // The "Go to course" button is now visible too.
        expect(screen.getAllByTestId('go-to-resource-link')[0]).toHaveAttribute(
          'href',
          'https://lms.example.com/courses/x/course/',
        );
      },
    );

    it(
      'does NOT call BasketPaymentStatusView for rows that are already paid',
      async () => {
        render(
          <ConnectedOrderHistoryPage {...requiredOrderHistoryPageProps} />,
          storeWithOneOrder({ status: 'paid' }),
        );
        // Give React a chance to schedule the effect.
        await waitFor(() => {
          expect(screen.getAllByTestId('order-status-paid').length).toBeGreaterThan(0);
        });
        expect(service.fetchBasketPaymentStatus).not.toHaveBeenCalled();
      },
    );
  });
});
