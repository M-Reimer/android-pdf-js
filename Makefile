# -*- Mode: Makefile -*-
#
# Makefile for Android PDF.js
#

FILES = manifest.json \
        contentscript.js \
        contentstyle.css \
        icon.svg \
        options/options.html \
        options/options.js \
        pageAction/background.js \
        pdfHandler.js \
        preserve-referer.js

ADDON = android-pdfjs

VERSION = $(shell sed -n  's/^  "version": "\([^"]\+\).*/\1/p' manifest.json)

ANDROIDDEVICE = $(shell adb devices | cut -s -d$$'\t' -f1 | head -n1)

trunk: $(ADDON)-trunk.xpi

release: $(ADDON)-$(VERSION).xpi

%.xpi: $(FILES) content
	@zip -r9 - $^ > $@

# I don't want to mess with building PDF.js on my own.
# This gives us a "web build" of PDF.js without any browser specific messaging.
# To get things to work, a patch is added to remove the origin check.
content:
	wget 'https://github.com/mozilla/pdf.js/archive/gh-pages.zip'
	unzip gh-pages.zip
	rm gh-pages.zip

	rm -rf content.build
	mkdir -p content.build
	mv pdf.js-gh-pages/build content.build
	mv pdf.js-gh-pages/web content.build
	rm -r pdf.js-gh-pages

	rm content.build/web/compressed.tracemonkey-pldi-09.pdf
	patch -p1 -d content.build < patches/pdfjs-origin-fix.patch
	cat patches/pdfjs-pinch-gestures.js >> content.build/web/viewer.js
	mv content.build content

clean:
	rm -f $(ADDON)-*.xpi
	rm -rf content

# Starts local debug session
run: content
	web-ext run --bc --pref=pdfjs.disabled=true

# Starts debug session on connected Android device
arun: content
	@if [ -z "$(ANDROIDDEVICE)" ]; then \
	  echo "No android devices found!"; \
	else \
	  web-ext run --target=firefox-android --android-device="$(ANDROIDDEVICE)"; \
	fi
