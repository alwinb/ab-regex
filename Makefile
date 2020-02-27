.PHONY: all clean ess

all: ab-regex
ab-regex: dist/ab-regex.min.js

srcs = aatree.js dfa.js parser.js signature.js browser.js index.js rangelist.js terms.js
src = $(addprefix src/, $(srcs)) 

dist/ab-regex.min.js: dist/ $(src)
	@ browserify src/browser.js > dist/ab-regex.min.js
	#@ browserify src/browser.js | terser > dist/ab-regex.min.js

dist/:
	@ mkdir ./dist

clean:
	@ test -d dist/ && rm -r dist/ || exit 0

run:
	@ echo $(lib) $(src)

