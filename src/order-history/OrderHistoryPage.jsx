import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { getConfig, mergeConfig } from '@edx/frontend-platform';
import {
  injectIntl,
  intlShape,
  FormattedDate,
  FormattedNumber,
} from '@edx/frontend-platform/i18n';
import {
  Badge, DataTable, Hyperlink, Pagination,
} from '@openedx/paragon';
import { Receipt } from '@openedx/paragon/icons';
import MediaQuery from 'react-responsive';

import { PageLoading } from '../components';

import messages from './OrderHistoryPage.messages';

// Actions
import { fetchOrders } from './actions';
import { pageSelector } from './selectors';
import { fetchOrderPaymentStatus } from './service';
import { isPaid, isPending, statusPresentation } from './orderStatus';

/**
 * TEMPORARY
 *
 * Until we add the following keys in frontend-platform,
 * use mergeConfig to join it with the rest of the config items
 * (so we don't need to get it separately from process.env).
 * After we add the keys to frontend-platform, this mergeConfig can go away
 */
mergeConfig({
  ORDER_HISTORY_URL: process.env.ORDER_HISTORY_URL,
  RECEIPT_URL: process.env.RECEIPT_URL,
});

class OrderHistoryPage extends React.Component {
  constructor(props) {
    super(props);

    this.handlePageSelect = this.handlePageSelect.bind(this);
    this.state = {
      statusOverrides: {},
    };
  }

  componentDidMount() {
    this.resolvePendingOrders();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.orders !== this.props.orders) {
      this.resolvePendingOrders();
    }
  }

  handlePageSelect(page) {
    // TODO: We should update the url and trigger this fetching based on the route
    this.props.fetchOrders(page);
  }

  getStatus(order) {
    return this.state.statusOverrides[order.orderId] || order.status;
  }

  getTableData() {
    return this.props.orders.map((order) => {
      const {
        lineItems,
        datePlaced,
        total,
        currency,
        orderId,
        receiptUrl,
      } = order;
      const status = this.getStatus(order);
      return {
        description: this.renderLineItems(lineItems),
        datePlaced: <FormattedDate value={new Date(datePlaced)} />,
        // eslint-disable-next-line react/style-prop-object
        total: <FormattedNumber value={total} style="currency" currency={currency} />,
        status: this.renderStatusBadge(status),
        orderId,
        receipt: (isPaid(status) && receiptUrl) ? this.renderReceiptIcon(receiptUrl) : null,
      };
    }, this);
  }

  /**
   * Resolve every pending order on the current page.
   *
   * This is the whole asynchronous-payment mechanism: there is no polling and no
   * background job. Opening this page asks ecommerce, once per pending order,
   * whether PayGate has received the payment yet. An order that has been paid is
   * fulfilled server-side during that call and comes back as `Complete`.
   */
  async resolvePendingOrders() {
    const pending = (this.props.orders || []).filter(order => isPending(this.getStatus(order)));

    await Promise.all(pending.map(async (order) => {
      const data = await fetchOrderPaymentStatus(order.orderId);
      if (!data || !data.status) { return; }
      this.setState(prev => ({
        statusOverrides: {
          ...prev.statusOverrides,
          [order.orderId]: data.status,
        },
      }));
    }));
  }

  renderStatusBadge(status) {
    const { messageKey, variant } = statusPresentation(status);
    return (
      <Badge variant={variant} data-testid={`order-status-${variant}`}>
        {this.props.intl.formatMessage(messages[messageKey])}
      </Badge>
    );
  }

  renderReceiptIcon(receiptUrl) {
    // Use the project's Paragon icon set instead of an inline SVG
    return (
      <Hyperlink
        destination={receiptUrl}
        className="order-receipt-link"
        data-testid="order-receipt-link"
        aria-label={this.props.intl.formatMessage(messages['ecommerce.order.history.view.order.detail'])}
      >
        <Receipt size={16} aria-hidden />
      </Hyperlink>
    );
  }

  renderPagination() {
    const {
      pageCount,
      currentPage,
    } = this.props;

    if (pageCount <= 1) { return null; }

    return (
      <Pagination
        paginationLabel="pagination navigation"
        className="pagination-margin"
        pageCount={pageCount}
        currentPage={currentPage}
        onPageSelect={this.handlePageSelect}
      />
    );
  }

  renderLineItems(lineItems) {
    return lineItems.map(({
      description,
      quantity,
    }) => (
      <p className="d-flex" key={description}>
        <span className="mr-3">{quantity}&times;</span>
        <span>{description}</span>
      </p>
    ));
  }

  renderOrdersTable() {
    return (
      <DataTable
        data={this.getTableData()}
        itemCount={this.props.count}
        columns={[
          {
            Header: this.props.intl.formatMessage(messages['ecommerce.order.history.table.column.items']),
            accessor: 'description',
          },
          {
            Header: this.props.intl.formatMessage(messages['ecommerce.order.history.table.column.date.placed']),
            accessor: 'datePlaced',
          },
          {
            Header: this.props.intl.formatMessage(messages['ecommerce.order.history.table.column.total.cost']),
            accessor: 'total',
          },
          {
            Header: this.props.intl.formatMessage(messages['ecommerce.order.history.table.column.order.number']),
            accessor: 'orderId',
          },
          {
            Header: this.props.intl.formatMessage(messages['ecommerce.order.history.table.column.status']),
            accessor: 'status',
          },
          {
            Header: '',
            accessor: 'receipt',
            // ensure this column is right aligned in styles
            headerClassName: 'text-right',
            className: 'text-right',
            width: 50,
          },
        ]}
      >
        <DataTable.Table />
      </DataTable>
    );
  }

  renderMobileOrdersTable() {
    return this.getTableData().map(({
      description, datePlaced, total, orderId, status, receipt,
    }) => (
      <div className="border-bottom py-3" key={orderId}>
        <dl>
          <dt>
            {this.props.intl.formatMessage(messages['ecommerce.order.history.table.column.items'])}
          </dt>
          <dd>{description}</dd>
          <dt>
            {this.props.intl.formatMessage(messages['ecommerce.order.history.table.column.date.placed'])}
          </dt>
          <dd>{datePlaced}</dd>
          <dt>
            {this.props.intl.formatMessage(messages['ecommerce.order.history.table.column.total.cost'])}
          </dt>
          <dd>{total}</dd>
          <dt>
            {this.props.intl.formatMessage(messages['ecommerce.order.history.table.column.order.number'])}
          </dt>
          <dd>{orderId}</dd>
          <dt>
            {this.props.intl.formatMessage(messages['ecommerce.order.history.table.column.status'])}
          </dt>
          <dd>{status}</dd>
          <dd className="text-right">{receipt}</dd>
        </dl>
      </div>
    ));
  }

  renderEmptyMessage() {
    return (
      <p>
        {this.props.intl.formatMessage(messages['ecommerce.order.history.no.orders'], {
          siteName: getConfig().SITE_NAME,
        })}
      </p>
    );
  }

  renderLoading() {
    return (
      <PageLoading
        srMessage={this.props.intl.formatMessage(
          messages['ecommerce.order.history.loading.orders'],
        )}
      />
    );
  }

  renderOrders() {
    const hasOrders = this.props.orders.length > 0;

    return hasOrders ? (
      <>
        <MediaQuery query="(max-width: 768px)">
          {this.renderMobileOrdersTable()}
        </MediaQuery>
        <MediaQuery query="(min-width: 769px)">
          {this.renderOrdersTable()}
        </MediaQuery>
        {this.renderPagination()}
      </>
    ) : (
      this.renderEmptyMessage()
    );
  }

  render() {
    const { loading, intl, isB2CSubsEnabled } = this.props;

    const heading = intl.formatMessage(
      messages['ecommerce.order.history.page.heading'],
    );

    return (
      <section className="page__order-history">
        {isB2CSubsEnabled ? <h2>{heading}</h2> : <h1>{heading}</h1>}
        <div>{loading ? this.renderLoading() : this.renderOrders()}</div>
      </section>
    );
  }
}

OrderHistoryPage.propTypes = {
  intl: intlShape.isRequired,
  isB2CSubsEnabled: PropTypes.bool.isRequired,
  orders: PropTypes.arrayOf(PropTypes.shape({
    datePlaced: PropTypes.string,
    total: PropTypes.string,
    orderId: PropTypes.string,
    receiptUrl: PropTypes.string,
    currency: PropTypes.string,
    status: PropTypes.string,
    lineItems: PropTypes.arrayOf(PropTypes.shape({
      title: PropTypes.string,
      quantity: PropTypes.number,
      description: PropTypes.string,
    })),
  })),
  pageCount: PropTypes.number,
  count: PropTypes.number,
  currentPage: PropTypes.number,
  loading: PropTypes.bool,
  fetchOrders: PropTypes.func.isRequired,
};

OrderHistoryPage.defaultProps = {
  orders: [],
  loading: false,
  pageCount: 0,
  count: 0,
  currentPage: null,
};

export default connect(pageSelector, {
  fetchOrders,
})(injectIntl(OrderHistoryPage));
