import { ref } from 'vue'
import { useSupabase } from './useSupabase'
import type { Currency, ExchangeRate } from '../types'

const CACHE_KEY = 'currency_exchange_rates'
const CACHE_TIMESTAMP_KEY = 'currency_exchange_rates_timestamp'
const CACHE_VALIDITY_HOURS = 24

// Supported currencies
const SUPPORTED_CURRENCIES: Currency[] = [
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' }
]

export function useCurrency() {
  const { supabase, user } = useSupabase()
  
  const mainCurrency = ref<string>('CNY')
  const exchangeRates = ref<Map<string, ExchangeRate>>(new Map())
  const supportedCurrencies = ref<Currency[]>(SUPPORTED_CURRENCIES)
  const ratesLastUpdated = ref<string | null>(null)

  /**
   * Check if cached rates are still valid (less than 24 hours old)
   */
  const isCacheValid = (): boolean => {
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)
    if (!timestamp) return false

    const cacheTime = new Date(timestamp).getTime()
    const now = new Date().getTime()
    const hoursSinceCache = (now - cacheTime) / (1000 * 60 * 60)

    return hoursSinceCache < CACHE_VALIDITY_HOURS
  }

  /**
   * Load exchange rates from localStorage cache
   */
  const loadCachedRates = (): boolean => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY)
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)

      if (!cachedData || !timestamp || !isCacheValid()) {
        return false
      }

      const ratesArray: ExchangeRate[] = JSON.parse(cachedData)
      const ratesMap = new Map<string, ExchangeRate>()
      
      ratesArray.forEach(rate => {
        const key = `${rate.from}_${rate.to}`
        ratesMap.set(key, rate)
      })

      exchangeRates.value = ratesMap
      ratesLastUpdated.value = timestamp

      return true
    } catch (error) {
      console.error('Error loading cached rates:', error)
      return false
    }
  }

  /**
   * Cache exchange rates to localStorage
   */
  const cacheRates = (rates: Map<string, ExchangeRate>): void => {
    try {
      const ratesArray = Array.from(rates.values())
      const timestamp = new Date().toISOString()

      localStorage.setItem(CACHE_KEY, JSON.stringify(ratesArray))
      localStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp)
      
      ratesLastUpdated.value = timestamp
    } catch (error) {
      console.error('Error caching rates:', error)
    }
  }

  /**
   * Fetch exchange rates from API
   */
  const fetchExchangeRates = async (baseCurrency: string = 'CNY'): Promise<void> => {
    try {
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`
      )

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      const rates = new Map<string, ExchangeRate>()
      const timestamp = new Date().toISOString()

      // Store rates for all supported currencies
      SUPPORTED_CURRENCIES.forEach(currency => {
        if (data.rates[currency.code]) {
          const rate: ExchangeRate = {
            from: baseCurrency,
            to: currency.code,
            rate: data.rates[currency.code],
            lastUpdated: timestamp
          }
          rates.set(`${baseCurrency}_${currency.code}`, rate)
        }
      })

      // Also store inverse rates for convenience
      SUPPORTED_CURRENCIES.forEach(fromCurrency => {
        SUPPORTED_CURRENCIES.forEach(toCurrency => {
          if (fromCurrency.code !== toCurrency.code) {
            const fromRate = data.rates[fromCurrency.code]
            const toRate = data.rates[toCurrency.code]
            
            if (fromRate && toRate) {
              const rate: ExchangeRate = {
                from: fromCurrency.code,
                to: toCurrency.code,
                rate: toRate / fromRate,
                lastUpdated: timestamp
              }
              rates.set(`${fromCurrency.code}_${toCurrency.code}`, rate)
            }
          }
        })
      })

      exchangeRates.value = rates
      cacheRates(rates)
    } catch (error) {
      console.error('Error fetching exchange rates:', error)
      throw error
    }
  }

  /**
   * Get exchange rate between two currencies
   */
  const getExchangeRate = (from: string, to: string): number => {
    if (from === to) return 1

    const key = `${from}_${to}`
    const rate = exchangeRates.value.get(key)

    if (rate) {
      return rate.rate
    }

    // If direct rate not found, try inverse
    const inverseKey = `${to}_${from}`
    const inverseRate = exchangeRates.value.get(inverseKey)
    
    if (inverseRate) {
      return 1 / inverseRate.rate
    }

    console.warn(`Exchange rate not found for ${from} to ${to}`)
    return 1
  }

  /**
   * Convert amount from one currency to another
   */
  const convert = (amount: number, from: string, to: string): number => {
    if (from === to) return amount

    const rate = getExchangeRate(from, to)
    return amount * rate
  }

  /**
   * Load user's main currency preference from database
   */
  const loadUserCurrencyPreference = async (): Promise<string> => {
    try {
      if (!user.value?.id) {
        return 'CNY' // Default currency
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .select('value')
        .eq('user_id', user.value.id)
        .eq('category', 'currency')
        .eq('key', 'main_currency')
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No preference found, return default
          return 'CNY'
        }
        throw error
      }

      mainCurrency.value = data.value
      return data.value
    } catch (error) {
      console.error('Error loading currency preference:', error)
      return 'CNY'
    }
  }

  /**
   * Set user's main currency preference in database
   */
  const setMainCurrency = async (currency: string): Promise<void> => {
    try {
      if (!user.value?.id) {
        throw new Error('User not authenticated')
      }

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.value.id,
          category: 'currency',
          key: 'main_currency',
          value: currency
        }, {
          onConflict: 'user_id,category,key'
        })

      if (error) throw error

      mainCurrency.value = currency
    } catch (error) {
      console.error('Error setting main currency:', error)
      throw error
    }
  }

  return {
    mainCurrency,
    exchangeRates,
    supportedCurrencies,
    ratesLastUpdated,
    loadUserCurrencyPreference,
    setMainCurrency,
    fetchExchangeRates,
    loadCachedRates,
    cacheRates,
    isCacheValid,
    convert,
    getExchangeRate
  }
}
