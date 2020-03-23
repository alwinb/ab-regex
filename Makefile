.PHONY: all clean ess

all: ab-regex
ab-regex: dist/ab-regex.min.js

srcs = aatree.js dfa.js parser.js signature.js browser.js index.js rangelist.js normalize.js
src = $(addprefix src/, $(srcs)) 

dist/ab-regex.min.js: dist/ $(src)
	@ echo "Making a minified browser bundle"
	@ browserify src/browser.js | terser > dist/ab-regex.min.js

dist/:
	@ echo "Creating dist/ directory"
	@ mkdir ./dist

clean:
	@ test -d dist/ && rm -r dist/ || exit 0

run:
	@ echo $(lib) $(src)

