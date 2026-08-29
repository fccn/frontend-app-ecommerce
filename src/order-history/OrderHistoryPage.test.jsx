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
  addEventListener: () => {},
  removeEventListener: () => {},
  matches: true,
});

// Mock react-responsive to always render children
jest.mock('react-responsive', () => {
  const react = require('react'); // eslint-disable-line global-require
  return {
    __esModule: true,
    default: ({ children }) => react.createElement(react.Fragment, null, children),
    useMediaQuery: () => true,
  };
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
      .spyOn(service, 'fetchOrderPaymentStatus')
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

  describe('Asynchronous payment status', () => {
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
          status: 'Complete',
          ...overrides,
        }],
      },
    });

    it('shows a pending order as awaiting payment, with no receipt link', async () => {
      render(
        <ConnectedOrderHistoryPage {...requiredOrderHistoryPageProps} />,
        storeWithOneOrder({ status: 'Pending' }),
      );

      await waitFor(() => {
        expect(service.fetchOrderPaymentStatus).toHaveBeenCalledWith('OPENEDX-100120');
      });
      expect(screen.getAllByTestId('order-status-warning').length).toBeGreaterThan(0);
      expect(screen.getAllByText(/awaiting payment/i).length).toBeGreaterThan(0);
      // An unpaid order must not offer a receipt.
      expect(screen.queryByTestId('order-receipt-link')).toBeNull();
    });

    it('shows a completed order as paid, with a receipt link', async () => {
      render(
        <ConnectedOrderHistoryPage {...requiredOrderHistoryPageProps} />,
        storeWithOneOrder({ status: 'Complete' }),
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('order-receipt-link').length).toBeGreaterThan(0);
      });
      expect(screen.getAllByTestId('order-receipt-link')[0]).toHaveAttribute(
        'href',
        'http://example.com/checkout/receipt/?order_number=OPENEDX-100120',
      );
    });

    it('never asks the payment processor about an order that is already settled', async () => {
      render(
        <ConnectedOrderHistoryPage {...requiredOrderHistoryPageProps} />,
        storeWithOneOrder({ status: 'Complete' }),
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('order-receipt-link').length).toBeGreaterThan(0);
      });
      expect(service.fetchOrderPaymentStatus).not.toHaveBeenCalled();
    });

    it('updates a pending order to paid once PayGate confirms the payment', async () => {
      service.fetchOrderPaymentStatus.mockResolvedValueOnce({
        order_number: 'OPENEDX-100120',
        status: 'Complete',
      });

      render(
        <ConnectedOrderHistoryPage {...requiredOrderHistoryPageProps} />,
        storeWithOneOrder({ status: 'Pending' }),
      );

      // The row starts pending and becomes paid, exposing the receipt link.
      await waitFor(() => {
        expect(screen.getAllByTestId('order-receipt-link').length).toBeGreaterThan(0);
      });
      expect(screen.getAllByTestId('order-status-success').length).toBeGreaterThan(0);
      expect(screen.queryByTestId('order-status-warning')).toBeNull();
    });

    it('leaves the order pending when the status could not be resolved', async () => {
      service.fetchOrderPaymentStatus.mockResolvedValueOnce(null);

      render(
        <ConnectedOrderHistoryPage {...requiredOrderHistoryPageProps} />,
        storeWithOneOrder({ status: 'Pending' }),
      );

      await waitFor(() => {
        expect(service.fetchOrderPaymentStatus).toHaveBeenCalled();
      });
      expect(screen.getAllByTestId('order-status-warning').length).toBeGreaterThan(0);
    });

    it('shows a failed payment as such', async () => {
      render(
        <ConnectedOrderHistoryPage {...requiredOrderHistoryPageProps} />,
        storeWithOneOrder({ status: 'Payment Error' }),
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('order-status-danger').length).toBeGreaterThan(0);
      });
      expect(screen.getAllByText(/payment failed/i).length).toBeGreaterThan(0);
      expect(screen.queryByTestId('order-receipt-link')).toBeNull();
    });
  });
});
