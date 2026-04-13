export type MainnetAddress = `kaspa:${string}`
export type TestnetAddress = `kaspatest:${string}`
export type DevnetAddress = `kaspadev:${string}`
export type SimnetAddress = `kaspasim:${string}`

export type Address = MainnetAddress | TestnetAddress | DevnetAddress | SimnetAddress

export type NetworkId = 'kaspa_mainnet' | 'kaspa_testnet_10' | 'kaspa_devnet' | 'kaspa_simnet'

export type KIP12Method =
  | 'kaspa:connect'
  | 'kaspa:disconnect'
  | 'kaspa:send'
  | 'kaspa:sign'
  | 'kaspa:broadcast'
  | 'kaspa:signPersonal'
  | 'kaspa:sendTransaction'
  | 'kaspa:signTransaction'
  | 'kaspa:broadcastTransaction'

export interface KIP12ProviderInfo {
  id: string
  name: string
  icon: string
  methods: readonly KIP12Method[]
}

export interface KIP12Provider {
  request(method: KIP12Method, args: unknown[]): Promise<unknown>
  connect(): Promise<void>
  disconnect(): Promise<void>
}

export async function getKaspaProvider(): Promise<{
  info: KIP12ProviderInfo
  provider: KIP12Provider
}> {
  const w = window as any
  return new Promise((resolve, reject) => {
    const timeout = w.setTimeout(() => {
      w.removeEventListener('kaspa:provider', onProvider)
      reject(new Error('No KIP-12 provider found'))
    }, 1500)

    const onProvider = (event: {
      detail: { info: KIP12ProviderInfo; provider: KIP12Provider }
    }) => {
      w.clearTimeout(timeout)
      w.removeEventListener('kaspa:provider', onProvider)
      resolve(event.detail)
    }

    w.addEventListener('kaspa:provider', onProvider, { once: true })
    w.dispatchEvent(new w.CustomEvent('kaspa:requestProvider'))
  })
}

/**
 * Kaspa message fields
 */
export type SiwkMessage = {
  /**
   * The Kaspa address performing the signing.
   */
  address: Address
  /**
   * The Kaspa chain ID to which the session is bound.
   */
  chainId: NetworkId
  /**
   * [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986) authority that is requesting the signing.
   */
  domain: string
  /**
   * Time when the signed authentication message is no longer valid.
   */
  expirationTime?: Date | undefined
  /**
   * Time when the message was generated, typically the current time.
   */
  issuedAt?: Date | undefined
  /**
   * A random string typically chosen by the relying party and used to prevent replay attacks.
   */
  nonce?: string
  /**
   * Time when the signed authentication message will become valid.
   */
  notBefore?: Date | undefined
  /**
   * A system-specific identifier that may be used to uniquely refer to the sign-in request.
   */
  requestId?: string | undefined
  /**
   * A list of information or references to information the user wishes to have resolved as part of authentication by the relying party.
   */
  resources?: string[] | undefined
  /**
   * [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986#section-3.1) URI scheme of the origin of the request.
   */
  scheme?: string | undefined
  /**
   * A human-readable ASCII assertion that the user will sign.
   */
  statement?: string | undefined
  /**
   * [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986) URI referring to the resource that is the subject of the signing (as in the subject of a claim).
   */
  uri: string
  /**
   * The current version of the SIWK Message.
   */
  version: '1'
}

export type KaspaSignInInput = SiwkMessage

export function getAddress(address: string): Address {
  if (address.startsWith('kaspa:')) {
    return address as MainnetAddress
  } else if (address.startsWith('kaspatest:')) {
    return address as TestnetAddress
  } else if (address.startsWith('kaspadev:')) {
    return address as DevnetAddress
  } else if (address.startsWith('kaspasim:')) {
    return address as SimnetAddress
  } else {
    throw new Error(`@supabase/auth-js: Address "${address}" is invalid.`)
  }
}

function generateNonce(): string {
  const array = new Uint8Array(8)
  if (typeof crypto === 'undefined') {
    return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
  }
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function createSiwkMessage(parameters: SiwkMessage): string {
  const {
    chainId,
    domain,
    expirationTime,
    issuedAt = new Date(),
    nonce,
    notBefore,
    requestId,
    resources,
    scheme,
    uri,
    version,
  } = parameters

  // Validate fields
  {
    if (!domain)
      throw new Error(
        `@supabase/auth-js: Invalid SIWK message field "domain". Domain must be provided.`
      )

    if (nonce && nonce.length < 8)
      throw new Error(
        `@supabase/auth-js: Invalid SIWK message field "nonce". Nonce must be at least 8 characters. Provided value: ${nonce}`
      )

    if (!uri)
      throw new Error(`@supabase/auth-js: Invalid SIWK message field "uri". URI must be provided.`)

    if (version !== '1')
      throw new Error(
        `@supabase/auth-js: Invalid SIWK message field "version". Version must be '1'. Provided value: ${version}`
      )

    if (parameters.statement?.includes('\n'))
      throw new Error(
        `@supabase/auth-js: Invalid SIWK message field "statement". Statement must not include '\\n'. Provided value: ${parameters.statement}`
      )
  }

  // Construct message
  const address = getAddress(parameters.address)
  const origin = scheme ? `${scheme}://${domain}` : domain
  const statement = parameters.statement ? `${parameters.statement}\n` : ''
  const prefix = `${origin} wants you to sign in with your Kaspa account:\n${address}\n\n${statement}`

  const resolvedNonce = nonce ?? generateNonce()
  let suffix = `URI: ${uri}\nVersion: ${version}\nNetwork ID: ${chainId}\nNonce: ${resolvedNonce}\nIssued At: ${issuedAt.toISOString()}`

  if (expirationTime) suffix += `\nExpiration Time: ${expirationTime.toISOString()}`
  if (notBefore) suffix += `\nNot Before: ${notBefore.toISOString()}`
  if (requestId) suffix += `\nRequest ID: ${requestId}`
  if (resources) {
    let content = '\nResources:'
    for (const resource of resources) {
      if (!resource || typeof resource !== 'string')
        throw new Error(
          `@supabase/auth-js: Invalid SIWK message field "resources". Every resource must be a valid string. Provided value: ${resource}`
        )
      content += `\n- ${resource}`
    }
    suffix += content
  }

  return `${prefix}\n${suffix}`
}
