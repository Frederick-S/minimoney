import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCurrency } from './useCurrency'
import * as fc from 'fast-check'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('useCurrency', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('Initial state', () => {
    it('should have CNY as default main currency', () => {
      const { mainCurrency } = useCurrency()
      expect(mainCurrency.value).toBe('CNY')
    })

    it('should have supported currencies defined', () => {
      const { supportedCurrencies } = useCurrency()
      expect(supportedCurrencies.value).toHaveLength(6)
      expect(supportedCurrencies.value.map(c => c.code)).toEqual([
        'CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'
      ])
    })

    it('should have empty exchange rates initially', () => {
      const { exchangeRates } = useCurrency()
      expect(exchangeRates.value.size).toBe(0)
    })
  })

  describe('convert', () => {
    it('should return same amount for same currency', () => {
      const { convert } = useCurrency()
      expect(convert(100, 'USD', 'USD')).toBe(100)
    })

    it('should convert using exchange rate', () => {
      const { convert, exchangeRates } = useCurrency()
      
      // Manually set an exchange rate for testing
      exchangeRates.value.set('USD_CNY', {
        from: 'USD',
        to: 'CNY',
        rate: 7.2,
        lastUpdated: new Date().toISOString()
      })

      expect(convert(100, 'USD', 'CNY')).toBe(720)
    })

    it('should handle inverse conversion', () => {
      const { convert, exchangeRates } = useCurrency()
      
      // Set inverse rate
      exchangeRates.value.set('CNY_USD', {
        from: 'CNY',
        to: 'USD',
        rate: 0.139,
        lastUpdated: new Date().toISOString()
      })

      const result = convert(720, 'CNY', 'USD')
      expect(result).toBeCloseTo(100.08, 1)
    })
  })

  describe('getExchangeRate', () => {
    it('should return 1 for same currency', () => {
      const { getExchangeRate } = useCurrency()
      expect(getExchangeRate('USD', 'USD')).toBe(1)
    })

    it('should return stored rate', () => {
      const { getExchangeRate, exchangeRates } = useCurrency()
      
      exchangeRates.value.set('USD_EUR', {
        from: 'USD',
        to: 'EUR',
        rate: 0.92,
        lastUpdated: new Date().toISOString()
      })

      expect(getExchangeRate('USD', 'EUR')).toBe(0.92)
    })

    it('should calculate inverse rate if direct rate not found', () => {
      const { getExchangeRate, exchangeRates } = useCurrency()
      
      exchangeRates.value.set('EUR_USD', {
        from: 'EUR',
        to: 'USD',
        rate: 1.09,
        lastUpdated: new Date().toISOString()
      })

      const rate = getExchangeRate('USD', 'EUR')
      expect(rate).toBeCloseTo(0.917, 2)
    })

    it('should return 1 if no rate found', () => {
      const { getExchangeRate } = useCurrency()
      expect(getExchangeRate('USD', 'XYZ')).toBe(1)
    })
  })

  describe('isCacheValid', () => {
    it('should return false if no cache exists', () => {
      const { isCacheValid } = useCurrency()
      expect(isCacheValid()).toBe(false)
    })

    it('should return true for recent cache', () => {
      const { isCacheValid } = useCurrency()
      
      const recentTime = new Date().toISOString()
      localStorageMock.setItem('currency_exchange_rates_timestamp', recentTime)

      expect(isCacheValid()).toBe(true)
    })

    it('should return false for old cache', () => {
      const { isCacheValid } = useCurrency()
      
      const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
      localStorageMock.setItem('currency_exchange_rates_timestamp', oldTime)

      expect(isCacheValid()).toBe(false)
    })
  })

  describe('cacheRates', () => {
    it('should store rates in localStorage', () => {
      const { cacheRates } = useCurrency()
      
      const rates = new Map()
      rates.set('USD_CNY', {
        from: 'USD',
        to: 'CNY',
        rate: 7.2,
        lastUpdated: new Date().toISOString()
      })

      cacheRates(rates)

      const cached = localStorageMock.getItem('currency_exchange_rates')
      expect(cached).toBeTruthy()
      
      const parsed = JSON.parse(cached!)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].from).toBe('USD')
      expect(parsed[0].to).toBe('CNY')
    })

    it('should store timestamp', () => {
      const { cacheRates } = useCurrency()
      
      const rates = new Map()
      cacheRates(rates)

      const timestamp = localStorageMock.getItem('currency_exchange_rates_timestamp')
      expect(timestamp).toBeTruthy()
    })
  })

  describe('loadCachedRates', () => {
    it('should return false if no cache exists', () => {
      const { loadCachedRates } = useCurrency()
      expect(loadCachedRates()).toBe(false)
    })

    it('should return false if cache is invalid', () => {
      const { loadCachedRates } = useCurrency()
      
      const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
      localStorageMock.setItem('currency_exchange_rates_timestamp', oldTime)
      localStorageMock.setItem('currency_exchange_rates', '[]')

      expect(loadCachedRates()).toBe(false)
    })

    it('should load valid cached rates', () => {
      const { loadCachedRates, exchangeRates } = useCurrency()
      
      const rates = [{
        from: 'USD',
        to: 'CNY',
        rate: 7.2,
        lastUpdated: new Date().toISOString()
      }]

      const recentTime = new Date().toISOString()
      localStorageMock.setItem('currency_exchange_rates', JSON.stringify(rates))
      localStorageMock.setItem('currency_exchange_rates_timestamp', recentTime)

      expect(loadCachedRates()).toBe(true)
      expect(exchangeRates.value.size).toBe(1)
      expect(exchangeRates.value.get('USD_CNY')?.rate).toBe(7.2)
    })
  })

  describe('Supported currencies', () => {
    it('should include all required currencies', () => {
      const { supportedCurrencies } = useCurrency()
      
      const codes = supportedCurrencies.value.map(c => c.code)
      expect(codes).toContain('CNY')
      expect(codes).toContain('USD')
      expect(codes).toContain('EUR')
      expect(codes).toContain('GBP')
      expect(codes).toContain('JPY')
      expect(codes).toContain('HKD')
    })

    it('should have symbols for all currencies', () => {
      const { supportedCurrencies } = useCurrency()
      
      supportedCurrencies.value.forEach(currency => {
        expect(currency.symbol).toBeTruthy()
        expect(currency.name).toBeTruthy()
      })
    })
  })

  describe('Property-Based Tests', () => {
    /**
     * Feature: subscription-management, Property 10: Currency conversion accuracy
     * Validates: Requirements 4.1, 4.3, 4.4
     * 
     * For any subscription in a currency different from the main currency, 
     * the display amount should equal the original amount multiplied by 
     * the exchange rate from original currency to main currency
     */
    it('Property 10: Currency conversion accuracy', () => {
      fc.assert(
        fc.property(
          // Generate random positive amounts (subscriptions must have positive amounts)
          fc.double({ min: 0.01, max: 100000, noNaN: true }),
          // Generate random exchange rates (realistic range)
          fc.double({ min: 0.01, max: 100, noNaN: true }),
          // Generate currency pairs from supported currencies
          fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
          fc.constantFrom('CNY', 'USD', 'EUR', 'GBP', 'JPY', 'HKD'),
          (amount, rate, fromCurrency, toCurrency) => {
            // Skip same currency conversions (tested separately)
            if (fromCurrency === toCurrency) {
              return true
            }

            const { convert, exchangeRates } = useCurrency()
            
            // Set up the exchange rate
            exchangeRates.value.set(`${fromCurrency}_${toCurrency}`, {
              from: fromCurrency,
              to: toCurrency,
              rate: rate,
              lastUpdated: new Date().toISOString()
            })

            // Perform conversion
            const convertedAmount = convert(amount, fromCurrency, toCurrency)
            const expectedAmount = amount * rate

            // Verify the conversion is accurate within floating point precision
            // Using a relative tolerance for floating point comparison
            const tolerance = Math.abs(expectedAmount) * 1e-10
            const difference = Math.abs(convertedAmount - expectedAmount)
            
            return difference <= tolerance || difference < 1e-10
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
