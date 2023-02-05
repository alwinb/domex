.PHONY: all clean run

srcdir = src/
files = hoop2.js signature.js compile.js unfold.js nodom.js browser.js index.js
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

