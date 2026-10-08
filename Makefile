.PHONY: test lint

test:
	node --test 'test/**/*.test.mjs'

lint:
	@find src -name '*.mjs' -exec node --check {} \;
