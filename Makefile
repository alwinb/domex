.PHONY: all clean run

srcdir = src/
files = domexp.js
bundle-name = domexp
bundle-entry = domexp.js
sources = $(addprefix $(srcdir), $(files))

run: all
	@ echo $(sources)

all: dist/$(bundle-name).min.js

dist/$(bundle-name).min.js: dist/ $(sources)
	esbuild $(srcdir)/$(bundle-entry) --minify --outfile=dist/$(bundle-name).min.js

dist/:
	mkdir dist/

clean:
	test -d dist/ && rm -r dist/ || exit 0

