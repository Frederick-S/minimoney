import { ref, watch, Ref } from 'vue'

export function useKV<T>(key: string, defaultValue: T): [Ref<T>, (updater: T | ((current: T) => T)) => void, () => void] {
  const value = ref<T>(defaultValue) as Ref<T>
  
  // Initialize from KV store
  const initialize = async () => {
    try {
      const stored = await window.spark.kv.get<T>(key)
      if (stored !== undefined) {
        value.value = stored
      }
    } catch (error) {
      console.warn(`Failed to load from KV store: ${key}`, error)
    }
  }
  
  // Set value in KV store
  const setValue = async (updater: T | ((current: T) => T)) => {
    try {
      const newValue = typeof updater === 'function' 
        ? (updater as (current: T) => T)(value.value)
        : updater
      
      value.value = newValue
      await window.spark.kv.set(key, newValue)
    } catch (error) {
      console.warn(`Failed to save to KV store: ${key}`, error)
    }
  }
  
  // Delete value from KV store
  const deleteValue = async () => {
    try {
      value.value = defaultValue
      await window.spark.kv.delete(key)
    } catch (error) {
      console.warn(`Failed to delete from KV store: ${key}`, error)
    }
  }
  
  // Initialize on mount
  initialize()
  
  return [value, setValue, deleteValue]
}