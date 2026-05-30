import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useIntl } from '@edx/frontend-platform/i18n';
import { Button, Icon } from '@openedx/paragon';
import { CheckCircle } from '@openedx/paragon/icons';

import messages from './ThankYouPage.messages';

/**
 * Thank-You page reached after the PayGate "success" callback redirects the user
 * back from the payment provider.
 *
 * The payment is deliberately NOT confirmed here. For an asynchronous method such
 * as a Multibanco reference the money has not moved yet and will not for hours or
 * days, so this page only acknowledges the order and points the user at the Order
 * History page, where each pending order is resolved against PayGate when the page
 * is opened.
 *
 * The order number is passed by `PayGateCallbackSuccessResponseView` through the
 * `order_number` query string parameter.
 */
const ThankYouPage = () => {
  const { formatMessage } = useIntl();
  const params = new URLSearchParams(useLocation().search);
  const orderNumber = params.get('order_number');

  return (
    <div
      className="page__thank-you container-fluid py-5 d-flex justify-content-center"
      data-testid="thank-you-page"
    >
      <section className="thank-you text-center p-4">
        <Icon src={CheckCircle} className="thank-you__icon text-success mx-auto mb-3" size="lg" />

        <h1 className="mb-3">
          {formatMessage(messages['ecommerce.thank.you.page.heading'])}
        </h1>

        <p className="lead mb-3">
          {formatMessage(messages['ecommerce.thank.you.page.body'])}
        </p>

        <p className="mb-4">
          {formatMessage(messages['ecommerce.thank.you.page.body.async'])}
        </p>

        {orderNumber && (
          <p data-testid="thank-you-order-number" className="mb-4 text-muted">
            {formatMessage(
              messages['ecommerce.thank.you.page.order.number'],
              { orderNumber },
            )}
          </p>
        )}

        <Button
          as={Link}
          to="/orders"
          variant="primary"
          data-testid="thank-you-my-orders-button"
          className="px-5"
        >
          {formatMessage(messages['ecommerce.thank.you.page.button.my.orders'])}
        </Button>
      </section>
    </div>
  );
};

export default ThankYouPage;
