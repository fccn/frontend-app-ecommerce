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
import { DataTable, Hyperlink, Pagination } from '@openedx/paragon';
import MediaQuery from 'react-responsive';

import { PageLoading } from '../components';

import messages from './OrderHistoryPage.messages';

// Actions
import { fetchOrders } from './actions';
import { pageSelector } from './selectors';
import { fetchBasketPaymentStatus } from './service';

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
      // Per-order lazily-resolved status overrides keyed by order_number. As
      // soon as `BasketPaymentStatusView` returns a fresher status for a row
      // we keep it here so the table re-renders without waiting for the next
      // page reload.
      statusOverrides: {},
      courseUrlOverrides: {},
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

  /**
   * Triggers a lazy `BasketPaymentStatusView` call for every order in the
   * current page whose status is not yet `paid`. This is the single place
   * where the upstream payment processor is consulted, in line with the
   * "no background job" requirement: the consultation happens when (and
   * only when) the user is looking at the Order History page.
   */
  async resolvePendingOrders() {
    const pending = (this.props.orders || []).filter(
      o => this.getStatus(o) !== 'paid',
    );
    await Promise.all(pending.map(async (order) => {
      const data = await fetchBasketPaymentStatus(order.orderId);
      if (!data) { return; }
      this.setState(prev => ({
        statusOverrides: {
          ...prev.statusOverrides,
          [order.orderId]: data.status,
        },
        courseUrlOverrides: {
          ...prev.courseUrlOverrides,
          [order.orderId]: data.course_url || prev.courseUrlOverrides[order.orderId] || '',
        },
      }));
    }));
  }

  getStatus(order) {
    return this.state.statusOverrides[order.orderId] || order.status || 'paid';
  }

  getCourseUrl(order) {
    return this.state.courseUrlOverrides[order.orderId] || order.courseUrl || '';
  }

  handlePageSelect(page) {
    // TODO: We should update the url and trigger this fetching based on the route
    this.props.fetchOrders(page);
  }

  renderStatusBadge(status) {
    const labelKey = ({
      paid: 'ecommerce.order.history.status.paid',
      pending: 'ecommerce.order.history.status.pending',
      failed: 'ecommerce.order.history.status.failed',
    })[status] || 'ecommerce.order.history.status.pending';
    return (
      <span
        className={`badge badge-status badge-status-${status}`}
        data-testid={`order-status-${status}`}
      >
        {this.props.intl.formatMessage(messages[labelKey])}
      </span>
    );
  }

  renderActions(order) {
    const status = this.getStatus(order);
    if (status !== 'paid') { return null; }
    const courseUrl = this.getCourseUrl(order);
    return (
      <span className="d-flex flex-wrap" style={{ gap: '0.5rem' }}>
        <Hyperlink destination={order.receiptUrl} data-testid="order-details-link">
          {this.props.intl.formatMessage(messages['ecommerce.order.history.view.order.detail'])}
        </Hyperlink>
        {courseUrl ? (
          <Hyperlink destination={courseUrl} data-testid="go-to-resource-link">
            {this.props.intl.formatMessage(messages['ecommerce.order.history.go.to.resource'])}
          </Hyperlink>
        ) : null}
      </span>
    );
  }

  getTableData() {
    return this.props.orders.map((order) => {
      const {
        lineItems,
        datePlaced,
        total,
        currency,
        orderId,
      } = order;
      const status = this.getStatus(order);
      return {
        description: this.renderLineItems(lineItems),
        datePlaced: <FormattedDate value={new Date(datePlaced)} />,
        // eslint-disable-next-line react/style-prop-object
        total: <FormattedNumber value={total} style="currency" currency={currency} />,
        status: this.renderStatusBadge(status),
        actions: this.renderActions(order),
        orderId,
      };
    }, this);
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
            Header: this.props.intl.formatMessage(messages['ecommerce.order.history.table.column.actions']),
            accessor: 'actions',
          },
        ]}
      >
        <DataTable.Table />
      </DataTable>
    );
  }

  renderMobileOrdersTable() {
    return this.getTableData().map(({
      description, datePlaced, total, orderId, status, actions,
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
        </dl>
        {actions ? <p>{actions}</p> : null}
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
    courseUrl: PropTypes.string,
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
