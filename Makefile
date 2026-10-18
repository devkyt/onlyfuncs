# ====================================
# HELP
# ====================================

## help: show all available commands
.PHONY: help
help:
	@printf 'Usage:\n\n'
	@sed -n 's/^##//p' ${MAKEFILE_LIST} | column -t -s ':' | sed -e 's/^/ /'
	@printf '\n'


# ====================================
# LOCAL DEVELOPMENT
# ====================================

## test: run all tests
.PHONY: test
test:
	npm test

## build: build the package if a build script exists
.PHONY: build
build:
	npm run build --if-present

## pack: preview the npm package contents
.PHONY: pack
pack:
	npm pack --dry-run


# ====================================
# RELEASE
# ====================================

## release: create and push a release (make release VERSION=v0.1.0)
.PHONY: release
release:
	@test -n "$(VERSION)" || { echo "VERSION is required, e.g. make release VERSION=v0.1.0"; exit 1; }
	@case "$(VERSION)" in v*) ;; *) echo "VERSION must start with v"; exit 1;; esac
	@test -z "$$(git status --porcelain)" || { echo "Working tree must be clean"; exit 1; }
	@test -n "$$(git branch --show-current)" || { echo "You must be on a branch"; exit 1; }
	npm run build --if-present
	npm test
	npm pack --dry-run
	git push --atomic origin "HEAD:refs/heads/$$(git branch --show-current)" "refs/tags/$(VERSION)"
