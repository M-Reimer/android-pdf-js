/*
Copyright 2019 Manuel Reimer <manuel.reimer@gmx.de>
Copyright 2012 Mozilla Foundation

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
/* import-globals-from preserve-referer.js */

'use strict';

var VIEWER_URL = chrome.extension.getURL('content/web/viewer.html');

function getViewerURL(pdf_url) {
  return VIEWER_URL + '?file=' + encodeURIComponent(pdf_url);
}

function getHTML(pdf_url) {
  return '<!DOCTYPE html>\
<html>\
  <head>\
    <meta charset="utf-8">\
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">\
    <style>\
      html, body, iframe { height: 100%; width: 100%; border: 0px; padding: 0px; margin: 0px;}\
      body { overflow: hidden; }\
    </style>\
  </head>\
  <body>\
    <iframe src="' + getViewerURL(pdf_url) + '" allowfullscreen/>\
  </body>\
</html>';
}

/**
 * @param {Object} details First argument of the webRequest.onHeadersReceived
 *                         event. The property "url" is read.
 * @return {boolean} True if the PDF file should be downloaded.
 */
function isPdfDownloadable(details) {
  if (details.url.includes('pdfjs.action=download')) {
    return true;
  }
  // Display the PDF viewer regardless of the Content-Disposition header if the
  // file is displayed in the main frame, since most often users want to view
  // a PDF, and servers are often misconfigured.
  // If the query string contains "=download", do not unconditionally force the
  // viewer to open the PDF, but first check whether the Content-Disposition
  // header specifies an attachment. This allows sites like Google Drive to
  // operate correctly (#6106).
  if (details.type === 'main_frame' && !details.url.includes('=download')) {
    return false;
  }
  var cdHeader = (details.responseHeaders &&
    getHeaderFromHeaders(details.responseHeaders, 'content-disposition'));
  return (cdHeader && /^attachment/i.test(cdHeader.value));
}

/**
 * Get the header from the list of headers for a given name.
 * @param {Array} headers responseHeaders of webRequest.onHeadersReceived
 * @return {undefined|{name: string, value: string}} The header, if found.
 */
function getHeaderFromHeaders(headers, headerName) {
  for (var i = 0; i < headers.length; ++i) {
    var header = headers[i];
    if (header.name.toLowerCase() === headerName) {
      return header;
    }
  }
}

/**
 * Check if the request is a PDF file.
 * @param {Object} details First argument of the webRequest.onHeadersReceived
 *                         event. The properties "responseHeaders" and "url"
 *                         are read.
 * @return {boolean} True if the resource is a PDF file.
 */
function isPdfFile(details) {
  var header = getHeaderFromHeaders(details.responseHeaders, 'content-type');
  if (header) {
    var headerValue = header.value.toLowerCase().split(';', 1)[0].trim();
    if (headerValue === 'application/pdf') {
      return true;
    }
    if (headerValue === 'application/octet-stream') {
      if (details.url.toLowerCase().indexOf('.pdf') > 0) {
        return true;
      }
      var cdHeader =
        getHeaderFromHeaders(details.responseHeaders, 'content-disposition');
      if (cdHeader && /\.pdf(["']|$)/i.test(cdHeader.value)) {
        return true;
      }
    }
  }
}

/**
 * Takes a set of headers, and set "Content-Disposition: attachment".
 * @param {Object} details First argument of the webRequest.onHeadersReceived
 *                         event. The property "responseHeaders" is read and
 *                         modified if needed.
 * @return {Object|undefined} The return value for the onHeadersReceived event.
 *                            Object with key "responseHeaders" if the headers
 *                            have been modified, undefined otherwise.
 */
function getHeadersWithContentDispositionAttachment(details) {
  var headers = details.responseHeaders;
  var cdHeader = getHeaderFromHeaders(headers, 'content-disposition');
  if (!cdHeader) {
    cdHeader = { name: 'Content-Disposition', };
    headers.push(cdHeader);
  }
  if (!/^attachment/i.test(cdHeader.value)) {
    cdHeader.value = 'attachment' + cdHeader.value.replace(/^[^;]+/i, '');
    return { responseHeaders: headers, };
  }
}

chrome.webRequest.onHeadersReceived.addListener(
  function(details) {
    if (details.method !== 'GET') {
      // Don't intercept POST requests until http://crbug.com/104058 is fixed.
      return;
    }
    if (!isPdfFile(details)) {
      return;
    }
    if (isPdfDownloadable(details)) {
      // Force download by ensuring that Content-Disposition: attachment is set
      return getHeadersWithContentDispositionAttachment(details);
    }

    // Implemented in preserve-referer.js
    saveReferer(details);

    const filter = browser.webRequest.filterResponseData(details.requestId);
    filter.onstart = async () => {
      const encoder = new TextEncoder();
      filter.write(encoder.encode(getHTML(details.url)));
      filter.close();
    }
    return { responseHeaders: [ { name: "Content-Type", value: "text/html" } ]};
  },
  {
    urls: [
      '<all_urls>'
    ],
    types: ['main_frame', 'sub_frame'],
  },
  ['blocking', 'responseHeaders']);


// In case of a session restore there is a good chance, that our extension was
// not ready when the first tab was loaded. This results in problems when the
// last active tab was a tab with a PDF rendered by us.
browser.tabs.query({active: true}).then((tabs) => {
  for (let tab of tabs) {
    // This is the expected case. Active tab has an URL that is in context
    // of our extension URL.
    if (tab.url.indexOf(browser.extension.getURL('/')) === 0) {
      console.log("Active tab after session restore is ours. Triggering reload.");
      browser.tabs.reload(tab.id);
    }

    // And this is https://bugzil.la/1546078 :(
    // HACK!!!
    // If the active tab is "about:blank" then wait for it to finish loading.
    // If it still is "about:blank" then, then trigger reload.
    if (tab.url === "about:blank") {
      const waitint = setInterval(() => {
        browser.tabs.get(tab.id).then((rtab) => {
          if (rtab.status === "complete") {
            clearInterval(waitint);
            if (rtab.url === "about:blank") {
              console.log("Active tab after session restore is blank (https://bugzil.la/1546078). Triggering reload.");
              browser.tabs.reload(tab.id);
            }
          }
        });
      }, 200);
    }
  }
});
