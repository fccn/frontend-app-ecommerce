import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  'ecommerce.thank.you.page.heading': {
    id: 'ecommerce.thank.you.page.heading',
    defaultMessage: 'Thank you for your order!',
    description: 'Heading shown on the thank-you page after an order is placed.',
  },
  'ecommerce.thank.you.page.body': {
    id: 'ecommerce.thank.you.page.body',
    defaultMessage: 'We have received your order and are processing it.',
    description: 'Main body text of the thank-you page.',
  },
  'ecommerce.thank.you.page.body.async': {
    id: 'ecommerce.thank.you.page.body.async',
    defaultMessage:
      'If you chose to pay by Multibanco reference, your enrolment is confirmed '
      + 'once the payment is made. You can follow the status of your order on the '
      + 'order history page.',
    description:
      'Explains to the user that a Multibanco reference payment is confirmed only '
      + 'after it is actually paid, and where to check the status.',
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
