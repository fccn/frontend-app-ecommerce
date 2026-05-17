import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  'ecommerce.thank.you.page.heading': {
    id: 'ecommerce.thank.you.page.heading',
    defaultMessage: 'Thank you for your purchase',
    description: 'Heading shown on the thank-you page reached after a payment attempt.',
  },
  'ecommerce.thank.you.page.body': {
    id: 'ecommerce.thank.you.page.body',
    defaultMessage:
      'Your order has been received. Some payment methods (such as MB references '
      + 'or MBWAY) are confirmed asynchronously and may take a few moments to be '
      + 'processed. You can follow the status of your order in your order history.',
    description:
      'Explanatory message on the thank-you page about asynchronous payment '
      + 'confirmation. Tells the user to check the order history page for the status.',
  },
  'ecommerce.thank.you.page.button.my.orders': {
    id: 'ecommerce.thank.you.page.button.my.orders',
    defaultMessage: 'My orders',
    description:
      'Label of the button on the thank-you page that takes the user to the '
      + 'order history page.',
  },
  'ecommerce.thank.you.page.order.number': {
    id: 'ecommerce.thank.you.page.order.number',
    defaultMessage: 'Order number: {orderNumber}',
    description: 'Order number shown on the thank-you page.',
  },
});

export default messages;
