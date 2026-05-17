import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Button } from '@openedx/paragon';

import messages from './ThankYouPage.messages';

/**
 * Thank-You page reached after the PayGate "success" callback redirects the user
 * back from the payment provider. The actual payment status (specially for
 * asynchronous methods like MB and MBWAY) is NOT resolved here: the user is
 * invited to navigate to the Order History page where each row is lazily
 * resolved against the payment processor.
 *
 * The order number, when known, is passed via the `order_number` query string
 * parameter by `PayGateCallbackSuccessResponseView`.
 */
const ThankYouPage = () => {
  const { formatMessage } = useIntl();
  const params = new URLSearchParams(useLocation().search);
  const orderNumber = params.get('order_number');

  return (
    <div
      className="page__thank-you container-fluid py-5"
      data-testid="thank-you-page"
    >
      <section className="thank-you">
        <h1>{formatMessage(messages['ecommerce.thank.you.page.heading'])}</h1>
        {orderNumber && (
          <p data-testid="thank-you-order-number">
            {formatMessage(
              messages['ecommerce.thank.you.page.order.number'],
              { orderNumber },
            )}
          </p>
        )}
        <p>{formatMessage(messages['ecommerce.thank.you.page.body'])}</p>
        <p>
          <Button
            as={Link}
            to="/orders"
            variant="primary"
            data-testid="thank-you-my-orders-button"
          >
            {formatMessage(
              messages['ecommerce.thank.you.page.button.my.orders'],
            )}
          </Button>
        </p>
      </section>
    </div>
  );
};

export default ThankYouPage;
