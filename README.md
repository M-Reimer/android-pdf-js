Android PDF.js
====================

Addon for "Firefox for Android".

Provides a way to view PDF files directly in the browser without cluttering up your "Downloads" directory. It uses [Mozilla PDF.js](https://github.com/mozilla/pdf.js) to directly view PDF files. This is the same PDF viewer that is already built into the "Desktop Firefox" browser.

Main repository: https://github.com/M-Reimer/android-pdf-js.

AMO: https://addons.mozilla.org/en-US/android/addon/android-pdf-js/

Hacking: Do a [temporary install](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Temporary_Installation_in_Firefox).

Debugging on "Desktop Firefox" works, but you have to set *pdfjs.disabled* to *true* in *about:config*.

Building: [make](https://www.gnu.org/software/make/)
