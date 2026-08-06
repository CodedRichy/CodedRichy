/* Analytics — privacy-friendly pageviews + contact-intent events.
 *
 * WHY THIS EXISTS
 * This site is a bet on attention. Without measurement there is no way to tell
 * "nobody visits" (fix distribution) apart from "people visit, nobody contacts"
 * (fix the site). Those need opposite work. See ROADMAP.
 *
 * SETUP — one step remains:
 *   1. Sign up free at https://www.goatcounter.com/ and pick a code.
 *   2. Replace SITE_CODE below with it. That is the only edit needed.
 * Until SITE_CODE is set, this file is inert and sends nothing.
 *
 * No cookies, no fingerprinting, no third-party ad network. GoatCounter is
 * GDPR-friendly and needs no consent banner.
 */
(function () {
  'use strict';

  var SITE_CODE = 'SITE_CODE_HERE';

  if (SITE_CODE === 'SITE_CODE_HERE') return;

  // Respect Do Not Track, and never count local development.
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
  var host = location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '' || host.endsWith('.local')) return;

  var endpoint = 'https://' + SITE_CODE + '.goatcounter.com/count';

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://gc.zgo.at/count.js';
  s.setAttribute('data-goatcounter', endpoint);
  document.head.appendChild(s);

  /* Contact intent — the number that actually matters.
   * Pageviews tell you reach. These tell you whether reach converts. */
  function countEvent(path, title) {
    if (!window.goatcounter || !window.goatcounter.count) return;
    window.goatcounter.count({ path: path, title: title, event: true });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;

    var href = a.getAttribute('href') || '';
    var page = location.pathname;

    if (href.indexOf('mailto:') === 0) {
      countEvent('contact-email', 'Email click from ' + page);
      return;
    }
    if (/linkedin\.com/i.test(href)) {
      countEvent('contact-linkedin', 'LinkedIn click from ' + page);
      return;
    }
    if (/github\.com/i.test(href)) {
      countEvent('outbound-github', 'GitHub click from ' + page);
      return;
    }
    if (/\.pdf($|\?)/i.test(href) || /resume/i.test(href)) {
      countEvent('resume-view', 'Resume opened from ' + page);
    }
  }, true);
})();
