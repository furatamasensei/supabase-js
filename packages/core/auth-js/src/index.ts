import GoTrueAdminApi from './GoTrueAdminApi'
import GoTrueClient from './GoTrueClient'
import AuthAdminApi from './AuthAdminApi'
import AuthClient from './AuthClient'
export { GoTrueAdminApi, GoTrueClient, AuthAdminApi, AuthClient }
export * from './lib/types'
export * from './lib/errors'
export {
  navigatorLock,
  NavigatorLockAcquireTimeoutError,
  internals as lockInternals,
  processLock,
} from './lib/locks'
export { getKaspaProvider } from './lib/web3/kaspa'
export type { KIP12Method, KIP12Provider, KIP12ProviderInfo } from './lib/web3/kaspa'
