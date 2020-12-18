.PHONY: all clean run

srcdir = src/
files = hoop-parser.js index.js dom.js browser.js domex.js
bundle-name = domex
bundle-entry = browser.js
sources = $(addprefix $(srcdir), $(files))

run: all

all: dist/$(bundle-name).js dist/$(bundle-name).min.js

dist/$(bundle-name).min.js: dist/ $(sources)
	esbuild $(srcdir)$(bundle-entry) --minify --bundle --outfile=dist/$(bundle-name).min.js

dist/$(bundle-name).js: dist/ $(sources)
	esbuild $(srcdir)$(bundle-entry) --bundle --outfile=dist/$(bundle-name).js

dist/:
	mkdir dist/

clean:
	test -d dist/ && rm -r dist/ || exit 0

