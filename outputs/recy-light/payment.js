(() => {
  const $ = selector => document.querySelector(selector);
  const code = '*182*8*1*011115#';
  let order;

  function unwrap(response) {
    return response?.data ?? response;
  }

  function formatMoney(value) {
    return `RWF ${Number(value).toLocaleString('en-US')}`;
  }

  function paymentStatusLabel(value) {
    const status = String(value || '').toUpperCase();
    if (['PENDING', 'PENDING_REVIEW', 'AWAITING_PAYMENT', 'UNPAID'].includes(status)) return 'Awaiting payment confirmation';
    if (['SUCCESSFUL', 'VERIFIED', 'PAID', 'COMPLETED'].includes(status)) return 'Payment verified';
    if (['FAILED', 'REJECTED'].includes(status)) return 'Payment not verified';
    return value || 'Awaiting payment confirmation';
  }

  function persistOrder() {
    try {
      sessionStorage.setItem('recy-light-payment-order', JSON.stringify(order));
    } catch (error) {
      $('#status-feedback').textContent = `Could not save the latest order status in this browser: ${error.message}`;
    }
  }

  function renderOrder() {
    $('#merchant-code').textContent = code;
    $('#order-number').textContent = order.orderNumber;
    $('#customer-name').textContent = order.customerName || 'Unavailable';
    $('#payment-amount').textContent = formatMoney(order.totalAmount);
    $('#order-total').textContent = formatMoney(order.totalAmount);
    $('#payment-status').textContent = paymentStatusLabel(order.paymentStatus);
    const created = order.createdAt ? new Date(order.createdAt) : null;
    $('#order-date').textContent = created && !Number.isNaN(created.getTime())
      ? created.toLocaleString()
      : 'Date unavailable';
  }

  async function refreshPaymentStatus() {
    const button = $('#refresh-payment-status');
    const feedback = $('#status-feedback');
    button.disabled = true;
    feedback.textContent = 'Checking the latest order status…';
    try {
      const response = unwrap(await window.RecyLightAPI.getOrder(order.orderNumber, order.phone));
      const latest = response?.order || response;
      if (!latest || typeof latest !== 'object') throw new Error('The API returned an invalid order response.');
      const payment = latest.latestPayment || latest.payment || latest.payments?.[0] || {};
      const paymentStatus = latest.paymentStatus || payment.status;
      if (!paymentStatus) throw new Error('The API response did not include a payment status.');
      order.paymentStatus = paymentStatus;
      order.createdAt = latest.createdAt || latest.created_at || order.createdAt;
      order.totalAmount = Number(latest.totalAmount ?? latest.total ?? latest.subtotal ?? order.totalAmount);
      order.customerName = latest.customerName || latest.customer?.name || order.customerName;
      renderOrder();
      persistOrder();
      feedback.textContent = 'Order status refreshed from RecyLight.';
    } catch (error) {
      feedback.textContent = `Could not refresh payment status: ${error.message || 'The API request failed.'}`;
    } finally {
      button.disabled = false;
    }
  }

  $('#copy-merchant-code').addEventListener('click', async () => {
    const feedback = $('#copy-feedback');
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const field = document.createElement('textarea');
        field.value = code;
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.append(field);
        field.select();
        const copied = document.execCommand('copy');
        field.remove();
        if (!copied) throw new Error('Clipboard access is unavailable.');
      }
      feedback.textContent = 'Merchant code copied.';
    } catch (error) {
      feedback.textContent = `Could not copy the merchant code: ${error.message}`;
    }
  });

  $('#refresh-payment-status').addEventListener('click', refreshPaymentStatus);

  $('#payment-reference-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const submit = $('#submit-payment-reference');
    const feedback = $('#reference-feedback');
    submit.disabled = true;
    feedback.textContent = '';
    try {
      const result = unwrap(await window.RecyLightAPI.createManualPayment({
        orderNumber: order.orderNumber,
        phone: order.phone,
        transactionReference: $('#transaction-reference').value.trim(),
      }));
      order.paymentStatus = result.status || result.payment?.status || order.paymentStatus;
      renderOrder();
      persistOrder();
      $('#transaction-reference').disabled = true;
      submit.hidden = true;
      feedback.textContent = 'Payment reference submitted. Your order is awaiting administrator verification; no payment has been marked as paid by this page.';
    } catch (error) {
      feedback.textContent = error.message || 'Could not submit the payment reference. Please try again.';
    } finally {
      submit.disabled = false;
    }
  });

  try {
    order = JSON.parse(sessionStorage.getItem('recy-light-payment-order') || 'null');
  } catch (error) {
    $('#status-feedback').textContent = `Order details could not be read from this browser: ${error.message}`;
  }
  const requestedOrder = new URLSearchParams(location.search).get('order');
  if (!order || !requestedOrder || String(order.orderNumber) !== requestedOrder) {
    $('#order-number').textContent = requestedOrder || 'Unavailable';
    $('#customer-name').textContent = 'Unavailable';
    $('#payment-amount').textContent = 'Unavailable';
    $('#order-total').textContent = 'Unavailable';
    $('#order-date').textContent = 'Unavailable';
    $('#payment-reference-form').hidden = true;
    $('#status-feedback').textContent = 'These order details are unavailable in this browser. Use the storefront order lookup to check an order.';
    $('#refresh-payment-status').disabled = true;
    return;
  }
  renderOrder();
  refreshPaymentStatus();
})();
