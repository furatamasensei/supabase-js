export type MainnetAddress = `kaspa:${string}`
export type TestnetAddress = `kaspatest:${string}`
export type DevnetAddress = `kaspadev:${string}`
export type SimnetAddress = `kaspasim:${string}`

export type Address = MainnetAddress | TestnetAddress | DevnetAddress | SimnetAddress

export type NetworkId = 'mainnet' | 'testnet-10' | 'devnet' | 'simnet'

// @TODO: Introduce KIP1193 standard instead of pointing specifically to Kasware
// export type KIP1193RequestFn = (args: { method: string; params?: unknown }) => Promise<unknown>

export type KIP1193Provider = {
  address: string
  // request: KIP1193RequestFn
  requestAccounts: () => Promise<string[]>
  getNetwork: () => Promise<NetworkId>
  signMessage: (message: string, type?: 'ecdsa' | 'schnorr') => Promise<string>
}

export type KaspaWallet = KIP1193Provider

/**
 * KIP-4361 message fields
 */
export type SiwkMessage = {
  /**
   * The Kaspa address performing the signing.
   */
  address: Address
  /**
   * The [EIP-155](https://eips.ethereum.org/EIPS/eip-155) Network ID to which the session is bound,
   */
  networkId: NetworkId
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
  version: '1' | '0'
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
    throw new Error('Invalid Kaspa address format')
  }
}

export function createSiwkMessage(parameters: SiwkMessage): string {
  const {
    networkId,
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

    if (['0', '1'].indexOf(version) === -1)
      throw new Error(
        `@supabase/auth-js: Invalid SIWK message field "version". Version must be '0' or '1'. Provided value: ${version}`
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

  let suffix = `URI: ${uri}\nVersion: ${version}\nNetwork ID: ${networkId}${
    nonce ? `\nNonce: ${nonce}` : ''
  }\nIssued At: ${issuedAt.toISOString()}`

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
