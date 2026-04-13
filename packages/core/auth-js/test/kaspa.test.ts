import {
  createSiwkMessage,
  getAddress,
  getKaspaProvider,
  type KIP12Provider,
  type KIP12ProviderInfo,
  type SiwkMessage,
} from '../src/lib/web3/kaspa'

describe('kaspa', () => {
  describe('getAddress', () => {
    test('should return address as-is for valid Kaspa addresses on all networks', () => {
      expect(getAddress('kaspa:qqk948c2dy6cp0vdg7fqx9xttc47q4qdazunhmfv8u24v77uvmxhycc2uj3yn')).toBe(
        'kaspa:qqk948c2dy6cp0vdg7fqx9xttc47q4qdazunhmfv8u24v77uvmxhycc2uj3yn'
      )
      expect(getAddress('kaspatest:qrzq2766zyqqpnlsmnwflm7kzgzz5d3yut7096kxpyqcg566t6836zjwcx4lp')).toBe(
        'kaspatest:qrzq2766zyqqpnlsmnwflm7kzgzz5d3yut7096kxpyqcg566t6836zjwcx4lp'
      )
      expect(getAddress('kaspadev:qrzq2766zyqqpnlsmnwflm7kzgzz5d3yut7096kxpyqcg566t6836zjwcx4lp')).toBe(
        'kaspadev:qrzq2766zyqqpnlsmnwflm7kzgzz5d3yut7096kxpyqcg566t6836zjwcx4lp'
      )
      expect(getAddress('kaspasim:qrzq2766zyqqpnlsmnwflm7kzgzz5d3yut7096kxpyqcg566t6836zjwcx4lp')).toBe(
        'kaspasim:qrzq2766zyqqpnlsmnwflm7kzgzz5d3yut7096kxpyqcg566t6836zjwcx4lp'
      )
    })

    test('should throw for addresses missing a valid network prefix', () => {
      const invalidAddresses = [
        'qqk948c2dy6cp0vdg7fqx9xttc47q4qdazunhmfv8u24v77uvmxhycc2uj3yn', // missing prefix
        '', // empty string
        'not-an-address', // random string
        'bitcoin:qqk948c2dy6cp0vdg7fqx9xttc47q4qdazu', // wrong chain prefix
      ]

      invalidAddresses.forEach((address) => {
        expect(() => getAddress(address)).toThrow(
          `@supabase/auth-js: Address "${address}" is invalid.`
        )
      })
    })

    test('should preserve casing of the address as-is', () => {
      const mixed = 'kaspa:QQK948C2DY6CP0VDG7FQX9XTTC47Q4QDAZUNHMFV8U24V77UVMXHYCC2UJ3YN'
      expect(getAddress(mixed)).toBe(mixed)
    })
  })

  describe('createSiwkMessage', () => {
    const baseMessage: SiwkMessage = {
      address: 'kaspa:qqk948c2dy6cp0vdg7fqx9xttc47q4qdazunhmfv8u24v77uvmxhycc2uj3yn',
      chainId: 'kaspa_mainnet',
      domain: 'example.com',
      uri: 'https://example.com',
      version: '1',
    }

    test('should create basic SIWK message', () => {
      const message = createSiwkMessage(baseMessage)

      expect(message).toContain('example.com wants you to sign in with your Kaspa account:')
      expect(message).toContain('kaspa:qqk948c2dy6cp0vdg7fqx9xttc47q4qdazunhmfv8u24v77uvmxhycc2uj3yn')
      expect(message).toContain('URI: https://example.com')
      expect(message).toContain('Version: 1')
      expect(message).toContain('Network ID: kaspa_mainnet')
      expect(message).toContain('Issued At:')
      expect(message).toMatch(/Nonce: [0-9a-f]{16}/)
    })

    test('should auto-generate a nonce when none is provided', () => {
      const message1 = createSiwkMessage(baseMessage)
      const message2 = createSiwkMessage(baseMessage)

      const nonce1 = message1.match(/Nonce: ([0-9a-f]+)/)?.[1]
      const nonce2 = message2.match(/Nonce: ([0-9a-f]+)/)?.[1]

      expect(nonce1).toBeDefined()
      expect(nonce2).toBeDefined()
      expect(nonce1!.length).toBeGreaterThanOrEqual(8)
      // Two calls should produce different nonces
      expect(nonce1).not.toBe(nonce2)
    })

    test('should include optional fields when provided', () => {
      const messageWithOptions: SiwkMessage = {
        ...baseMessage,
        statement: 'Please sign this message to authenticate',
        nonce: '1234567890',
        expirationTime: new Date('2024-12-31T23:59:59Z'),
        notBefore: new Date('2024-01-01T00:00:00Z'),
        requestId: 'req-123',
        resources: ['https://example.com/resource1', 'https://example.com/resource2'],
        scheme: 'https',
      }

      const message = createSiwkMessage(messageWithOptions)

      expect(message).toContain('Please sign this message to authenticate')
      expect(message).toContain('Nonce: 1234567890')
      expect(message).toContain('Expiration Time: 2024-12-31T23:59:59.000Z')
      expect(message).toContain('Not Before: 2024-01-01T00:00:00.000Z')
      expect(message).toContain('Request ID: req-123')
      expect(message).toContain('Resources:')
      expect(message).toContain('- https://example.com/resource1')
      expect(message).toContain('- https://example.com/resource2')
      expect(message).toContain('https://example.com wants you to sign in')
    })

    test('should handle scheme correctly', () => {
      const messageWithScheme: SiwkMessage = {
        ...baseMessage,
        scheme: 'https',
      }

      const message = createSiwkMessage(messageWithScheme)
      expect(message).toContain('https://example.com wants you to sign in')
    })

    test('should validate domain', () => {
      const invalidDomain: SiwkMessage = {
        ...baseMessage,
        domain: '', // empty domain
      }

      expect(() => createSiwkMessage(invalidDomain)).toThrow(
        '@supabase/auth-js: Invalid SIWK message field "domain". Domain must be provided.'
      )
    })

    test('should validate nonce length', () => {
      const shortNonce: SiwkMessage = {
        ...baseMessage,
        nonce: '123', // too short
      }

      expect(() => createSiwkMessage(shortNonce)).toThrow(
        '@supabase/auth-js: Invalid SIWK message field "nonce". Nonce must be at least 8 characters. Provided value: 123'
      )
    })

    test('should validate uri', () => {
      const invalidUri: SiwkMessage = {
        ...baseMessage,
        uri: '', // empty uri
      }

      expect(() => createSiwkMessage(invalidUri)).toThrow(
        '@supabase/auth-js: Invalid SIWK message field "uri". URI must be provided.'
      )
    })

    test('should validate version', () => {
      const invalidVersion: SiwkMessage = {
        ...baseMessage,
        version: '2' as any, // invalid version
      }

      expect(() => createSiwkMessage(invalidVersion)).toThrow(
        '@supabase/auth-js: Invalid SIWK message field "version". Version must be \'1\'. Provided value: 2'
      )
    })

    test('should validate statement does not contain newlines', () => {
      const invalidStatement: SiwkMessage = {
        ...baseMessage,
        statement: 'Line 1\nLine 2', // contains newline
      }

      expect(() => createSiwkMessage(invalidStatement)).toThrow(
        '@supabase/auth-js: Invalid SIWK message field "statement". Statement must not include \'\\n\'. Provided value: Line 1\nLine 2'
      )
    })

    test('should validate resources array', () => {
      const invalidResources: SiwkMessage = {
        ...baseMessage,
        resources: ['valid-resource', '', 'another-valid'], // contains empty string
      }

      expect(() => createSiwkMessage(invalidResources)).toThrow(
        '@supabase/auth-js: Invalid SIWK message field "resources". Every resource must be a valid string. Provided value: '
      )
    })

    test('should validate resources are strings', () => {
      const invalidResources: SiwkMessage = {
        ...baseMessage,
        resources: ['valid-resource', null as any, 'another-valid'], // contains null
      }

      expect(() => createSiwkMessage(invalidResources)).toThrow(
        '@supabase/auth-js: Invalid SIWK message field "resources". Every resource must be a valid string. Provided value: null'
      )
    })

    test('should handle empty resources array', () => {
      const messageWithEmptyResources: SiwkMessage = {
        ...baseMessage,
        resources: [],
      }

      const message = createSiwkMessage(messageWithEmptyResources)
      expect(message).toContain('Resources:')
    })

    test('should format message correctly with all optional fields', () => {
      const fullMessage: SiwkMessage = {
        address: 'kaspa:qqk948c2dy6cp0vdg7fqx9xttc47q4qdazunhmfv8u24v77uvmxhycc2uj3yn',
        chainId: 'kaspa_mainnet',
        domain: 'kaspa.example.com',
        uri: 'https://kaspa.example.com/auth',
        version: '1',
        statement: 'Sign in to access your account',
        nonce: 'abcdef1234567890',
        expirationTime: new Date('2024-12-31T23:59:59Z'),
        notBefore: new Date('2024-01-01T00:00:00Z'),
        requestId: 'auth-request-12345',
        resources: ['https://kaspa.example.com/api', 'https://kaspa.example.com/dashboard'],
        scheme: 'https',
      }

      const message = createSiwkMessage(fullMessage)

      // Check the structure
      const lines = message.split('\n')
      expect(lines[0]).toBe(
        'https://kaspa.example.com wants you to sign in with your Kaspa account:'
      )
      expect(lines[1]).toBe('kaspa:qqk948c2dy6cp0vdg7fqx9xttc47q4qdazunhmfv8u24v77uvmxhycc2uj3yn')
      expect(lines[2]).toBe('')
      expect(lines[3]).toBe('Sign in to access your account')
      expect(lines[4]).toBe('')
      expect(lines[5]).toBe('URI: https://kaspa.example.com/auth')
      expect(lines[6]).toBe('Version: 1')
      expect(lines[7]).toBe('Network ID: kaspa_mainnet')
      expect(lines[8]).toBe('Nonce: abcdef1234567890')
      expect(lines[9]).toMatch(/^Issued At: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(lines[10]).toBe('Expiration Time: 2024-12-31T23:59:59.000Z')
      expect(lines[11]).toBe('Not Before: 2024-01-01T00:00:00.000Z')
      expect(lines[12]).toBe('Request ID: auth-request-12345')
      expect(lines[13]).toBe('Resources:')
      expect(lines[14]).toBe('- https://kaspa.example.com/api')
      expect(lines[15]).toBe('- https://kaspa.example.com/dashboard')
    })

    test('should handle issuedAt default value', () => {
      const beforeTest = new Date()
      const message = createSiwkMessage(baseMessage)
      const afterTest = new Date()

      const issuedAtMatch = message.match(/Issued At: (.+)/)
      expect(issuedAtMatch).toBeTruthy()

      const issuedAt = new Date(issuedAtMatch![1])
      expect(issuedAt.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime())
      expect(issuedAt.getTime()).toBeLessThanOrEqual(afterTest.getTime())
    })
  })

  describe('getKaspaProvider', () => {
    let originalWindow: unknown

    beforeEach(() => {
      originalWindow = (global as any).window
    })

    afterEach(() => {
      ; (global as any).window = originalWindow
      jest.useRealTimers()
    })

    function makeMockWindow(
      onDispatch?: (eventType: string) => void
    ): { listeners: Record<string, Function[]>; win: any } {
      const listeners: Record<string, Function[]> = {}
      const win = {
        setTimeout: (fn: Function, ms: number) => setTimeout(fn, ms),
        clearTimeout: (id: ReturnType<typeof setTimeout>) => clearTimeout(id),
        addEventListener: (event: string, listener: Function) => {
          if (!listeners[event]) listeners[event] = []
          listeners[event].push(listener)
        },
        removeEventListener: (event: string, listener: Function) => {
          if (listeners[event]) {
            listeners[event] = listeners[event].filter((l) => l !== listener)
          }
        },
        dispatchEvent: (event: { type: string }) => {
          onDispatch?.(event.type)
        },
        CustomEvent: class {
          type: string
          constructor(type: string) {
            this.type = type
          }
        },
      }
      return { listeners, win }
    }

    test('resolves with info and provider when kaspa:provider event fires', async () => {
      const mockInfo: KIP12ProviderInfo = {
        id: 'test-wallet',
        name: 'Test Wallet',
        icon: 'data:image/png;base64,abc',
        methods: ['kaspa:connect', 'kaspa:signPersonal'],
      }
      const mockProvider: KIP12Provider = {
        request: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn(),
      }

      const { listeners, win } = makeMockWindow((eventType) => {
        if (eventType === 'kaspa:requestProvider') {
          // Simulate wallet injecting itself in response
          Promise.resolve().then(() => {
            for (const listener of listeners['kaspa:provider'] ?? []) {
              listener({ detail: { info: mockInfo, provider: mockProvider } })
            }
          })
        }
      })

        ; (global as any).window = win

      const result = await getKaspaProvider()
      expect(result.info).toEqual(mockInfo)
      expect(result.provider).toBe(mockProvider)
    })

    test('rejects with "No KIP-12 provider found" when no wallet responds within timeout', async () => {
      jest.useFakeTimers()

      const { win } = makeMockWindow()
        ; (global as any).window = win

      const promise = getKaspaProvider()
      jest.advanceTimersByTime(1500)

      await expect(promise).rejects.toThrow('No KIP-12 provider found')
    })
  })
})
