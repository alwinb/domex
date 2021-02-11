.PHONY: all clean run

srcdir = src/
files = signature.js hoop2.js compile.js eval.js dom.js index.js browser.js 
bundle-name = domex
bundle-entry = browser.js
sources = $(addprefix $(srcdir), $(files))

run: all

all: dist/$(bundle-name).js dist/$(bundle-name).min.js

dist/$(bundle-name).min.js: dist/ $(sources)
	npx esbuild $(srcdir)$(bundle-entry) --platform=node --minify --bundle --outfile=dist/$(bundle-name).min.js

dist/$(bundle-name).js: dist/ $(sources)
	npx esbuild $(srcdir)$(bundle-entry) --platform=node --bundle --outfile=dist/$(bundle-name).js

dist/:
	mkdir dist/

clean:
	test -d dist/ && rm -r dist/ || exit 0

