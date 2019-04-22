/*
Copyright 2019 Manuel Reimer <manuel.reimer@gmx.de>
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

'use strict';

function ResetCache() {
  browser.extension.getBackgroundPage().ClearCache();
}

document.getElementById("clear-cache-button").addEventListener("click", ResetCache);

// "Common web APIs" for opening new pages don't work here on Firefox for
// Android. So we hook onto the <a> elements and open the pages via
// WebExtensions API.
const links = document.getElementsByTagName('a');
for (let index = 0; index < links.length; index++) {
  links[index].addEventListener("click", (event) => {
    event.preventDefault();
    browser.tabs.create({url: event.target.href});
  });
}
