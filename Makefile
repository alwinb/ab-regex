.PHONY: all clean ab-regex testrun


## Build targets

all: ab-regex
ab-regex: dist/ab-regex.min.js


## Sources

srcs = aatree.js dfa.js signature.js browser.js index.js rangemap.js normalize.js tokenset.js charset.js
src = $(addprefix src/, $(srcs)) 

dist/ab-regex.min.js: dist/ $(src) lib/hoop2.js Makefile
	@ echo "Making a minified browser bundle"
	@ esbuild --bundle --minify src/browser.js > dist/ab-regex.min.js

dist/:
	@ echo "Creating dist/ directory"
	@ mkdir ./dist


## Actions

clean:
	@ test -d dist/ && rm -r dist/ || exit 0

testrun:
	@ node test/rangemap.test.js &&\
	  node test/parser.test.js &&\
	  node test/normalize.test.js &&\
	  node test/dfa.test.js &&\
	  node test/tokenset.test.js &&\
	  node test/index.test.js &&\
		echo "\nAll pass\n"

run: testrun
	# @ echo $(lib) $(src)
