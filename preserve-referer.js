/*
Copyright 2015 Mozilla Foundation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
/* import-globals-from pdfHandler.js */

'use strict';

// Remembers the request headers for every http(s) page request for the duration
// of the request.
var g_requestHeaders = {};
// g_referrers[tabId][frameId][url] = referrer of PDF frame.
var g_referrers = {};

(function() {
  var requestFilter = {
    urls: ['<all_urls>'],
    types: ['main_frame', 'sub_frame', 'object'],
  };
  chrome.webRequest.onSendHeaders.addListener(function(details) {
    g_requestHeaders[details.requestId] = details.requestHeaders;
  }, requestFilter, ['requestHeaders']);
  chrome.webRequest.onBeforeRedirect.addListener(forgetHeaders, requestFilter);
  chrome.webRequest.onCompleted.addListener(forgetHeaders, requestFilter);
  chrome.webRequest.onErrorOccurred.addListener(forgetHeaders, requestFilter);
  function forgetHeaders(details) {
    delete g_requestHeaders[details.requestId];
  }
})();

/**
 * @param {object} details - onHeadersReceived event data.
 */
function saveReferer(details) {
  var referer = g_requestHeaders[details.requestId] &&
      getHeaderFromHeaders(g_requestHeaders[details.requestId], 'referer');
  referer = referer && referer.value || '';
  if (!g_referrers[details.tabId]) {
    g_referrers[details.tabId] = {};
  }
  if (!g_referrers[details.tabId][details.frameId]) {
    g_referrers[details.tabId][details.frameId] = {};
  }
  g_referrers[details.tabId][details.frameId][details.url] = referer;
}

chrome.tabs.onRemoved.addListener(function(tabId) {
  delete g_referrers[tabId];
});


// Add the Referer header to the "fetch" request done by PDF.js
browser.webRequest.onBeforeSendHeaders.addListener(
  function(details) {
    // Nothing to do if no Referer was saved
    var referer = g_referrers[details.tabId]
               && g_referrers[details.tabId][details.frameId]
               && g_referrers[details.tabId][details.frameId][details.url]
               || '';
    if (referer === '')
      return;

    // Add or modify Referer header
    let found = false;
    details.requestHeaders.forEach(function(header){
      if (header.name.toLowerCase() == "referer") {
        header.value = referer;
        found = true;
      }
    });
    if (!found)
      details.requestHeaders.push({"name": "Referer", "value": referer});

    return {requestHeaders: details.requestHeaders};
  },
  {
    urls: [
      '<all_urls>'
    ],
    types: ['xmlhttprequest'],
  },
  ['blocking', "requestHeaders"]);
