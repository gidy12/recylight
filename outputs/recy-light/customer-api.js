(() => {
  const $ = selector => document.querySelector(selector);
  const api = window.RecyLightAPI;
  const accountForm = $('#account-form');
  const accountFields = $('.account-fields');
  const paymentOptions = $('#checkout-form select[name="payment"]')?.options;
  if (paymentOptions?.[1]) paymentOptions[1].value = 'MTN_MOMO_MANUAL';
  if (paymentOptions?.[2]) paymentOptions[2].value = 'CASH_ON_DELIVERY';

  function appendField(id, labelText, attributes = {}) {
    const label = document.createElement('label');
    label.id = `${id}-field`;
    label.textContent = labelText;
    const input = document.createElement('input');
    input.id = id;
    Object.assign(input, attributes);
    label.append(input);
    accountFields.append(label);
    return { label, input };
  }

  const phoneField = appendField('account-phone', 'Phone number (optional)', {
    type: 'tel', autocomplete: 'tel', maxLength: 30, placeholder: '+250 7xx xxx xxx'
  });
  const confirmField = appendField('account-confirm-password', 'Confirm password', {
    type: 'password', autocomplete: 'new-password', placeholder: 'Enter your password again'
  });
  const resetTokenField = appendField('account-reset-token', 'Password reset token', {
    type: 'text', autocomplete: 'one-time-code', minLength: 32, maxLength: 128,
    placeholder: 'Paste the token from your reset email'
  });

  function syncAccountFields() {
    const title = $('#account-title').textContent;
    const registering = title === 'Create account';
    const resetting = title === 'Reset password';
    phoneField.label.hidden = !registering;
    phoneField.input.required = false;
    confirmField.label.hidden = !registering && !resetting;
    confirmField.input.required = registering || resetting;
    resetTokenField.label.hidden = !resetting;
    resetTokenField.input.required = resetting;
  }

  new MutationObserver(syncAccountFields).observe($('#account-title'), { childList: true });
  syncAccountFields();

  function accountMessage(message, isError = true) {
    const feedback = $('#account-feedback');
    feedback.textContent = message;
    feedback.classList.toggle('error', isError);
  }

  function unwrap(response) {
    return response?.data ?? response;
  }

  function customerFrom(response) {
    const data = unwrap(response);
    return data?.user || data?.customer || data?.profile || null;
  }

  async function currentCustomer(response) {
    const responseUser = customerFrom(response);
    if (responseUser) return responseUser;
    const profile = await api.customerMe();
    const user = customerFrom(profile);
    if (!user) throw new Error('The API did not return a customer profile. Check the session cookie configuration.');
    return user;
  }

  function signedIn(user) {
    window.dispatchEvent(new CustomEvent('recy:auth-change', { detail: user }));
    $('#account-dialog').close();
  }

  async function handleAccountSubmit(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    if (!api) {
      accountMessage('The RecyLight API is unavailable. Please try again later.');
      return;
    }

    const title = $('#account-title').textContent;
    const email = $('#account-email').value.trim();
    const password = $('#account-password').value;
    const submit = $('#account-submit');
    submit.disabled = true;
    accountMessage('');

    try {
      if (title === 'Create account') {
        const confirmPassword = $('#account-confirm-password').value;
        if (password !== confirmPassword) throw new Error('The passwords do not match.');
        const result = await api.customerSignup({
          name: $('#account-name').value.trim(),
          email,
          phone: $('#account-phone').value.trim() || undefined,
          password,
          confirmPassword,
        });
        signedIn(await currentCustomer(result));
      } else if (title === 'Log in') {
        const result = await api.customerLogin({ email, password });
        signedIn(await currentCustomer(result));
      } else if (title === 'Reset password') {
        const confirmPassword = $('#account-confirm-password').value;
        if (password !== confirmPassword) throw new Error('The passwords do not match.');
        await api.customerResetPassword({
          token: $('#account-reset-token').value.trim(),
          password,
          confirmPassword,
        });
        $('#account-password').value = '';
        $('#account-confirm-password').value = '';
        $('#account-reset-token').value = '';
        $('#login-tab').click();
        accountMessage('Password updated. Log in with your new password.', false);
      } else {
        throw new Error('This account action is not supported by the API.');
      }
    } catch (error) {
      const validationErrors = error.data?.errors?.map(item => item.message).filter(Boolean);
      accountMessage(validationErrors?.length ? validationErrors.join(' ') : error.message || 'Could not complete the request.');
    } finally {
      submit.disabled = false;
    }
  }

  accountForm.addEventListener('submit', handleAccountSubmit, true);

  $('#account-forgot-password').addEventListener('click', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const email = $('#account-email').value.trim();
    const note = $('#account-reset-note');
    if (!email) {
      note.textContent = 'Enter your email address above, then choose Forgot password.';
      note.hidden = false;
      $('#account-email').focus();
      return;
    }
    try {
      await api.customerForgotPassword({ email });
      note.textContent = 'If an account exists for that email, a password reset email will be sent.';
    } catch (error) {
      note.textContent = error.message || 'Could not request a password reset.';
    }
    note.hidden = false;
  }, true);

  window.logoutUser = async () => {
    try {
      await api.customerLogout();
      window.dispatchEvent(new CustomEvent('recy:auth-change', { detail: null }));
    } catch (error) {
      accountMessage(error.message || 'Could not log out.');
    }
  };

  window.saveAccountProfile = () => {
    $('#profile-feedback').textContent = 'Profile editing is not available in the current API.';
  };

  const resetToken = new URLSearchParams(location.search).get('token')
    || new URLSearchParams(location.hash.slice(1)).get('token');
  if (resetToken) {
    resetTokenField.input.value = resetToken;
    document.addEventListener('DOMContentLoaded', () => {
      window.dispatchEvent(new CustomEvent('recy:auth-recovery'));
    }, { once: true });
  }

  const orderList = document.createElement('section');
  orderList.className = 'account-orders';
  orderList.innerHTML = '<h3>Recent orders</h3><p class="account-orders-status" role="status"></p><div class="account-orders-list"></div>';
  $('#account-profile').append(orderList);

  window.addEventListener('recy:auth-change', async event => {
    if (!event.detail) {
      orderList.querySelector('.account-orders-list').replaceChildren();
      orderList.querySelector('.account-orders-status').textContent = '';
      return;
    }
    const status = orderList.querySelector('.account-orders-status');
    const list = orderList.querySelector('.account-orders-list');
    status.textContent = 'Loading orders…';
    try {
      const response = unwrap(await api.getMyOrders());
      const orders = Array.isArray(response) ? response : response?.orders || [];
      status.textContent = orders.length ? '' : 'No orders found.';
      list.replaceChildren(...orders.map(order => {
        const row = document.createElement('p');
        row.textContent = `${order.orderNumber || order.order_number || order.id} · ${order.status || 'Pending'} · RWF ${Number(order.total || order.totalAmount || 0).toLocaleString('en-US')}`;
        return row;
      }));
    } catch (error) {
      status.textContent = error.message || 'Could not load orders.';
    }
  });

  const checkoutForm = $('#checkout-form');
  checkoutForm.addEventListener('submit', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!checkoutForm.reportValidity()) return;
    if (!api) return;

    const feedback = $('#form-feedback');
    const submit = checkoutForm.querySelector('button[type="submit"]');
    const formData = new FormData(checkoutForm);
    const phone = String(formData.get('phone') || '').trim();
    const paymentMethod = formData.get('payment') || 'CASH_ON_DELIVERY';
    submit.disabled = true;
    feedback.textContent = '';

    try {
      if (!window.RECYLIGHT_API_CATALOG_LOADED) {
        throw new Error('Live catalog is unavailable. Please try again when the store API is back online.');
      }
      const items = cartLines().map(({ p, qty }) => ({ productId: p.id, quantity: qty }));
      if (!items.length) throw new Error('Your cart is empty.');
      const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const response = await api.createOrder({
        customerName: String(formData.get('name') || '').trim(),
        phone,
        email: String(formData.get('email') || '').trim() || undefined,
        deliveryLocation: String(formData.get('address') || '').trim(),
        notes: String(formData.get('instructions') || '').trim() || undefined,
        paymentMethod,
        items,
      }, idempotencyKey);
      const order = unwrap(response);
      const orderNumber = order?.orderNumber || order?.order_number || order?.order?.orderNumber || order?.order?.order_number;
      if (!orderNumber) throw new Error('Order was created but the API did not return an order number.');
      feedback.textContent = `Order ${orderNumber} created. The team will confirm availability and delivery.`;
      if (paymentMethod === 'MTN_MOMO_MANUAL') addPaymentReferenceForm(orderNumber, phone, feedback);
      cartLines().forEach(({ p }) => { delete cart[p.id]; });
      updateCart();
    } catch (error) {
      const validationErrors = error.data?.errors?.map(item => item.message).filter(Boolean);
      feedback.textContent = validationErrors?.length ? validationErrors.join(' ') : error.message || 'Could not submit the order.';
    } finally {
      submit.disabled = false;
    }
  }, true);

  function addPaymentReferenceForm(orderNumber, phone, feedback) {
    document.querySelector('#manual-payment-reference')?.remove();
    const section = document.createElement('section');
    section.id = 'manual-payment-reference';
    const instruction = document.createElement('p');
    instruction.textContent = 'Pay using the merchant USSD code *182*8*1*011115#, then submit your MTN transaction reference for review.';
    const label = document.createElement('label');
    label.textContent = 'MTN transaction reference';
    const input = document.createElement('input');
    input.required = true;
    input.minLength = 4;
    input.maxLength = 120;
    input.autocomplete = 'off';
    label.append(input);
    const button = document.createElement('button');
    button.className = 'button button-green';
    button.type = 'button';
    button.textContent = 'Submit payment reference';
    button.addEventListener('click', async () => {
      if (!input.reportValidity()) return;
      button.disabled = true;
      try {
        const result = unwrap(await api.createManualPayment({
          orderNumber,
          phone,
          transactionReference: input.value.trim(),
        }));
        feedback.textContent = `Payment reference received. Status: ${result.status || 'PENDING_REVIEW'}. An administrator will verify it.`;
        section.remove();
      } catch (error) {
        feedback.textContent = error.message || 'Could not submit the payment reference.';
      } finally {
        button.disabled = false;
      }
    });
    section.append(instruction, label, button);
    $('#checkout-form').append(section);
  }
})();
