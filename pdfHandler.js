/*
Copyright 2021 Manuel Reimer <manuel.reimer@gmx.de>
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


// This function is meant to bypass the "POST blocker" for "known good URLs"
// Note: If this function returns true, then we handle this URL even if it was
//       requested via "HTTP POST" *but* PDF.js will fetch it via "HTTP GET"!
function PostWhitelistedURL(aURL) {
  if (aURL.startsWith("https://www.pollin.de/productdownloads/"))
    return true;
  return false;
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

/**
 * Helper to read a file shipped with our Add-on.
 * @param aPath Path to the file inside our Add-on
 * @return Promise which will be fulfilled with the file contents.
 */
async function getAddonFile(aPath) {
  const url = browser.runtime.getURL(aPath);
  const response = await fetch(url);
  return await response.text();
}

/**
 * Helper to get a script file for embedding directly into the HTML file.
 * Uses "getAddonFile()" to get the file content and removes sourceMappingURL
 * @param aPath Path to the file inside our Add-on
 * @return Promise which will be fulfilled with the file contents.
 */
async function getAddonScriptForEmbed(aPath) {
  let content = await getAddonFile(aPath);
  return content.replace(/^\/\/# sourceMappingURL=[a-z.]+\.js\.map/m, '');
}

/**
 * Helper to get a data:-URL for a script file
 * Uses "getAddonScriptForEmbed" to get the file and formats it as data:-URL
 * @param aPath Path to the file inside our Add-on
 * @return Promise which will be fulfilled with the data:-URL.
 */
async function getAddonScriptDataURL(aPath) {
  let content = await getAddonScriptForEmbed(aPath);
  return "data:application/javascript;base64," + btoa(unescape(encodeURIComponent(content)));
}

/**
 * The following function creates a viewer HTML file with all scripts embedded.
 * This is to avoid web-accessible scripts for security reasons.
 * This function also slightly patches PDF.js to use its own URL as the PDF URL.
 * The built HTML code is cached and reused.
 * @return Promise which will be fulfilled with the viewer HTML
 */
let viewer_html_cache = false;
async function getHTML() {
  if (!viewer_html_cache) {
    let txt_viewer_js = await getAddonScriptForEmbed('content/web/viewer.js');
    txt_viewer_js = txt_viewer_js.replace(
      '../build/pdf.worker.js',
      await getAddonScriptDataURL('content/build/pdf.worker.js')
    ).replace(
      '../build/pdf.sandbox.js',
      await getAddonScriptDataURL('content/build/pdf.sandbox.js')
    ).replace(
      '../web/cmaps/',
      RESOURCE_URL + '/cmaps/'
    ).replace(
      '"compressed.tracemonkey-pldi-09.pdf"',
      'document.location.href'
    ).replace( // Hide the actual URL parameters from PDF.js
      'const queryString = document.location.search.substring(1);',
      'const queryString = "";'
    );

    let txt_html = await getAddonFile('content/web/viewer.html');
    txt_html = txt_html.replace(
      '<script src="../build/pdf.js"></script>',
      '<script>' + await getAddonScriptForEmbed('content/build/pdf.js') + '</script>'
    ).replace(
      '<script src="viewer.js"></script>',
      '<script>' + txt_viewer_js + '</script>'
    ).replace(
      'href="viewer.css"',
      'href="' + RESOURCE_URL + 'viewer.css"'
    ).replace(
      'locale/locale.properties',
      RESOURCE_URL + 'locale/locale.properties'
    );

    viewer_html_cache = txt_html;
  }

  return viewer_html_cache
}


chrome.webRequest.onHeadersReceived.addListener(
  function(details) {
    if (details.method !== 'GET' && !PostWhitelistedURL(details.url))
      return;

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
      filter.write(encoder.encode(await getHTML()));
      filter.close();
    }
    return { responseHeaders: [ { name: "Content-Type", value: "text/html" },
                                { name: "Content-Security-Policy", value: "default-src 'self' https://www.m-reimer.de data: blob:; script-src 'unsafe-inline' data: blob:; style-src https://www.m-reimer.de 'unsafe-inline'; object-src 'none';"} ]};
  },
  {
    urls: [
      '<all_urls>'
    ],
    types: ['main_frame', 'sub_frame', 'object'],
  },
  ['blocking', 'responseHeaders']);
