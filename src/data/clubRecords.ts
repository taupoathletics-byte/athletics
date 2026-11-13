/**
 * Taupō Athletics Club Records — the best mark ever set at club nights, per
 * event, grade and gender. Transcribed from "Club Records as at end of 2024/25
 * season" (public/club-records-2025.pdf, March 2025). Name typos on the sheet
 * were corrected with the club (Knox Short, Ben Matthews, Kaiah Bosshart,
 * Lukas Haver, Mackenzie Meihana).
 *
 * These are the club's published records (they were on the old website). They
 * are NOT the club-night measurements logged this season, which are private:
 * families see their own children's results with their access code.
 *
 * `mark` is copied from the sheet; `display` normalises it (the sheet mixes
 * "00:09:14" and "00:09.14" for 9.14 seconds). Ties list every athlete.
 * To add a new record, edit the row for that grade and gender.
 */
export interface ClubRecord {
  grade: number
  gender: 'F' | 'M'
  names: string[]
  /** As written on the sheet, e.g. "16-Mar-23"; one per name when they differ. */
  dates: string[]
  mark: string
}

export interface RecordEvent {
  event: string
  unit: 'time' | 'distance' | 'height'
  rows: ClubRecord[]
}

export const clubRecordsAsAt = 'end of the 2024/25 season'

const r = (grade: number, gender: 'F' | 'M', names: string | string[], dates: string | string[], mark: string): ClubRecord => ({
  grade,
  gender,
  names: Array.isArray(names) ? names : [names],
  dates: Array.isArray(dates) ? dates : [dates],
  mark,
})

export const clubRecords: RecordEvent[] = [
  {
    event: '60m',
    unit: 'time',
    rows: [
      r(7, 'F', 'Mackenzie Meihana', '16-Mar-23', '00:10.73'),
      r(7, 'M', ['Ezra Short', 'Oliver Monteith'], '15-Feb-24', '00:10.39'),
      r(8, 'F', 'Te Rerewai Meihana', '25-Mar-21', '00:09:14'),
      r(8, 'M', 'Lachlan Putt', '15-Feb-24', '00:09.04'),
      r(9, 'F', 'Jessica Rakei', '15-Feb-24', '00:09:91'),
      r(9, 'M', 'Knox Short', '07-Nov-24', '00:08.84'),
      r(10, 'F', 'Te Rerewai Meihana', '16-Mar-23', '00:08.51'),
      r(10, 'M', 'James Elmiger', '16-Mar-23', '00:09.67'),
      r(11, 'F', 'Kaiah Bosshart', '16-Mar-23', '00:10.09'),
      r(11, 'M', 'Jack White', '16-Mar-23', '00:10.43'),
      r(12, 'F', 'Finja Niehues', '16-Mar-23', '00:09.33'),
      r(12, 'M', 'Charlie McCormack', '16-Mar-23', '00:08.64'),
      r(13, 'F', 'Chloe McCallum', '16-Mar-23', '00:09.51'),
    ],
  },
  {
    event: '100m',
    unit: 'time',
    rows: [
      r(7, 'F', 'Mackenzie Meihana', '2-Mar-23', '00:15.0'),
      r(7, 'M', 'Te Kohu Meihana', '13-Feb-25', '00:17:12'),
      r(8, 'F', 'Te Rerewai Meihana', '18-Feb-21', '00:15:59'),
      r(8, 'M', 'Lukas Haver', '18-Feb-21', '00:15.63'),
      r(9, 'F', 'Mackenzie Meihana', '13-Feb-25', '00:15.14'),
      r(9, 'M', 'Lachlan Putt', '13-Feb-25', '00:14.4'),
      r(10, 'F', 'Seraphina Roberts', '2-Nov-23', '00:14.8'),
      r(10, 'M', 'Jayden Comber', '2-Nov-23', '00:14.7'),
      r(11, 'F', 'Te Rerewai Meihana', '2-Nov-23', '00:14.2'),
      r(11, 'M', 'Ben Matthews', '2-Nov-23', '00:14.4'),
      r(12, 'F', ['Evie Porteous', 'Isa Green'], '2-Mar-23', '00:13.9'),
      r(12, 'M', 'Charlie McCormack', '2-Mar-23', '00:14.3'),
      r(13, 'F', 'Kamaia Minhinnick', '18-Feb-21', '00:13.71'),
      r(13, 'M', 'Austin Pask', '07-Nov-24', '00:13.18'),
      r(14, 'F', 'Maddie Wroe', '02-Dec-20', '00:15:4'),
      r(14, 'M', 'Elias Drinnan', '18-Feb-21', '00:14:08'),
    ],
  },
  {
    event: '200m',
    unit: 'time',
    rows: [
      r(7, 'F', 'Mackenzie Meihana', '01-Dec-22', '00:39:8'),
      r(7, 'M', 'Te Kohu Meihana', '20-Feb-25', '00:38:0'),
      r(8, 'F', 'Te Rerewai Meihana', '11-Feb-21', '00:34:72'),
      r(8, 'M', 'Knox Short', '07-Dec-23', '00:34:87'),
      r(9, 'F', 'Mackenzie Meihana', '20-Feb-25', '00:34:54'),
      r(9, 'M', 'Knox Short', '20-Feb-25', '00:34:40'),
      r(10, 'F', 'Te Rerewai Meihana', '01-Dec-22', '00:32:8'),
      r(10, 'M', 'Johnny Wills', '20-Feb-25', '00:33:11'),
      r(11, 'F', 'Te Rerewai Meihana', '07-Dec-23', '00:31:13'),
      r(11, 'M', 'Ben Matthews', '07-Dec-23', '00:32:20'),
      r(12, 'F', 'Te Rerewai Meihana', '20-Feb-25', '00:29:80'),
      r(12, 'M', 'Max McGregor-Lynn', '20-Feb-25', '00:32:82'),
      r(13, 'F', 'Kelsey Keys', '20-Feb-25', '00:32:31'),
      r(13, 'M', 'Austin Pask', '20-Feb-25', '00:27:83'),
      r(14, 'M', 'Elias Drinnan', '25-Mar-21', '00:28:00'),
    ],
  },
  {
    event: '400m',
    unit: 'time',
    rows: [
      r(7, 'F', 'Mackenzie Meihana', '10-Nov-22', '01:28:41'),
      r(7, 'M', 'David Haver', '25-Feb-21', '01:30.28'),
      r(8, 'F', 'Te Rerewai Meihana', '10-Dec-20', '01:22:24'),
      r(8, 'M', 'Lukas Haver', '25-Feb-21', '01:22:27'),
      r(9, 'F', 'Te Rerewai Meihana', '17-Feb-22', '01:19:3'),
      r(9, 'M', 'Knox Short', '27-Mar-25', '01:15:61'),
      r(10, 'F', 'Te Rerewai Meihana', '10-Nov-22', '01:16:47'),
      r(10, 'M', 'Connor White', '27-Mar-25', '01:23:12'),
      r(11, 'F', 'Te Rerewai Meihana', '23-Nov-23', '01:11:94'),
      r(11, 'M', 'Ben Matthews', '23-Nov-23', '01:21:01'),
      r(12, 'F', 'Te Rerewai Meihana', '27-Mar-25', '01:16:67'),
      r(12, 'M', 'Charlie McCormack', '10-Nov-22', '01.14.10'),
      r(13, 'F', 'Kaiah Bosshart', '27-Mar-25', '01:24:90'),
      r(13, 'M', 'Zander Van den Berg', '23-Nov-23', '01:10:45'),
      r(14, 'F', 'Maddie Wroe', '25-Feb-21', '01:17:03'),
      r(14, 'M', 'Elias Drinnan', '25-Feb-21', '01:04:47'),
    ],
  },
  {
    event: '800m',
    unit: 'time',
    rows: [
      r(7, 'F', 'Mackenzie Meihana', '09-Mar-23', '03:20:88'),
      r(7, 'M', 'Zane Pritchard', '14-Mar-24', '03:11:00'),
      r(8, 'F', 'Mackenzie Meihana', '14-Mar-24', '03:27:00'),
      r(8, 'M', 'Lachlan Putt', '14-Mar-24', '03:00:00'),
      r(9, 'F', 'Mackenzie Meihana', '05-Dec-24', '03:15:07'),
      r(9, 'M', 'Knox Short', '05-Dec-24', '02:56:91'),
      r(10, 'F', 'Te Rerewai Meihana', '09-Mar-23', '02:48:88'),
      r(10, 'M', 'Connor White', '05-Dec-24', '03:05:00'),
      r(11, 'F', 'Te Rerewai Meihana', '14-Mar-24', '02:43:00'),
      r(11, 'M', 'Emmett Bond', '05-Dec-24', '03:02:00'),
      r(12, 'F', 'Te Rerewai Meihana', '05-Dec-24', '02:44:00'),
      r(12, 'M', 'Lukas Haver', '05-Dec-24', '02:54:00'),
      r(13, 'F', 'Kelsey Keys', '05-Dec-24', '02:59:00'),
      r(13, 'M', 'Austin Pask', '05-Dec-24', '02:51:00'),
      r(14, 'F', 'Ashlee Partelow', '25-Feb-21', '03:02:20'),
      r(14, 'M', 'Elias Drinnan', '25-Feb-21', '02:44:24'),
    ],
  },
  {
    event: '1500m',
    unit: 'time',
    rows: [
      r(10, 'F', 'Kiara Bullock', '28-Mar-24', '06:13:28'),
      r(10, 'M', 'Thomas Drake', '24-Nov-22', '06:42'),
      r(11, 'F', 'Te Rerewai Meihana', '28-Mar-24', '05:48:89'),
      r(11, 'M', 'David Haver', '13-Feb-25', '05:38:61'),
      r(12, 'F', 'Te Rerewai Meihana', '13-Feb-25', '05:53:30'),
      r(12, 'M', 'Lukas Haver', '13-Feb-25', '05:42:27'),
      r(13, 'F', 'Kelsey Keys', '13-Feb-25', '06:04:01'),
      r(13, 'M', 'Austin Pask', '13-Feb-25', '05:36:72'),
    ],
  },
  {
    event: 'Long Jump',
    unit: 'distance',
    rows: [
      r(7, 'F', 'Mackenzie Meihana', '09-Mar-23', '3.4'),
      r(7, 'M', 'Te Kohu Meihana', '27-Feb-25', '2.98'),
      r(8, 'F', 'Te Rerewai Meihana', '25-Feb-21', '3.49'),
      r(8, 'M', 'Knox Short', '16-Nov-23', '3.42'),
      r(9, 'F', 'Mackenzie Meihana', '27-Feb-25', '3.42'),
      r(9, 'M', 'Knox Short', '27-Feb-25', '3.75'),
      r(10, 'F', 'Te Rerewai Meihana', '09-Mar-23', '4.15'),
      r(10, 'M', 'Ryder Stratford', '02-Dec-20', '3.77'),
      r(11, 'F', 'Te Rerewai Meihana', '16-Nov-23', '4.10'),
      r(11, 'M', 'Dante Minhinnick', '25-Feb-21', '4.71'),
      r(12, 'F', 'Te Rerewai Meihana', '27-Feb-25', '4.56'),
      r(12, 'M', 'Max McGregor-Lynn', '27-Feb-25', '4.07'),
      r(13, 'F', 'Kamaia Minhinnick', '02-Dec-20', '4.26'),
      r(13, 'M', 'Zander Van den Berg', '16-Nov-23', '4.46'),
      r(14, 'F', 'Ashlee Partelow', '25-Feb-21', '3.58'),
      r(14, 'M', 'Elias Drinnan', '25-Feb-21', '4.35'),
    ],
  },
  {
    event: 'High Jump',
    unit: 'height',
    rows: [
      r(7, 'F', 'Mackenzie Meihana', '02-Mar-23', '0.89'),
      r(7, 'M', 'Knox Short', '02-Mar-23', '1.08'),
      r(8, 'F', 'Tea Bosshart', '02-Mar-23', '1.10'),
      r(8, 'M', 'Knox Short', '07-Mar-24', '1.15'),
      r(9, 'F', 'Jessica Rakei', '07-Mar-24', '1.10'),
      r(9, 'M', 'Lachlan Putt', '28-Nov-24', '1.15'),
      r(10, 'F', 'Te Rerewai Meihana', '02-Mar-23', '1.16'),
      r(10, 'M', 'Nathan Powell', '20-Feb-25', '1.15'),
      r(11, 'F', 'Te Rerewai Meihana', '07-Mar-24', '1.32'),
      r(11, 'M', 'Dante Minhinnick', '11-Feb-21', '1.30'),
      r(12, 'F', 'Te Rerewai Meihana', '28-Nov-24', '1.34'),
      r(12, 'M', ['Charlie McCormack', 'Nathaniel McCormack'], ['02-Mar-23', '02-Mar-23'], '1.22'),
      r(13, 'F', 'Finja Niehues', '07-Mar-24', '1.23'),
      r(13, 'M', 'Austin Pask', '28-Nov-24', '1.40'),
      r(14, 'F', 'Charlotte White', '07-Mar-24', '0.98'),
      r(14, 'M', 'Elias Drinnan', '11-Feb-21', '1.50'),
    ],
  },
  {
    event: 'Shot Put',
    unit: 'distance',
    rows: [
      r(7, 'F', 'Mackenzie Meihana', '02-Mar-23', '5.8'),
      r(7, 'M', 'Leo Smith', '02-Mar-23', '7.7'),
      r(8, 'F', 'Jessica Rakei', '02-Mar-23', '5.38'),
      r(8, 'M', 'Dylan Fullwood', '30-Nov-23', '5.42'),
      r(9, 'F', 'Mackenzie Meihana', '02-Mar-23', '6.11'),
      r(9, 'M', 'Knox Short', '02-Mar-23', '8.07'),
      r(10, 'F', 'Te Rerewai Meihana', '02-Mar-23', '6.5'),
      r(10, 'M', 'Max Peirce', '05-Dec-24', '7.05'),
      r(11, 'F', 'Te Rerewai Meihana', '30-Nov-23', '6.46'),
      r(11, 'M', 'Dante Minhinnick', '10-Dec-20', '10.9'),
      r(12, 'F', 'Te Rerewai Meihana', '05-Dec-24', '6.29'),
      r(12, 'M', 'Lukas Haver', '05-Dec-24', '6.94'),
      r(13, 'F', 'Kamaia Minhinnick', '10-Dec-20', '9.91'),
      r(13, 'M', 'Kaden Christie', '10-Dec-20', '7.14'),
      r(14, 'F', 'Maddie Wroe', '10-Dec-20', '5.41'),
      r(14, 'M', 'Elias Drinnan', '10-Dec-20', '6.32'),
    ],
  },
  {
    // The sheet heads this table "Discuss".
    event: 'Discus',
    unit: 'distance',
    rows: [
      r(7, 'F', 'Mackenzie Meihana', '09-Feb-23', '9.62'),
      r(7, 'M', 'Leo Smith', '09-Feb-23', '12.26'),
      r(8, 'F', 'Te Rerewai Meihana', '04-Feb-21', '14.21'),
      r(8, 'M', 'Dylan Fullwood', '11-Nov-23', '14.45'),
      r(9, 'F', 'Mackenzie Meihana', '06-Mar-25', '15.59'),
      r(9, 'M', 'Dylan Fullwood', '06-Mar-25', '20.96'),
      r(10, 'F', 'Jessica Rakei', '06-Mar-25', '17.79'),
      r(10, 'M', 'Benji Farrar', '09-Feb-23', '14.9'),
      r(11, 'F', 'Mikayla Blackbourn', '06-Mar-25', '15.5'),
      r(11, 'M', 'Dante Minhinnick', '17-Feb-22', '22.73'),
      r(12, 'F', 'Te Rerewai Meihana', '06-Mar-25', '24.39'),
      r(12, 'M', 'Lukas Haver', '06-Mar-25', '20.92'),
      r(13, 'F', 'Chloe McCallum', '09-Feb-23', '12.63'),
      r(13, 'M', 'Austin Pask', '06-Mar-25', '16.81'),
      r(14, 'F', 'Ashlee Partelow', '04-Feb-21', '14.78'),
      r(14, 'M', 'Elias Drinnan', '25-Mar-21', '13.78'),
    ],
  },
]

/**
 * A mark as people read it: "9.14s", "1:28.41", "4.56m".
 * Sheet times are "mm:ss.hh" but often use ":" before the hundredths too
 * ("00:09:14"), and one uses "." throughout ("01.14.10").
 */
export function displayMark(mark: string, unit: RecordEvent['unit']): string {
  if (unit !== 'time') return `${mark}m`
  const parts = mark.split(/[:.]/)
  const [min, sec, frac] = parts.length === 2 ? [parts[0], parts[1], ''] : parts
  const m = Number(min)
  const tail = frac ? `.${frac}` : ''
  return m === 0 ? `${Number(sec)}${tail}s` : `${m}:${sec.padStart(2, '0')}${tail}`
}

/** "16-Mar-23" → "16 Mar 2023". */
export function displayDate(d: string): string {
  const [day, mon, yy] = d.split('-')
  return `${Number(day)} ${mon} 20${yy}`
}
