// Why: one place for the fork's GitHub home, so updater feeds and help links never point at upstream Orca.
export const PRODUCT_NAME = 'RipperOS'
export const PRODUCT_REPO_SLUG = 'M4NT/ripperos-ade'
export const PRODUCT_REPO_URL = `https://github.com/${PRODUCT_REPO_SLUG}`
export const PRODUCT_ISSUES_URL = `${PRODUCT_REPO_URL}/issues`
export const PRODUCT_RELEASES_URL = `${PRODUCT_REPO_URL}/releases`
// Empty disables the "what's new" changelog/nudge fetches until RipperOS hosts its own feed.
export const WHATS_NEW_BASE_URL = ''
// Empty refuses feedback submission; upstream's endpoint belongs to Orca and must not get fork users' GitHub identity.
export const FEEDBACK_API_URL = ''
