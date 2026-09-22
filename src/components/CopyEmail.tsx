import * as React from 'react'
import { Check, Copy } from 'lucide-react'

/**
 * The club's email address, shown as text with a copy button.
 *
 * A `mailto:` button only does something when the device has a mail client
 * registered, which plenty of desktop browsers do not — the click then appears
 * to do nothing at all. Showing the address means the page still works, and
 * copying beats asking someone to retype it.
 */
export function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = React.useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email)
    } catch {
      // Clipboard access can be denied or unavailable over plain http; the
      // address is selectable on the page either way.
      return
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest py-1 pl-4 pr-1 text-sm">
      <span className="select-all font-semibold text-on-surface">{email}</span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full text-primary hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        <span className="sr-only">{copied ? 'Address copied' : 'Copy email address'}</span>
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Email address copied to clipboard' : ''}
      </span>
    </span>
  )
}
