.PHONY: all clean ab-regex

all: ab-regex
ab-regex: dist/ab-regex.min.js

srcs = aatree.js dfa.js grammar.js signature.js browser.js index.js rangelist.js normalize.js
src = $(addprefix src/, $(srcs)) 

dist/ab-regex.min.js: dist/ $(src) lib/hoop2.js
	@ echo "Making a minified browser bundle"
	@ esbuild --bundle --minify src/browser.js > dist/ab-regex.min.js

dist/:
	@ echo "Creating dist/ directory"
	@ mkdir ./dist

clean:
	@ test -d dist/ && rm -r dist/ || exit 0

run:
	@ echo $(lib) $(src)

