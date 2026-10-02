import { useCallback, useEffect, useState } from 'react'
import { getMyInquiries } from '../services/marketplaceService'

const EVENT = 'inquiries:changed'
const TTL_MS = 30000
let cache = { userId: null, count: 0, at: 0 }

// Call after accept / reject / delete / convert / create so the header badge refreshes
export const notifyInquiriesChanged = () => {
  cache.at = 0
  window.dispatchEvent(new Event(EVENT))
}

/**
 * Number of pending inquiries waiting for the signed-in user's response (as seller).
 * Cached for 30s so navigating between pages does not spam the API.
 */
export default function usePendingInquiryCount(userId) {
  const [count, setCount] = useState(cache.userId === userId ? cache.count : 0)

  const load = useCallback(async () => {
    if (!userId) {
      setCount(0)
      return
    }
    if (cache.userId === userId && Date.now() - cache.at < TTL_MS) {
      setCount(cache.count)
      return
    }
    try {
      const res = await getMyInquiries({ role: 'seller', status: 'pending', limit: 1 })
      const total = res.pagination?.totalItems || 0
      cache = { userId, count: total, at: Date.now() }
      setCount(total)
    } catch {
      // badge is a nicety; never surface errors from it
    }
  }, [userId])

  useEffect(() => {
    load()
    window.addEventListener(EVENT, load)
    window.addEventListener('focus', load)
    return () => {
      window.removeEventListener(EVENT, load)
      window.removeEventListener('focus', load)
    }
  }, [load])

  return count
}