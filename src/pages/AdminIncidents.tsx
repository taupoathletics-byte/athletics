import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Lock, ShieldPlus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Report {
  id: string
  url?: string
  title: string
  date: string
  type: string
  status: string
  location: string
  injuredPerson: string
  reportedBy: string
  summary: string
}

const TYPES = ['Injury', 'Illness', 'Environmental', 'Notifiable event', 'Other']

const today = () => new Date().toISOString().slice(0, 10)

const empty = () => ({
  date: today(),
  time: '',
  location: 'Owen Delany Park',
  type: 'Injury',
  status: 'Open',
  injuredPerson: '',
  age: '',
  phone: '',
  email: '',
  reportedBy: '',
  firstAider: '',
  injury: '',
  bodyPart: '',
  treatment: '',
  referredTo: '',
  witnesses: '',
  description: '',
  propertyDamage: '',
  analysis: '',
  prevention: '',
  followUp: '',
})

type Form = ReturnType<typeof empty>

const field =
  'mt-1 w-full rounded-lg border-2 border-outline-variant bg-white px-3 py-2 text-on-surface outline-none transition-colors focus:border-primary'
const label = 'text-sm font-semibold text-on-surface'

function Field({
  id,
  name,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
  className,
}: {
  id: keyof Form
  name: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  placeholder?: string
  className?: string
}) {
  return (
    <div className={className}>
      <label htmlFor={`f-${id}`} className={label}>
        {name}
        {required && <span className="text-signal"> *</span>}
      </label>
      <input
        id={`f-${id}`}
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={field}
      />
    </div>
  )
}

function Area({
  id,
  name,
  value,
  onChange,
  required,
  rows = 3,
}: {
  id: keyof Form
  name: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  rows?: number
}) {
  return (
    <div className="sm:col-span-2">
      <label htmlFor={`f-${id}`} className={label}>
        {name}
        {required && <span className="text-signal"> *</span>}
      </label>
      <textarea
        id={`f-${id}`}
        value={value}
        required={required}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={field}
      />
    </div>
  )
}

/**
 * Admin-only first-aid / incident register. Reports are written to the club's
 * Notion database via /api/incidents (admin session required, checked server
 * side — this page is only a form).
 */
export default function AdminIncidents() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [passcode, setPasscode] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const [reports, setReports] = useState<Report[]>([])
  const [loadError, setLoadError] = useState('')
  const [reportsLoading, setReportsLoading] = useState(false)

  const [form, setForm] = useState<Form>(empty)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  const set = (key: keyof Form) => (v: string) => setForm((f) => ({ ...f, [key]: v }))

  const load = useCallback(async () => {
    setReportsLoading(true)
    setLoadError('')
    try {
      const res = await fetch('/api/incidents')
      if (res.status === 401) {
        setAuthed(false)
        return
      }
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAuthed(true)
        setLoadError(json.error || 'Could not load reports.')
        return
      }
      setAuthed(true)
      setReports(Array.isArray(json.reports) ? json.reports : [])
    } catch {
      setAuthed(false)
    } finally {
      setReportsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLoggingIn(true)
    setLoginError('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setLoginError(json.error || 'Incorrect passcode.')
        return
      }
      setPasscode('')
      await load()
    } catch {
      setLoginError('Could not reach the server. Try again.')
    } finally {
      setLoggingIn(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    setSaved(false)
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 401) {
        setAuthed(false)
        return
      }
      if (!res.ok) {
        setSaveError(json.error || 'Could not save the report.')
        return
      }
      setSaved(true)
      setForm({ ...empty(), location: form.location, reportedBy: form.reportedBy })
      await load()
    } catch {
      setSaveError('Could not reach the server. Try again.')
    } finally {
      setSaving(false)
    }
  }

  if (authed === null) {
    return (
      <section className="container-page section-pad">
        <p className="flex items-center gap-2 text-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking your session…
        </p>
      </section>
    )
  }

  if (!authed) {
    return (
      <section className="container-page flex min-h-[60vh] items-center py-16">
        <form onSubmit={login} className="mx-auto w-full max-w-md rounded-xl bg-white p-gutter-md shadow-soft">
          <div className="flex items-center gap-2 text-primary">
            <Lock className="h-5 w-5" aria-hidden />
            <h1 className="font-display text-2xl font-bold text-on-surface">Admin sign in</h1>
          </div>
          <p className="mt-2 text-sm text-on-surface-variant">
            Incident reports are private to the committee. Enter the club admin passcode.
          </p>
          <label htmlFor="passcode" className="mt-4 block text-sm font-semibold text-on-surface">
            Passcode
          </label>
          <input
            id="passcode"
            type="password"
            value={passcode}
            autoComplete="current-password"
            onChange={(e) => setPasscode(e.target.value)}
            className={field}
          />
          {loginError && <p className="mt-3 text-sm font-semibold text-error">{loginError}</p>}
          <button type="submit" disabled={loggingIn} className={`${buttonVariants({ size: 'lg' })} mt-4 w-full`}>
            {loggingIn ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    )
  }

  return (
    <section className="container-page section-pad">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-sm font-extrabold uppercase tracking-[0.16em] text-signal">Admin</p>
          <h1 className="display-xl text-4xl text-on-surface md:text-5xl">Incident reports</h1>
          <p className="mt-2 max-w-2xl text-on-surface-variant">
            First-aid and incident register for club nights and events. Reports save to the club&rsquo;s Notion
            register, so the committee can follow up.
          </p>
        </div>
        <a
          href="/getsetgo/?view=admin"
          className={buttonVariants({ variant: 'outline' })}
        >
          Back to the admin portal
        </a>
      </div>

      <div className="mt-8 rounded-xl border-l-4 border-l-signal bg-white p-3 text-sm text-on-surface-variant shadow-soft">
        <span className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
          <span>
            Report accidents and incidents within 24 hours. For a notifiable event, also contact WorkSafe New Zealand
            (0800 030 040).
          </span>
        </span>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <form onSubmit={submit} className="rounded-xl bg-white p-gutter-md shadow-soft">
          <div className="flex items-center gap-2 text-primary">
            <ShieldPlus className="h-5 w-5" aria-hidden />
            <h2 className="font-display text-xl font-bold text-on-surface">New report</h2>
          </div>

          <h3 className="mt-5 font-display text-base font-bold uppercase tracking-wide text-on-surface-variant">
            The incident
          </h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Field id="date" name="Date" type="date" required value={form.date} onChange={set('date')} />
            <Field id="time" name="Time" type="time" value={form.time} onChange={set('time')} />
            <Field id="location" name="Location" value={form.location} onChange={set('location')} />
            <div>
              <label htmlFor="f-type" className={label}>
                Type<span className="text-signal"> *</span>
              </label>
              <select id="f-type" value={form.type} onChange={(e) => set('type')(e.target.value)} className={field}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <Area id="description" name="What happened" required value={form.description} onChange={set('description')} rows={4} />
            <Area id="witnesses" name="Witnesses (names and phone numbers)" value={form.witnesses} onChange={set('witnesses')} />
          </div>

          <h3 className="mt-6 font-display text-base font-bold uppercase tracking-wide text-on-surface-variant">
            The injured person
          </h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Field id="injuredPerson" name="Name" required value={form.injuredPerson} onChange={set('injuredPerson')} />
            <Field id="age" name="Age" value={form.age} onChange={set('age')} />
            <Field id="phone" name="Phone" type="tel" value={form.phone} onChange={set('phone')} />
            <Field id="email" name="Email" type="email" value={form.email} onChange={set('email')} />
            <Field id="bodyPart" name="Part of body affected" value={form.bodyPart} onChange={set('bodyPart')} />
            <Field id="injury" name="Nature of injury / illness" value={form.injury} onChange={set('injury')} />
          </div>

          <h3 className="mt-6 font-display text-base font-bold uppercase tracking-wide text-on-surface-variant">
            First aid and follow-up
          </h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Field id="firstAider" name="First aider" value={form.firstAider} onChange={set('firstAider')} />
            <Field id="referredTo" name="Referred to (A&E, doctor, none)" value={form.referredTo} onChange={set('referredTo')} />
            <Area id="treatment" name="Treatment provided" value={form.treatment} onChange={set('treatment')} />
            <Area id="propertyDamage" name="Property damage" value={form.propertyDamage} onChange={set('propertyDamage')} />
            <Area id="analysis" name="What caused or contributed to it" value={form.analysis} onChange={set('analysis')} />
            <Area id="prevention" name="Action taken to prevent it happening again" value={form.prevention} onChange={set('prevention')} />
            <Area id="followUp" name="Follow-up required" value={form.followUp} onChange={set('followUp')} />
          </div>

          <h3 className="mt-6 font-display text-base font-bold uppercase tracking-wide text-on-surface-variant">
            Reported by
          </h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Field id="reportedBy" name="Name" value={form.reportedBy} onChange={set('reportedBy')} />
            <div>
              <label htmlFor="f-status" className={label}>
                Status
              </label>
              <select id="f-status" value={form.status} onChange={(e) => set('status')(e.target.value)} className={field}>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          {saveError && <p className="mt-4 text-sm font-semibold text-error">{saveError}</p>}
          {saved && (
            <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-tertiary">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Report saved. It is now in the Incident Register.
            </p>
          )}

          <button type="submit" disabled={saving} className={`${buttonVariants({ size: 'lg' })} mt-6 w-full sm:w-auto`}>
            {saving ? 'Saving…' : 'Save report'}
          </button>
        </form>

        <div>
          <h2 className="font-display text-xl font-bold text-on-surface">Recent reports</h2>
          {reportsLoading && <p className="mt-2 text-sm text-on-surface-variant">Loading…</p>}
          {loadError && (
            <p className="mt-2 rounded-lg bg-error/10 p-3 text-sm font-semibold text-error">{loadError}</p>
          )}
          {!reportsLoading && !loadError && reports.length === 0 && (
            <p className="mt-2 rounded-xl bg-white p-gutter-sm text-on-surface-variant shadow-soft">
              No reports yet this season.
            </p>
          )}
          <ul className="mt-3 space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl bg-white p-4 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-on-surface">{r.injuredPerson || r.title}</p>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                      r.status === 'Closed' ? 'bg-surface-container-high text-on-surface-variant' : 'bg-signal text-signal-ink',
                    )}
                  >
                    {r.status}
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant">
                  {r.date ? new Date(`${r.date}T00:00:00`).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  {r.type ? ` · ${r.type}` : ''}
                  {r.location ? ` · ${r.location}` : ''}
                </p>
                {r.summary && <p className="mt-2 line-clamp-3 text-sm text-on-surface-variant">{r.summary}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
                  {r.reportedBy && <span>Reported by {r.reportedBy}</span>}
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline">
                      Open in Notion <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
