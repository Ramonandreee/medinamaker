(function (window, document) {
  'use strict';
  // Só no domínio oficial: prévias (pages.dev, localhost) não enviam eventos ao Pixel de produção.
  if (!/(^|\.)medinamaker\.com$/.test(window.location.hostname)) return;

  const pixelId = '2140407363486259';
  const pageViewSent = '__medinaMetaPixel2140407363486259PageView';
  if (window[pageViewSent]) return;

  if (!window.fbq) {
    const fbq = function () {
      if (fbq.callMethod) {
        fbq.callMethod.apply(fbq, arguments);
      } else {
        fbq.queue.push(arguments);
      }
    };
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];

    const library = document.createElement('script');
    library.async = true;
    library.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(library);
  }

  window[pageViewSent] = true;
  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
})(window, document);
