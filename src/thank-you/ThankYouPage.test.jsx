/* eslint-disable global-require, react/jsx-filename-extension */
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

import { render, screen } from '../testing';
import ThankYouPage from './ThankYouPage';

describe('<ThankYouPage />', () => {
  const renderAt = (path) => render(
    <MemoryRouter initialEntries={[path]}>
      <ThankYouPage />
    </MemoryRouter>,
  );

  it('renders the heading, the body and a "My orders" button linking to /orders', () => {
    renderAt('/thank-you');

    expect(
      screen.getByRole('heading', { name: /thank you for your order/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/we have received your order/i)).toBeInTheDocument();
    // The confirmation icon is rendered.
    expect(document.querySelector('svg')).toBeInTheDocument();
    // The "My orders" button points to the order history page.
    const button = screen.getByTestId('thank-you-my-orders-button');
    expect(button).toHaveAttribute('href', '/orders');
    expect(button).toHaveTextContent(/my orders/i);
  });

  it('tells the user that a Multibanco reference is confirmed only once paid', () => {
    renderAt('/thank-you');

    expect(screen.getByText(/multibanco reference/i)).toBeInTheDocument();
    expect(screen.getByText(/order history page/i)).toBeInTheDocument();
  });

  it('displays the order number when present in the URL query string', () => {
    renderAt('/thank-you?order_number=OPENEDX-100120');

    const orderNumberNode = screen.getByTestId('thank-you-order-number');
    expect(orderNumberNode).toHaveTextContent('OPENEDX-100120');
  });

  it('does not render the order number node when absent', () => {
    renderAt('/thank-you');

    expect(screen.queryByTestId('thank-you-order-number')).toBeNull();
  });
});
