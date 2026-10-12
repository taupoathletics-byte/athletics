import { useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * Every page opens at the top — whether it was reached by a button, a nav link
 * or a typed URL. A plain <BrowserRouter> keeps the previous page's scroll
 * position, so a link clicked halfway down the home page used to open the next
 * page halfway down too.
 *
 * Two exceptions, both what people expect from a browser:
 * - a link with a #fragment scrolls to that element instead;
 * - Back/Forward (a POP navigation) is left to the browser, which restores
 *   where you were on that page.
 */
export function ScrollToTop() {
  const { pathname, hash, key } = useLocation()
  const navigationType = useNavigationType()

  useLayoutEffect(() => {
    if (navigationType === 'POP' && key !== 'default') return
    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)))
      if (target) {
        target.scrollIntoView({ block: 'start' })
        return
      }
    }
    // 'instant' beats any `scroll-behavior: smooth` in the CSS, so the new page
    // doesn't visibly glide up from where the last one was.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash, key, navigationType])

  return null
}
