import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardList, ExternalLink, HardHat, Loader2, Lock, ShieldPlus } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Kind = 'incident' | 'hazard' | 'investigation'

interface Report {
  id: string
  url?: string
  kind: Kind
  title: string
  date: string
  status: string
  location: string
  category: string
  person: string
  summary: string
}

const KINDS: { id: Kind; label: string; blurb: string }[] = [
  { id: 'incident', label: 'Incident / first aid', blurb: 'Accidents, illness and near misses on site.' },
  { id: 'hazard', label: 'Hazard register', blurb: 'Anything that could harm someone, and what we did about it.' },
  { id: 'investigation', label: 'Accident investigation', blurb: 'For serious incidents and notifiable events.' },
]

const TYPES = ['Injury', 'Illness', 'Environmental', 'Notifiable event', 'Other']
const RISK = ['Low', 'Medium', 'High']
const SEVERITY = ['Minor', 'Serious', 'Very serious']
const LIKELIHOOD = ['Rare', 'Occasional', 'Frequent']

const today = () => new Date().toISOString().slice(0, 10)

const empty = () => ({
  // shared
  date: today(),
  time: '',
  location: 'Owen Delany Park',
  status: 'Open',
  reportedBy: '',
  // incident
  type: 'Injury',
  injuredPerson: '',
  age: '',
  phone: '',
  email: '',
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
  // hazard
  hazard: '',
  potentialHarm: '',
  riskRating: 'Low',
  significant: '',
  controls: '',
  responsible: '',
  actionDate: '',
  completedBy: '',
  eliminate: '',
  isolate: '',
  minimise: '',
  // investigation
  organisation: 'Taupō Athletics Club',
  department: '',
  dateReported: '',
  jobTitle: '',
  address: '',
  employmentLength: '',
  propertyDamaged: '',
  damageNature: '',
  severity: 'Minor',
  likelihood: 'Rare',
  doctorHospital: '',
  investigatedBy: '',
  investigatedDate: '',
  oshAdvised: '',
  oshDate: '',
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

function Choice({
  id,
  name,
  value,
  onChange,
  options,
  required,
}: {
  id: keyof Form
  name: string
  value: string
  onChange: (v: string) => void
  options: string[]
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={`f-${id}`} className={label}>
        {name}
        {required && <span className="text-signal"> *</span>}
      </label>
      <select id={`f-${id}`} value={value} onChange={(e) => onChange(e.target.value)} className={field}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o || '—'}
          </option>
        ))}
      </select>
    </div>
  )
}

function Check({ id, name, value, onChange }: { id: keyof Form; name: string; value: string; onChange: (v: string) => void }) {
  return (
    <label htmlFor={`f-${id}`} className="flex items-center gap-2 text-sm font-semibold text-on-surface">
      <input
        id={`f-${id}`}
        type="checkbox"
        checked={value === 'Yes'}
        onChange={(e) => onChange(e.target.checked ? 'Yes' : '')}
        className="h-4 w-4 rounded border-2 border-outline-variant text-primary focus:ring-primary"
      />
      {name}
    </label>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 font-display text-base font-bold uppercase tracking-wide text-on-surface-variant">{children}</h3>
  )
}

/**
 * Admin-only safety registers. Reports are written to Notion via
 * /api/incidents (admin session checked server-side). The three registers have
 * separate databases — create them with scripts/notion_safety_setup.mjs.
 */
export default function AdminIncidents() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [passcode, setPasscode] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const [kind, setKind] = useState<Kind>('incident')
  const [reports, setReports] = useState<Report[]>([])
  const [loadError, setLoadError] = useState('')
  const [reportsLoading, setReportsLoading] = useState(false)

  const [form, setForm] = useState<Form>(empty)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  const set = (key: keyof Form) => (v: string) => setForm((f) => ({ ...f, [key]: v }))

  const load = useCallback(async (which: Kind) => {
    setReportsLoading(true)
    setLoadError('')
    try {
      const res = await fetch(`/api/incidents?kind=${which}`)
      if (res.status === 401) {
        setAuthed(false)
        return
      }
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAuthed(true)
        setLoadError(json.error || 'Could not load the register.')
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
    void load(kind)
  }, [kind, load])

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
      await load(kind)
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
      const res = await fetch(`/api/incidents?kind=${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, kind }),
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
      setForm({ ...empty(), date: today(), location: form.location, reportedBy: form.reportedBy })
      await load(kind)
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
            Safety registers are private to the committee. Enter the club admin passcode.
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

  const current = KINDS.find((k) => k.id === kind)!

  return (
    <section className="container-page section-pad">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-sm font-extrabold uppercase tracking-[0.16em] text-signal">Admin</p>
          <h1 className="display-xl text-4xl text-on-surface md:text-5xl">Safety registers</h1>
          <p className="mt-2 max-w-2xl text-on-surface-variant">
            Incident, hazard and accident-investigation records for club nights and events. Reports save to the
            club&rsquo;s Notion registers so the committee can follow up.
          </p>
        </div>
        <a href="/getsetgo/?view=admin" className={buttonVariants({ variant: 'outline' })}>
          Back to the admin portal
        </a>
      </div>

      <div className="mt-6 grid gap-2 sm:grid-cols-3">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            aria-pressed={kind === k.id}
            onClick={() => {
              setKind(k.id)
              setSaved(false)
              setSaveError('')
            }}
            className={cn(
              'rounded-xl border-2 px-4 py-3 text-left transition-colors',
              kind === k.id ? 'border-primary bg-primary text-white' : 'border-outline-variant bg-white hover:border-primary',
            )}
          >
            <span className="block font-display text-lg font-bold">{k.label}</span>
            <span className={cn('mt-0.5 block text-sm', kind === k.id ? 'text-white/80' : 'text-on-surface-variant')}>
              {k.blurb}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-xl border-l-4 border-l-signal bg-white p-3 text-sm text-on-surface-variant shadow-soft">
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
            {kind === 'hazard' ? <HardHat className="h-5 w-5" aria-hidden /> : kind === 'investigation' ? <ClipboardList className="h-5 w-5" aria-hidden /> : <ShieldPlus className="h-5 w-5" aria-hidden />}
            <h2 className="font-display text-xl font-bold text-on-surface">New {current.label.toLowerCase()} report</h2>
          </div>

          {kind === 'incident' && (
            <>
              <SectionHeading>The incident</SectionHeading>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Field id="date" name="Date" type="date" required value={form.date} onChange={set('date')} />
                <Field id="time" name="Time" type="time" value={form.time} onChange={set('time')} />
                <Field id="location" name="Location" value={form.location} onChange={set('location')} />
                <Choice id="type" name="Type" required value={form.type} onChange={set('type')} options={TYPES} />
                <Area id="description" name="What happened" required value={form.description} onChange={set('description')} rows={4} />
                <Area id="witnesses" name="Witnesses (names and phone numbers)" value={form.witnesses} onChange={set('witnesses')} />
              </div>

              <SectionHeading>The injured person</SectionHeading>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Field id="injuredPerson" name="Name" required value={form.injuredPerson} onChange={set('injuredPerson')} />
                <Field id="age" name="Age" value={form.age} onChange={set('age')} />
                <Field id="phone" name="Phone" type="tel" value={form.phone} onChange={set('phone')} />
                <Field id="email" name="Email" type="email" value={form.email} onChange={set('email')} />
                <Field id="bodyPart" name="Part of body affected" value={form.bodyPart} onChange={set('bodyPart')} />
                <Field id="injury" name="Nature of injury / illness" value={form.injury} onChange={set('injury')} />
              </div>

              <SectionHeading>First aid and follow-up</SectionHeading>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Field id="firstAider" name="First aider" value={form.firstAider} onChange={set('firstAider')} />
                <Field id="referredTo" name="Referred to (A&E, doctor, none)" value={form.referredTo} onChange={set('referredTo')} />
                <Area id="treatment" name="Treatment provided" value={form.treatment} onChange={set('treatment')} />
                <Area id="propertyDamage" name="Property damage" value={form.propertyDamage} onChange={set('propertyDamage')} />
                <Area id="analysis" name="What caused or contributed to it" value={form.analysis} onChange={set('analysis')} />
                <Area id="prevention" name="Action taken to prevent it happening again" value={form.prevention} onChange={set('prevention')} />
                <Area id="followUp" name="Follow-up required" value={form.followUp} onChange={set('followUp')} />
              </div>
            </>
          )}

          {kind === 'hazard' && (
            <>
              <SectionHeading>The hazard</SectionHeading>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Field id="date" name="Date identified" type="date" required value={form.date} onChange={set('date')} />
                <Field id="location" name="Location" value={form.location} onChange={set('location')} />
                <Area id="hazard" name="Hazard and potential harm" required value={form.hazard} onChange={set('hazard')} />
                <Area id="potentialHarm" name="Potential harm" value={form.potentialHarm} onChange={set('potentialHarm')} />
                <Choice id="riskRating" name="Risk rating" required value={form.riskRating} onChange={set('riskRating')} options={RISK} />
                <Choice id="significant" name="Significant hazard?" value={form.significant} onChange={set('significant')} options={['', 'Yes', 'No']} />
              </div>

              <SectionHeading>Controls</SectionHeading>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Area id="controls" name="Controls required (including existing)" value={form.controls} onChange={set('controls')} rows={4} />
                <div className="sm:col-span-2 flex flex-wrap gap-5">
                  <Check id="eliminate" name="Eliminate" value={form.eliminate} onChange={set('eliminate')} />
                  <Check id="isolate" name="Isolate" value={form.isolate} onChange={set('isolate')} />
                  <Check id="minimise" name="Minimise" value={form.minimise} onChange={set('minimise')} />
                </div>
                <Field id="responsible" name="Person responsible" value={form.responsible} onChange={set('responsible')} />
                <Field id="actionDate" name="Date of action" type="date" value={form.actionDate} onChange={set('actionDate')} />
                <Field id="completedBy" name="Completed by" value={form.completedBy} onChange={set('completedBy')} />
              </div>
            </>
          )}

          {kind === 'investigation' && (
            <>
              <SectionHeading>Particulars of the accident</SectionHeading>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Field id="organisation" name="Name of organisation" value={form.organisation} onChange={set('organisation')} />
                <Field id="department" name="Department" value={form.department} onChange={set('department')} />
                <Field id="date" name="Date" type="date" required value={form.date} onChange={set('date')} />
                <Field id="time" name="Time" type="time" value={form.time} onChange={set('time')} />
                <Field id="location" name="Location" value={form.location} onChange={set('location')} />
                <Field id="dateReported" name="Date reported" type="date" value={form.dateReported} onChange={set('dateReported')} />
              </div>

              <SectionHeading>Details of the injured person</SectionHeading>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Field id="injuredPerson" name="Name" required value={form.injuredPerson} onChange={set('injuredPerson')} />
                <Field id="age" name="Age" value={form.age} onChange={set('age')} />
                <Field id="phone" name="Contact number" type="tel" value={form.phone} onChange={set('phone')} />
                <Field id="jobTitle" name="Job title / role" value={form.jobTitle} onChange={set('jobTitle')} />
                <Field id="address" name="Address" value={form.address} onChange={set('address')} />
                <Field id="employmentLength" name="Length of involvement" value={form.employmentLength} onChange={set('employmentLength')} />
                <Field id="injury" name="Type of injury" value={form.injury} onChange={set('injury')} />
                <Field id="bodyPart" name="Injured part of body" value={form.bodyPart} onChange={set('bodyPart')} />
                <Field id="propertyDamaged" name="Property damaged" value={form.propertyDamaged} onChange={set('propertyDamaged')} />
                <Field id="damageNature" name="Nature of damage" value={form.damageNature} onChange={set('damageNature')} />
              </div>

              <SectionHeading>The accident</SectionHeading>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Area id="description" name="Describe what happened" required value={form.description} onChange={set('description')} rows={4} />
                <Area id="analysis" name="What were the causes of the accident?" value={form.analysis} onChange={set('analysis')} />
                <Choice id="severity" name="How bad could it have been?" required value={form.severity} onChange={set('severity')} options={SEVERITY} />
                <Choice id="likelihood" name="Chance of it happening again?" value={form.likelihood} onChange={set('likelihood')} options={LIKELIHOOD} />
                <Area id="prevention" name="What has or will be done to prevent it?" value={form.prevention} onChange={set('prevention')} />
              </div>

              <SectionHeading>Treatment and investigation</SectionHeading>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Field id="treatment" name="Type of treatment given" value={form.treatment} onChange={set('treatment')} />
                <Field id="firstAider" name="Name of first aider" value={form.firstAider} onChange={set('firstAider')} />
                <Field id="doctorHospital" name="Doctor / hospital" value={form.doctorHospital} onChange={set('doctorHospital')} />
                <Field id="investigatedBy" name="Accident investigated by" value={form.investigatedBy} onChange={set('investigatedBy')} />
                <Field id="investigatedDate" name="Date investigated" type="date" value={form.investigatedDate} onChange={set('investigatedDate')} />
                <Field id="oshAdvised" name="OSH / WorkSafe advised?" value={form.oshAdvised} onChange={set('oshAdvised')} />
                <Field id="oshDate" name="Date advised" type="date" value={form.oshDate} onChange={set('oshDate')} />
              </div>
            </>
          )}

          <SectionHeading>Reported by</SectionHeading>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Field id="reportedBy" name="Name" value={form.reportedBy} onChange={set('reportedBy')} />
            <Choice id="status" name="Status" value={form.status} onChange={set('status')} options={['Open', 'Closed']} />
          </div>

          {saveError && <p className="mt-4 text-sm font-semibold text-error">{saveError}</p>}
          {saved && (
            <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-tertiary">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Saved to the {current.label.toLowerCase()} register.
            </p>
          )}

          <button type="submit" disabled={saving} className={`${buttonVariants({ size: 'lg' })} mt-6 w-full sm:w-auto`}>
            {saving ? 'Saving…' : 'Save report'}
          </button>
        </form>

        <div>
          <h2 className="font-display text-xl font-bold text-on-surface">Recent {current.label.toLowerCase()} reports</h2>
          {reportsLoading && <p className="mt-2 text-sm text-on-surface-variant">Loading…</p>}
          {loadError && <p className="mt-2 rounded-lg bg-error/10 p-3 text-sm font-semibold text-error">{loadError}</p>}
          {!reportsLoading && !loadError && reports.length === 0 && (
            <p className="mt-2 rounded-xl bg-white p-gutter-sm text-on-surface-variant shadow-soft">
              Nothing recorded yet this season.
            </p>
          )}
          <ul className="mt-3 space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl bg-white p-4 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-on-surface">{r.person || r.title}</p>
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
                  {r.category ? ` · ${r.category}` : ''}
                  {r.location ? ` · ${r.location}` : ''}
                </p>
                {r.summary && <p className="mt-2 line-clamp-3 text-sm text-on-surface-variant">{r.summary}</p>}
                {r.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary underline">
                    Open in Notion <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
