# -*- Mode: Makefile -*-
#
# Makefile for Android PDF.js
#

FILES = manifest.json \
        contentscript.js \
        contentstyle.css \
        extension-router.js \
        icon.svg \
        $(wildcard options/options.*) \
        $(wildcard pageAction/*) \
        pdfHandler.html \
        pdfHandler.js \
        preserve-referer.js \
        restoretab.html \
        restoretab.js \
        suppress-update.js

VERSION = $(shell sed -n  's/^  "version": "\([^"]\+\).*/\1/p' manifest.json)

trunk: android-pdfjs-trunk.xpi

release: android-pdfjs-$(VERSION).xpi

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
	patch -p1 -d content.build < pdfjs-origin-fix.patch
	mv content.build content

clean:
	rm -f android-pdfjs-*.xpi
	rm -rf content
