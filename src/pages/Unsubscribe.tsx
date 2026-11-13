import { useState } from 'react'
import { MailX } from 'lucide-react'
import { PageHero } from '@/components/PageHero'
import { Button } from '@/components/ui/button'
import { contactEmail } from '@/data/site'

/**
 * Opened from the link in a club newsletter. The link carries the address and
 * a signed token, so it only works for the person it was sent to. Nothing
 * happens until they press the button (email scanners open links on their own).
 */
export default function Unsubscribe() {
  const params = new URLSearchParams(window.location.search)
  const e = params.get('e') || ''
  const t = params.get('t') || ''
  const [state, setState] = useState<'idle' | 'busy' | 'out' | 'in' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [who, setWho] = useState('')

  async function go(action: 'unsubscribe' | 'resubscribe') {
    setState('busy')
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ e, t, action }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setState('error')
        setMessage(json.error || 'Something went wrong. Try again shortly.')
        return
      }
      setWho(json.email || '')
      setState(json.subscribed ? 'in' : 'out')
    } catch {
      setState('error')
      setMessage('Could not reach the server. Try again shortly.')
    }
  }

  return (
    <>
      <PageHero eyebrow="Club emails" title="Unsubscribe" subtitle="Stop receiving club newsletters." photo={35} />
      <section className="container-page section-pad">
        <div className="mx-auto max-w-xl rounded-xl bg-white p-gutter-md shadow-soft">
          <MailX className="mb-3 h-8 w-8 text-primary" aria-hidden />
          {!e || !t ? (
            <p className="text-on-surface">
              This link is incomplete. Use the unsubscribe link at the bottom of a club newsletter, or email{' '}
              <a className="font-semibold text-primary underline" href={`mailto:${contactEmail}`}>{contactEmail}</a>.
            </p>
          ) : state === 'out' ? (
            <>
              <p className="font-semibold text-on-surface">Done — {who || 'this address'} won&rsquo;t get club newsletters any more.</p>
              <p className="mt-2 text-on-surface-variant">
                You&rsquo;ll still get club notices that every family needs, such as club-night cancellations.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => go('resubscribe')}>Changed your mind? Resubscribe</Button>
            </>
          ) : state === 'in' ? (
            <p className="font-semibold text-on-surface">You&rsquo;re subscribed again — thanks!</p>
          ) : (
            <>
              <p className="text-on-surface">
                Unsubscribe from Taupō Athletics newsletters? You&rsquo;ll still get club notices that every family needs,
                such as club-night cancellations.
              </p>
              {state === 'error' && <p className="mt-3 font-semibold text-error" role="alert">{message}</p>}
              <Button className="mt-4" disabled={state === 'busy'} onClick={() => go('unsubscribe')}>
                {state === 'busy' ? 'Unsubscribing…' : 'Unsubscribe'}
              </Button>
            </>
          )}
        </div>
      </section>
    </>
  )
}
