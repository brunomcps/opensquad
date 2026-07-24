/**
 * MAPA-7P Hotmart Pages tracking bridge.
 * Version: 1.0.0
 *
 * Install this source inside a script element in the Body scripts field of the
 * MAPA-7P Hotmart Page.
 * It copies an explicitly validated campaign code and selected UTM parameters
 * from the landing-page URL to the MAPA-7P checkout links.
 */
(function installMapa7pHotmartTrackingBridge(global) {
  'use strict';

  var VERSION = '1.0.0';
  var GLOBAL_KEY = '__MAPA7P_HOTMART_TRACKING_BRIDGE_V1__';
  var CHECKOUT_HOST = 'pay.hotmart.com';
  var CHECKOUT_PATH = '/K103806991N';
  var UTM_PARAMETERS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
  ];
  var MAX_TRACKING_CODE_LENGTH = 30;
  var MAX_UTM_VALUE_LENGTH = 200;

  if (global[GLOBAL_KEY] && global[GLOBAL_KEY].version === VERSION) {
    return;
  }

  function isValidTrackingCode(value) {
    return typeof value === 'string'
      && value.length > 0
      && value.length <= MAX_TRACKING_CODE_LENGTH
      && value === value.trim()
      && /^[A-Za-z0-9|-]+$/.test(value);
  }

  function safeUtmValue(value) {
    if (typeof value !== 'string'
      || value.length === 0
      || value.length > MAX_UTM_VALUE_LENGTH
      || value !== value.trim()
      || /[\u0000-\u001F\u007F]/.test(value)) {
      return null;
    }
    return value;
  }

  function readPageTracking(pageHref) {
    try {
      var pageUrl = new URL(pageHref);
      var candidates = [
        pageUrl.searchParams.get('sck'),
        pageUrl.searchParams.get('utm_term'),
      ];
      var trackingCode = null;

      for (var index = 0; index < candidates.length; index += 1) {
        if (isValidTrackingCode(candidates[index])) {
          trackingCode = candidates[index];
          break;
        }
      }

      if (!trackingCode) {
        return null;
      }

      var utms = {};
      for (var utmIndex = 0; utmIndex < UTM_PARAMETERS.length; utmIndex += 1) {
        var parameter = UTM_PARAMETERS[utmIndex];
        var value = safeUtmValue(pageUrl.searchParams.get(parameter));
        if (value !== null) {
          utms[parameter] = value;
        }
      }

      return { trackingCode: trackingCode, utms: utms };
    } catch (_error) {
      return null;
    }
  }

  function isMapa7pCheckout(url) {
    return url.protocol === 'https:'
      && url.hostname.toLowerCase() === CHECKOUT_HOST
      && url.pathname.replace(/\/+$/, '') === CHECKOUT_PATH;
  }

  function buildTrackedCheckoutHref(checkoutHref, pageHref, tracking) {
    var context = tracking || readPageTracking(pageHref);
    if (!context) {
      return checkoutHref;
    }

    try {
      var checkoutUrl = new URL(checkoutHref, pageHref);
      if (!isMapa7pCheckout(checkoutUrl)) {
        return checkoutHref;
      }

      checkoutUrl.searchParams.set('sck', context.trackingCode);
      for (var index = 0; index < UTM_PARAMETERS.length; index += 1) {
        var parameter = UTM_PARAMETERS[index];
        if (Object.prototype.hasOwnProperty.call(context.utms, parameter)) {
          checkoutUrl.searchParams.set(parameter, context.utms[parameter]);
        }
      }
      return checkoutUrl.toString();
    } catch (_error) {
      return checkoutHref;
    }
  }

  function rewriteAnchor(anchor, pageHref, tracking) {
    try {
      if (!anchor || typeof anchor.getAttribute !== 'function' || typeof anchor.setAttribute !== 'function') {
        return false;
      }
      var currentHref = anchor.getAttribute('href');
      if (!currentHref) {
        return false;
      }
      var nextHref = buildTrackedCheckoutHref(currentHref, pageHref, tracking);
      if (nextHref === currentHref) {
        return false;
      }
      anchor.setAttribute('href', nextHref);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function scanTree(root, pageHref, tracking) {
    if (!root) {
      return 0;
    }

    var rewritten = 0;
    try {
      if (typeof root.matches === 'function' && root.matches('a[href]')) {
        rewritten += rewriteAnchor(root, pageHref, tracking) ? 1 : 0;
      }
      if (typeof root.querySelectorAll === 'function') {
        var anchors = root.querySelectorAll('a[href]');
        for (var index = 0; index < anchors.length; index += 1) {
          rewritten += rewriteAnchor(anchors[index], pageHref, tracking) ? 1 : 0;
        }
      }
    } catch (_error) {
      return rewritten;
    }
    return rewritten;
  }

  function start() {
    try {
      if (!global.document || !global.location || !global.location.href) {
        return { active: false, observer: null };
      }

      var pageHref = global.location.href;
      var tracking = readPageTracking(pageHref);
      if (!tracking) {
        return { active: false, observer: null };
      }

      scanTree(global.document, pageHref, tracking);

      var observer = null;
      try {
        if (typeof global.MutationObserver === 'function') {
          observer = new global.MutationObserver(function onMutations(records) {
            for (var recordIndex = 0; recordIndex < records.length; recordIndex += 1) {
              var record = records[recordIndex];
              if (record.type === 'attributes') {
                scanTree(record.target, pageHref, tracking);
              }
              if (record.addedNodes) {
                for (var nodeIndex = 0; nodeIndex < record.addedNodes.length; nodeIndex += 1) {
                  scanTree(record.addedNodes[nodeIndex], pageHref, tracking);
                }
              }
            }
          });
          observer.observe(global.document.documentElement || global.document, {
            attributes: true,
            attributeFilter: ['href'],
            childList: true,
            subtree: true,
          });
        }
      } catch (_error) {
        observer = null;
      }

      return { active: true, observer: observer };
    } catch (_error) {
      return { active: false, observer: null };
    }
  }

  var api = {
    version: VERSION,
    isValidTrackingCode: isValidTrackingCode,
    readPageTracking: readPageTracking,
    buildTrackedCheckoutHref: buildTrackedCheckoutHref,
    rewriteAnchor: rewriteAnchor,
    scanTree: scanTree,
    start: start,
  };

  global[GLOBAL_KEY] = api;
  try {
    api.runtime = start();
  } catch (_error) {
    api.runtime = { active: false, observer: null };
  }
}(typeof window !== 'undefined' ? window : globalThis));
