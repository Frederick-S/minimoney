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
  { code: 'HKD', symbol: '$', name: 'Hong Kong Dollar' }
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
   * Fetch exchange rates from API with retry logic
   * @param baseCurrency - The base currency for exchange rates
   * @param retries - Number of retry attempts (default: 3)
   * @param retryDelay - Delay between retries in ms (default: 1000)
   */
  const fetchExchangeRates = async (
    baseCurrency: string = 'CNY',
    retries: number = 3,
    retryDelay: number = 1000
  ): Promise<void> => {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(
          `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`,
          {
            signal: AbortSignal.timeout(10000) // 10 second timeout
          }
        )

        if (!response.ok) {
          throw new Error(`API请求失败: HTTP ${response.status}`)
        }

        const data = await response.json()
        
        if (!data.rates) {
          throw new Error('API返回的数据格式无效')
        }

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
        
        // Success - exit retry loop
        return
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('获取汇率失败')
        console.error(`获取汇率失败 (尝试 ${attempt + 1}/${retries + 1}):`, error)

        // If this is not the last attempt, wait before retrying
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
        }
      }
    }

    // All retries failed
    throw new Error(`获取汇率失败，已重试${retries}次: ${lastError?.message || '未知错误'}`)
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
    // Validate inputs
    if (!amount || isNaN(amount) || !isFinite(amount)) {
      console.warn('Invalid amount for conversion:', amount)
      return 0
    }
    
    if (!from || !to) {
      console.warn('Invalid currency codes for conversion:', from, to)
      return amount
    }
    
    if (from === to) return amount

    try {
      const rate = getExchangeRate(from, to)
      const converted = amount * rate
      
      // Validate result
      if (isNaN(converted) || !isFinite(converted)) {
        console.warn('Invalid conversion result:', { amount, from, to, rate, converted })
        return amount
      }
      
      return converted
    } catch (error) {
      console.error('Error converting currency:', error)
      return amount
    }
  }

  /**
   * Load user's main currency preference from database
   * 
   * Note: Uses .single() which returns PGRST116 error when no row exists.
   * This is expected behavior for first-time users and is handled gracefully
   * by returning the default currency (CNY).
   */
  const loadUserCurrencyPreference = async (): Promise<string> => {
    if (!user.value?.id) {
      mainCurrency.value = 'CNY'
      return 'CNY' // Default currency
    }

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('value')
        .eq('user_id', user.value.id)
        .eq('category', 'currency')
        .eq('key', 'main_currency')
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Expected: No preference found for first-time users
          // .single() returns PGRST116 when 0 rows match the query
          mainCurrency.value = 'CNY'
          return 'CNY'
        }
        console.error('Error loading currency preference:', error)
        // Return default on error but don't throw
        mainCurrency.value = 'CNY'
        return 'CNY'
      }

      // Validate the loaded currency is supported
      const isSupported = SUPPORTED_CURRENCIES.some(c => c.code === data.value)
      if (!isSupported) {
        console.warn(`Loaded unsupported currency ${data.value}, using default CNY`)
        mainCurrency.value = 'CNY'
        return 'CNY'
      }

      mainCurrency.value = data.value
      return data.value
    } catch (error) {
      console.error('Error loading currency preference:', error)
      mainCurrency.value = 'CNY'
      return 'CNY'
    }
  }

  /**
   * Set user's main currency preference in database
   */
  const setMainCurrency = async (currency: string): Promise<void> => {
    if (!user.value?.id) {
      throw new Error('用户未登录，无法保存货币设置')
    }

    // Validate currency is supported
    const isSupported = SUPPORTED_CURRENCIES.some(c => c.code === currency)
    if (!isSupported) {
      throw new Error(`不支持的货币: ${currency}`)
    }

    try {
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

      if (error) {
        console.error('Database error setting main currency:', error)
        throw new Error('保存货币设置失败，请重试')
      }

      mainCurrency.value = currency
    } catch (error) {
      if (error instanceof Error && error.message.includes('保存货币设置失败')) {
        throw error
      }
      console.error('Error setting main currency:', error)
      throw new Error('保存货币设置失败，请检查网络连接')
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
