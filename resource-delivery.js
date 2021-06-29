/*
Copyright 2021 Manuel Reimer <manuel.reimer@gmx.de>

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

'use strict';

/* Firefox Add-ons and their ugly workarounds...
 * Some information about this file and what it is meant for
 *
 * Unlike Chrome, where each Add-on uses its own Add-on UUID for its internal
 * resource URLs, Mozilla decided that it may be better to generate a random
 * UUID on installation of each Add-on to "prevent websites from fingerprinting
 * a browser by examining the extensions it has installed" (https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/web_accessible_resources)
 *
 * Unfortunately this will lead to a much bigger problem once you use these
 * resource URLs in page content, as we want to do with PDF.js. Now a website
 * can check for this URL and get the unique UUID, which was generated while
 * Add-on installation, to uniquely identify this specific browser and track it.
 * (https://bugzilla.mozilla.org/show_bug.cgi?id=1372288)
 *
 * To reduce this risk somewhat, I've placed the resource files to my web server
 * but as I don't even want to provide the slightest possibility for me to log
 * any usage, accesses to my webserver are interrupted by the "onBeforeRequest"
 * listener below to redirect them back to the files shipped with this Add-on.
 *
 * It is still possible to detect that my Add-on is installed using several
 * methods but at least we no longer have the worldwide unique UUID in URLs.
 */

// This is the prefix on my server. Loads from this are interrupted below to
// serve the files directly from the Add-on built in resources.
const RESOURCE_URL = "https://www.m-reimer.de/android-pdf-js/content/web/";

chrome.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (!details.url.startsWith(RESOURCE_URL))
      return;

    // Some security checks.
    let path = details.url.substr(RESOURCE_URL.length);
    if (path != "viewer.css" &&
        !path.match(/^images\/[a-zA-Z0-9-]+\.svg$/) &&
        path != "locale/locale.properties" &&
        !path.match(/^locale\/[a-zA-Z-]+\/viewer\.properties$/) &&
        !path.match(/^\/?cmaps\/[a-zA-Z0-9-]+\.bcmap$/)){
      return;
    }

    // cmaps has another leading slash which causes trouble
    path = path.replace(/^\//, "");

    return {redirectUrl: browser.runtime.getURL("content/web/" + path)};
  },
  {
    urls: [
      RESOURCE_URL + "*"
    ],
    types: ['main_frame', 'image', 'xmlhttprequest', 'stylesheet'],
  },
  ['blocking']);
