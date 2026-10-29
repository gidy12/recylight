(() => {
  const $ = selector => document.querySelector(selector);
  const panel = $('#customer-chat');
  const launcher = $('#chat-launch');
  const log = $('#chat-log');
  const options = $('#chat-options');
  const form = $('#chat-form');
  const input = $('#chat-input');
  let transcript = [];
  let contactStep = '';
  let contact = {};

  const chatCopy = {
    rw: {
      'RecyLight assistant':'Umufasha wa RecyLight','Here to help you find what you need':'Turi hano kugufasha kubona icyo ukeneye','Type your message':'Andika ubutumwa','Tell us what you need…':'Tubwire icyo ukeneye…','Preview chat: requests are saved in this browser for the admin report.':'Ikiganiro cyo kugerageza: ibyifuzo bibikwa muri iyi browser kugira ngo bigaragare muri raporo y’ubuyobozi.','Chat with us':'Tuganire','Hi! What can we help you find today?':'Muraho! Twagufasha gushaka iki uyu munsi?','Find a product':'Shaka igicuruzwa','Ask about stock or delivery':'Baza ku bubiko cyangwa ku kugeza ibicuruzwa','Something else':'Ikindi','What are you looking for? Try a product name or a category such as lighting, electrical, accessories, or tools.':'Urashaka iki? Gerageza izina ry’igicuruzwa cyangwa icyiciro nka amatara, ibikoresho by’amashanyarazi, accessories cyangwa tools.','These may be a good fit:':'Ibi bishobora kukugirira akamaro:','View product':'Reba igicuruzwa','in stock':'kirahari','Out of stock':'ntikiri mu bubiko','Find something else':'Shaka ikindi','Ask the team':'Baza ikipe','I could not find an exact match. Tell us a little more and our team can help.':'Ntabwo nabonye igicuruzwa gihuye neza. Sobanura birambuye ikipe yacu igufashe.','Leave a request':'Ohereza icyifuzo','Try another search':'Gerageza gushaka ikindi','I can pass your request to the RecyLight team. What is your name?':'Nshobora kugeza icyifuzo cyawe ku ikipe ya RecyLight. Witwa nde?','Your name':'Amazina yawe','Thanks. What email address can the team use to reply?':'Murakoze. Andika imeyili ikipe yakoresha igusubiza.','Email address':'Aderesi ya imeyili','Please enter a valid email address.':'Andika aderesi ya imeyili yemewe.','What would you like help with? Include the product or details you need.':'Wifuza gufashwa iki? Vuga igicuruzwa cyangwa ibisobanuro ukeneye.','Your request has been saved in this browser preview. It has not been sent to the team yet.':'Icyifuzo cyawe cyabitswe muri browser yo kugerageza. Ntikirakohererezwa ikipe.','Sorry, this browser could not save your request. Please try again later.':'Ihangane, browser ntiyashoboye kubika icyifuzo cyawe. Ongera ugerageze nyuma.','Start again':'Tangira bundi bushya','Let’s start again.':'Reka dutangire bundi bushya.','For example: LED bulb':'Urugero: itara rya LED','Type your question…':'Andika ikibazo cyawe…'
    },
    sw: {
      'RecyLight assistant':'Msaidizi wa RecyLight','Here to help you find what you need':'Tuko hapa kukusaidia kupata unachohitaji','Type your message':'Andika ujumbe wako','Tell us what you need…':'Tuambie unachohitaji…','Preview chat: requests are saved in this browser for the admin report.':'Mazungumzo ya onyesho: maombi yanahifadhiwa kwenye kivinjari hiki kwa ripoti ya msimamizi.','Chat with us':'Zungumza nasi','Hi! What can we help you find today?':'Habari! Tunaweza kukusaidia kupata nini leo?','Find a product':'Tafuta bidhaa','Ask about stock or delivery':'Uliza kuhusu bidhaa zilizopo au usafirishaji','Something else':'Jambo lingine','What are you looking for? Try a product name or a category such as lighting, electrical, accessories, or tools.':'Unatafuta nini? Jaribu jina la bidhaa au aina kama taa, vifaa vya umeme, vifaa saidizi au zana.','These may be a good fit:':'Hizi zinaweza kukufaa:','View product':'Tazama bidhaa','in stock':'ipo dukani','Out of stock':'haipo dukani','Find something else':'Tafuta kitu kingine','Ask the team':'Uliza timu','I could not find an exact match. Tell us a little more and our team can help.':'Sikupata bidhaa inayolingana kabisa. Eleza zaidi ili timu yetu ikusaidie.','Leave a request':'Tuma ombi','Try another search':'Jaribu kutafuta tena','I can pass your request to the RecyLight team. What is your name?':'Ninaweza kupeleka ombi lako kwa timu ya RecyLight. Unaitwa nani?','Your name':'Jina lako','Thanks. What email address can the team use to reply?':'Asante. Timu itumie anwani gani ya barua pepe kukujibu?','Email address':'Anwani ya barua pepe','Please enter a valid email address.':'Tafadhali weka anwani sahihi ya barua pepe.','What would you like help with? Include the product or details you need.':'Unahitaji msaada gani? Taja bidhaa au maelezo unayohitaji.','Your request has been saved in this browser preview. It has not been sent to the team yet.':'Ombi lako limehifadhiwa kwenye kivinjari hiki cha onyesho. Bado halijatumwa kwa timu.','Sorry, this browser could not save your request. Please try again later.':'Samahani, kivinjari hiki hakikuweza kuhifadhi ombi lako. Jaribu tena baadaye.','Start again':'Anza tena','Let’s start again.':'Tuanze tena.','For example: LED bulb':'Kwa mfano: balbu ya LED','Type your question…':'Andika swali lako…'
    }
  };
  const faqCopy = {
    rw: {
      'Hello! How can I help you today?':'Muraho! Nagufasha iki uyu munsi?','You’re welcome!':'Ntakibazo!','I can help with products, prices, stock, delivery, payment, and order enquiries. What would you like to know?':'Ndagufasha ku bicuruzwa, ibiciro, ibiri mu bubiko, kugeza ibicuruzwa, kwishyura n’ibyifuzo by’amabwiriza. Wifuza kumenya iki?','The listed price for':'Igiciro cyanditse cya','is':'ni','Availability for':'Kubona','shows':'byerekana','in stock. Please confirm availability with the team before ordering.':'birahari mu bubiko. Banza wemeze n’ikipe ko bihari mbere yo gutumiza.','is currently marked out of stock. Ask the team if you would like an update.':'ubu byanditse ko bitari mu bubiko. Baza ikipe niba hari amakuru mashya.','Prices and stock shown are for preview and should be confirmed by the team.':'Ibiciro n’ibiri mu bubiko byerekanwa mu igerageza; ikipe igomba kubyemeza.','Delivery details are not configured yet. The team can confirm delivery options and timing for your location.':'Amakuru yo kugeza ibicuruzwa ntarashyirwaho. Ikipe izemeza uburyo n’igihe cyo kugeza aho uri.','Payment options are not set up for online payment yet. The team will confirm how to pay when they reply to your enquiry.':'Uburyo bwo kwishyura kuri murandasi ntiburashyirwaho. Ikipe izakubwira uko wishyura isubije icyifuzo cyawe.','This site is a catalog preview and cannot confirm or track a real order yet. Send an enquiry and the team can help with the next steps.':'Uru rubuga ni igerageza rya katalogi, ntirushobora kwemeza cyangwa gukurikirana itumiza nyaryo. Ohereza icyifuzo ikipe igufashe gukomeza.','There is no returns or warranty policy published here yet. Ask the team to confirm the policy for a product.':'Nta mabwiriza yo gusubiza ibicuruzwa cyangwa garanti yashyizweho. Baza ikipe ibyerekeye igicuruzwa.','RecyLight Ltd offers practical electrical and lighting products. The store is being prepared to help customers find useful items for homes and projects.':'RecyLight Ltd itanga ibikoresho by’amashanyarazi n’amatara bifite akamaro. Turimo gutegura iduka rizafasha abakiriya kubona ibyo bakenera mu ngo no mu mishinga.','Support contact details have not been added yet.':'Amakuru yo kuvugana n’ikipe ntarashyirwaho.','Store hours and physical address have not been confirmed here yet.':'Amasaha y’akazi na aderesi y’iduka ntibirashyirwaho.','For electrical installation or repair, please use a qualified electrician. I can help you find products, but I cannot verify that a setup is safe.':'Ku bijyanye no gushyiraho cyangwa gusana amashanyarazi, koresha umuhanga wabihuguriwe. Nshobora kugufasha kubona ibikoresho ariko sinshobora kwemeza ko imikoreshereze itekanye.','I don’t have a confirmed answer for that yet. I can help with the catalog, prices, stock, delivery, payment, or send your question to the team.':'Nta gisubizo cyemejwe mfite kuri icyo. Nshobora kugufasha kuri katalogi, ibiciro, ibiri mu bubiko, kugeza ibicuruzwa, kwishyura cyangwa kohereza ikibazo cyawe ku ikipe.','Ask the team':'Baza ikipe','Browse products':'Reba ibicuruzwa','Contact':'Twandikire','I don’t have a confirmed answer for that yet. Could you rephrase your question, or I can pass it to the team.':'Nta gisubizo cyemejwe mfite. Wagerageza kongera gusobanura ikibazo cyangwa nkakigeza ku ikipe?'
    },
    sw: {
      'Hello! How can I help you today?':'Habari! Nikusaidie nini leo?','You’re welcome!':'Karibu!','I can help with products, prices, stock, delivery, payment, and order enquiries. What would you like to know?':'Naweza kusaidia kuhusu bidhaa, bei, zilizopo, usafirishaji, malipo na maombi ya oda. Ungependa kujua nini?','The listed price for':'Bei iliyoonyeshwa ya','is':'ni','Availability for':'Upatikanaji wa','shows':'unaonyesha','in stock. Please confirm availability with the team before ordering.':'ipo dukani. Tafadhali thibitisha na timu kabla ya kuagiza.','is currently marked out of stock. Ask the team if you would like an update.':'imeonyeshwa kuwa haipo dukani kwa sasa. Uliza timu kupata taarifa mpya.','Prices and stock shown are for preview and should be confirmed by the team.':'Bei na bidhaa zilizopo ni za onyesho na zinapaswa kuthibitishwa na timu.','Delivery details are not configured yet. The team can confirm delivery options and timing for your location.':'Maelezo ya usafirishaji bado hayajawekwa. Timu inaweza kuthibitisha njia na muda wa usafirishaji eneo lako.','Payment options are not set up for online payment yet. The team will confirm how to pay when they reply to your enquiry.':'Malipo ya mtandaoni bado hayajawekwa. Timu itathibitisha njia ya kulipa itakapojibu ombi lako.','This site is a catalog preview and cannot confirm or track a real order yet. Send an enquiry and the team can help with the next steps.':'Tovuti hii ni onyesho la katalogi na haiwezi kuthibitisha au kufuatilia oda halisi bado. Tuma ombi ili timu ikusaidie hatua zinazofuata.','There is no returns or warranty policy published here yet. Ask the team to confirm the policy for a product.':'Sera ya kurejesha bidhaa au dhamana bado haijawekwa hapa. Uliza timu ithibitishe sera ya bidhaa.','RecyLight Ltd offers practical electrical and lighting products. The store is being prepared to help customers find useful items for homes and projects.':'RecyLight Ltd inatoa bidhaa za umeme na taa zinazofaa. Duka linatayarishwa kuwasaidia wateja kupata vitu muhimu vya nyumbani na miradi.','Support contact details have not been added yet.':'Maelezo ya mawasiliano ya usaidizi bado hayajaongezwa.','Store hours and physical address have not been confirmed here yet.':'Saa za kazi na anwani ya duka bado hazijathibitishwa hapa.','For electrical installation or repair, please use a qualified electrician. I can help you find products, but I cannot verify that a setup is safe.':'Kwa usakinishaji au ukarabati wa umeme, tumia fundi umeme aliyehitimu. Naweza kukusaidia kupata bidhaa, lakini siwezi kuthibitisha usalama wa usakinishaji.','I don’t have a confirmed answer for that yet. I can help with the catalog, prices, stock, delivery, payment, or send your question to the team.':'Bado sina jibu lililothibitishwa kwa hilo. Naweza kusaidia kuhusu katalogi, bei, bidhaa zilizopo, usafirishaji, malipo au kutuma swali lako kwa timu.','Ask the team':'Uliza timu','Browse products':'Angalia bidhaa','Contact':'Wasiliana','I don’t have a confirmed answer for that yet. Could you rephrase your question, or I can pass it to the team.':'Bado sina jibu lililothibitishwa. Unaweza kuuliza kwa njia nyingine au nilipeleke kwa timu?'
    }
  };
  const t = text => {
    let language = 'en';
    try { language = localStorage.getItem('recylight-language') || 'en'; } catch {}
    return chatCopy[language]?.[text] || faqCopy[language]?.[text] || (window.translateStoreText ? window.translateStoreText(text) : text);
  };
  const safe = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[character]);
  const catalog = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('recylight-products') || 'null');
      return Array.isArray(saved) ? saved : (window.RECYLIGHT_DEFAULT_PRODUCTS || []);
    } catch { return window.RECYLIGHT_DEFAULT_PRODUCTS || []; }
  };

  document.querySelectorAll('[data-chat-t]').forEach(node => { node.textContent = t(node.dataset.chatT); });
  input.placeholder = t(input.dataset.chatPlaceholder);
  document.querySelectorAll('#language-menu [data-language]').forEach(option => option.addEventListener('click', () => {
    document.querySelectorAll('[data-chat-t]').forEach(node => { node.textContent = t(node.dataset.chatT); });
    input.placeholder = t(contactStep === 'name' ? 'Your name' : contactStep === 'email' ? 'Email address' : input.dataset.chatPlaceholder);
  }));

  function addMessage(text, who = 'bot', html = '') {
    const bubble = document.createElement('div');
    bubble.className = `chat-message ${who}`;
    if (html) bubble.innerHTML = html;
    else bubble.textContent = text;
    log.append(bubble);
    log.scrollTop = log.scrollHeight;
    if (text) transcript.push(`${who === 'user' ? 'Customer' : 'RecyLight'}: ${text}`);
    return bubble;
  }

  function setOptions(items) {
    options.innerHTML = items.map(item => `<button type="button" data-chat-action="${safe(item.action)}">${safe(t(item.label))}</button>`).join('');
  }

  function greet() {
    if (log.childElementCount) return;
    addMessage(t('Hi! What can we help you find today?'));
    setOptions([
      { label: 'Find a product', action: 'find' },
      { label: 'Ask about stock or delivery', action: 'support' },
      { label: 'Something else', action: 'other' }
    ]);
  }

  function findProducts(query) {
    const words = query.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/).filter(word => word.length > 2);
    const all = catalog();
    const matches = all.map(product => {
      const text = `${product.name} ${product.category} ${product.description || ''} ${product.brand || ''}`.toLowerCase();
      return { product, score: words.reduce((score, word) => score + (text.includes(word) || (word.endsWith('s') && text.includes(word.slice(0, -1))) ? 1 : 0), 0) };
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map(item => item.product);
    if (!matches.length) {
      addMessage(t('I don’t have a confirmed answer for that yet. Could you rephrase your question, or I can pass it to the team.'), 'bot');
      setOptions([{ label: 'Ask the team', action: 'contact' }, { label: 'Try another search', action: 'find' }]);
      return;
    }
    const cards = matches.map(product => `<article class="chat-product"><img src="${safe(product.image)}" alt="" onerror="this.style.visibility='hidden'"><div><strong>${safe(product.name)}</strong><small>${safe(product.category)} · RWF ${Number(product.price || 0).toLocaleString('en-US')} · ${product.stock ? safe(product.stock) + ' ' + safe(t('in stock')) : safe(t('Out of stock'))}</small><button type="button" data-chat-product="${safe(product.id)}">${safe(t('View product'))} →</button></div></article>`).join('');
    addMessage('', 'bot', `<p>${safe(t('These may be a good fit:'))}</p><div class="chat-products">${cards}</div>`);
    setOptions([{ label: 'Find something else', action: 'find' }, { label: 'Ask the team', action: 'contact' }]);
  }

  function answerKnownQuestion(question) {
    const q = question.toLowerCase();
    const settings = (() => { try { return JSON.parse(localStorage.getItem('recylight-store-settings') || '{}'); } catch { return {}; } })();
    const mentionsPrice = /\b(price|prices|cost|costs|how much|bei|igiciro|ibiciro)\b/.test(q);
    const mentionsStock = /\b(stock|available|availability|in stock|have|left|ipo|zipo|duka|bubiko)\b/.test(q);
    if (mentionsPrice || mentionsStock) {
      const products = catalog();
      const words = q.replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/).filter(word => word.length > 2 && !['price','prices','cost','costs','much','stock','available','availability','have','left','what','the','how','for','does','your','product','please'].includes(word));
      const match = products.map(product => {
        const haystack = `${product.name} ${product.category} ${product.description || ''} ${product.brand || ''}`.toLowerCase();
        return { product, score: words.reduce((score, word) => score + (haystack.includes(word) || (word.endsWith('s') && haystack.includes(word.slice(0, -1))) ? 1 : 0), 0) };
      }).filter(item => item.score > 0).sort((a,b) => b.score - a.score)[0]?.product;
      if (match) {
        if (mentionsPrice && mentionsStock) addMessage(`${t('The listed price for')} ${match.name} ${t('is')} RWF ${Number(match.price || 0).toLocaleString('en-US')}. ${match.stock ? t('Availability for') + ' ' + match.name + ' ' + t('shows') + ' ' + match.stock + ' ' + t('in stock. Please confirm availability with the team before ordering.') : match.name + ' ' + t('is currently marked out of stock. Ask the team if you would like an update.')}`);
        else if (mentionsPrice) addMessage(`${t('The listed price for')} ${match.name} ${t('is')} RWF ${Number(match.price || 0).toLocaleString('en-US')}. ${t('Prices and stock shown are for preview and should be confirmed by the team.')}`);
        else addMessage(`${t('Availability for')} ${match.name} ${t('shows')} ${match.stock ? `${match.stock} ${t('in stock. Please confirm availability with the team before ordering.')}` : t('is currently marked out of stock. Ask the team if you would like an update.')}`);
        setOptions([{ label: 'Browse products', action: 'find' }, { label: 'Ask the team', action: 'contact' }]);
        return true;
      }
    }
    if (/\b(hi|hello|hey|habari|muraho|amakuru)\b/.test(q)) { addMessage(t('Hello! How can I help you today?')); greetOptions(); return true; }
    if (/\b(thanks|thank you|asante|murakoze)\b/.test(q)) { addMessage(t('You’re welcome!')); greetOptions(); return true; }
    if (/\b(deliver|delivery|shipping|ship|deliveries|kufikisha|usafirishaji)\b/.test(q)) { addMessage(t('Delivery details are not configured yet. The team can confirm delivery options and timing for your location.')); setOptions([{ label: 'Ask the team', action: 'contact' }]); return true; }
    if (/\b(pay|payment|payments|mobile money|cash|kwishyura|malipo)\b/.test(q)) { addMessage(t('Payment options are not set up for online payment yet. The team will confirm how to pay when they reply to your enquiry.')); setOptions([{ label: 'Ask the team', action: 'contact' }]); return true; }
    if (/\b(order|orders|ordered|track|tracking|checkout|itumiza|oda)\b/.test(q)) { addMessage(t('This site is a catalog preview and cannot confirm or track a real order yet. Send an enquiry and the team can help with the next steps.')); setOptions([{ label: 'Ask the team', action: 'contact' }, { label: 'Browse products', action: 'find' }]); return true; }
    if (/\b(return|returns|refund|refunds|warranty|guarantee|garanti)\b/.test(q)) { addMessage(t('There is no returns or warranty policy published here yet. Ask the team to confirm the policy for a product.')); setOptions([{ label: 'Ask the team', action: 'contact' }]); return true; }
    if (/\b(about|company|who are you|recy.?light|what do you sell|products do you sell)\b/.test(q)) { addMessage(t('RecyLight Ltd offers practical electrical and lighting products. The store is being prepared to help customers find useful items for homes and projects.')); setOptions([{ label: 'Browse products', action: 'find' }, { label: 'Ask the team', action: 'contact' }]); return true; }
    if (/\b(contact|email|phone|call|reach you|talk to someone|support)\b/.test(q)) {
      const details = [settings.email && `Email: ${settings.email}`, settings.phone && `Phone: ${settings.phone}`].filter(Boolean).join(' · ');
      addMessage(details || t('Support contact details have not been added yet.'));
      setOptions([{ label: 'Leave a request', action: 'contact' }]); return true;
    }
    if (/\b(open|opening|hours|location|address|where are you|visit|amasaha|aderesi)\b/.test(q)) { addMessage(t('Store hours and physical address have not been confirmed here yet.')); setOptions([{ label: 'Ask the team', action: 'contact' }]); return true; }
    if (/\b(wire|wiring|install|installation|repair|electrician|shock|spark|short circuit|breaker)\b/.test(q)) { addMessage(t('For electrical installation or repair, please use a qualified electrician. I can help you find products, but I cannot verify that a setup is safe.')); setOptions([{ label: 'Browse products', action: 'find' }, { label: 'Ask the team', action: 'contact' }]); return true; }
    if (/\b(help|what can you do|can you help|assist)\b/.test(q)) { addMessage(t('I can help with products, prices, stock, delivery, payment, and order enquiries. What would you like to know?')); greetOptions(); return true; }
    return false;
  }

  function startContact() {
    contactStep = 'name'; contact = {};
    addMessage(t('I can pass your request to the RecyLight team. What is your name?'));
    options.innerHTML = '';
    input.placeholder = t('Your name'); input.focus();
  }

  function handleText(value) {
    const text = value.trim();
    if (!text) return;
    addMessage(text, 'user');
    if (contactStep === 'name') {
      contact.name = text; contactStep = 'email';
      addMessage(t('Thanks. What email address can the team use to reply?'));
      input.type = 'email'; input.placeholder = t('Email address'); input.focus(); return;
    }
    if (contactStep === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) { addMessage(t('Please enter a valid email address.')); return; }
      contact.email = text; contactStep = 'message';
      addMessage(t('What would you like help with? Include the product or details you need.'));
      input.type = 'text'; input.placeholder = t('Tell us what you need…'); input.focus(); return;
    }
    if (contactStep === 'message') {
      contact.message = text;
      const request = { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`, type: 'Customer chat', name: contact.name, email: contact.email, phone: '', message: `${text}\n\nChat transcript:\n${transcript.join('\n')}`, createdAt: new Date().toISOString() };
      try {
        const requests = JSON.parse(localStorage.getItem('recylight-business-inquiries') || '[]');
        requests.push(request);
        localStorage.setItem('recylight-business-inquiries', JSON.stringify(requests));
        addMessage(t('Your request has been saved in this browser preview. It has not been sent to the team yet.'));
      } catch { addMessage(t('Sorry, this browser could not save your request. Please try again later.')); }
      contactStep = ''; input.type = 'text'; input.placeholder = t('Tell us what you need…');
      setOptions([{ label: 'Start again', action: 'restart' }]); return;
    }
    if (!answerKnownQuestion(text)) findProducts(text);
  }

  launcher.addEventListener('click', () => {
    const open = panel.hidden;
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    if (open) { greet(); input.focus(); }
  });
  $('#chat-close').addEventListener('click', () => { panel.hidden = true; launcher.setAttribute('aria-expanded', 'false'); launcher.focus(); });
  form.addEventListener('submit', event => { event.preventDefault(); const value = input.value; input.value = ''; handleText(value); });
  options.addEventListener('click', event => {
    const button = event.target.closest('[data-chat-action]');
    if (!button) return;
    const action = button.dataset.chatAction;
    options.innerHTML = '';
    if (action === 'find') { addMessage(t('Find a product'), 'user'); addMessage(t('What are you looking for? Try a product name or a category such as lighting, electrical, accessories, or tools.')); input.placeholder = t('For example: LED bulb'); input.focus(); }
    else if (action === 'support') { addMessage(t('Ask about stock or delivery'), 'user'); addMessage(t('Tell me which product or delivery detail you are checking.')); input.placeholder = t('Type your question…'); input.focus(); }
    else if (action === 'other') { addMessage(t('Something else'), 'user'); startContact(); }
    else if (action === 'contact') startContact();
    else if (action === 'restart') { contactStep = ''; addMessage(t('Let’s start again.')); greetOptions(); }
  });
  function greetOptions() { setOptions([{ label: 'Find a product', action: 'find' }, { label: 'Ask about stock or delivery', action: 'support' }, { label: 'Something else', action: 'other' }]); }
  log.addEventListener('click', event => {
    const button = event.target.closest('[data-chat-product]');
    if (!button) return;
    const product = catalog().find(item => String(item.id) === button.dataset.chatProduct);
    if (!product) return;
    $('#search').value = product.name;
    $('#search').dispatchEvent(new Event('input', { bubbles: true }));
    $('#shop').scrollIntoView({ behavior: 'smooth' });
    panel.hidden = true; launcher.setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) { panel.hidden = true; launcher.setAttribute('aria-expanded', 'false'); } });
})();
