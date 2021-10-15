.PHONY: all clean run

srcdir = src/
files = signature.js hoop2.js compile.js eval.js dom.js index.js browser.js 
bundle-name = domex
bundle-entry = browser.js
sources = $(addprefix $(srcdir), $(files))

run: all

all: dist/$(bundle-name).js dist/$(bundle-name).min.js

dist/$(bundle-name).min.js: dist/ $(sources)
	esbuild $(srcdir)$(bundle-entry) --minify --bundle --format=esm --outfile=dist/$(bundle-name).min.js

dist/$(bundle-name).js: dist/ $(sources)
	esbuild $(srcdir)$(bundle-entry) --bundle --format=esm --outfile=dist/$(bundle-name).js

dist/:
	mkdir dist/

clean:
	test -d dist/ && rm -r dist/ || exit 0

