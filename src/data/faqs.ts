/**
 * Frequently asked questions, grouped by category.
 */
import { links } from './about'

export interface FaqItem {
  q: string
  a: string
  /** Optional "go here" link, rendered beneath the answer. */
  link?: { label: string; href: string }
}

export interface FaqCategory {
  category: string
  items: FaqItem[]
}

export const faqs: FaqCategory[] = [
  {
    category: 'Registration',
    items: [
      {
        q: 'Are registrations open?',
        a: 'Yes \u2014 registrations for the 2026/27 season are open now. Register through the GameDay form linked from any Register button on this site.',
      },
      {
        q: 'What does it cost?',
        a: 'Grades 3\u20136 are $50, Grades 7\u201314 are $100, and Grades 15+ start at $100 depending on membership type. The season fee covers both Term 4 and Term 1.',
      },
      {
        q: 'Is there a limit on numbers?',
        a: 'Yes, for our junior grades. Grades 3 & 4 are capped at 10 per age group and Grades 5 & 6 at 20 per age group. These caps can increase if more adults volunteer to help on club nights \u2014 no athletics experience is needed, our Get Set Go sessions are planned for you with equipment ready and plenty of support. Junior grades fill quickly and there is no waitlist once a grade is full, so get in early.',
      },
      {
        q: 'Do you hold an open day for children to give Athletics a go?',
        a: 'No, this is something that we used to do however due to the higher number of children wanting to take part in athletics we no longer run an open day.',
      },
      {
        q: 'Can I register my child and then if they don\u2019t like it can I get a refund?',
        a: 'No, we do not give refunds if you or your child changes their mind. Once you have registered you have the right to attend all season. We advise that if your child decides they no longer want to take part, give them a break for a couple of weeks and then come back again for another go.',
      },
      {
        q: 'My child has a birthday during the season, what age group will they be in?',
        a: 'Your child will be in the age group for the age they will be at the 31 December that year. Example: Sally is currently 4 years old and has a birthday (turning 5) on 4th January. Sally will be in the 4 years age group.',
      },
    ],
  },
  {
    category: 'Club Nights',
    items: [
      {
        q: 'My child is aged 3-6, can I leave them with you and watch from the stands / go for a walk?',
        a: 'Our Club Nights are run with the help of dedicated volunteers, and this is especially important for our junior athletes. Parental supervision is essential for this age group, and we kindly ask that parents assist our coaches where possible. We encourage parents to stay engaged during each rotation, offering support in ensuring that the children remain focused and that everyone has an enjoyable experience.',
      },
      {
        q: 'Do you need my help to run club nights?',
        a: 'Yes please, we welcome any parental support that can be offered - this is especially important when we are holding our recording nights. We will ask those parents that are supporting their children from the grandstand when we need help - so don\u2019t be shy!',
      },
      {
        q: 'What will my child be doing at Club Nights?',
        a: 'All information relating to how we run our Club Nights can be found on the Club Nights page.',
      },
      {
        q: 'Can my child only attend the Development Squad night?',
        a: 'The Development Squad is for athletes aged 10+ (and is also open to teen and masters athletes) and is an add-on to Club Nights. It is recommended that all children attend Club Night as the first priority. The expectation for children that attend Development Squad is that they are training for external competitions like Ribbon Days, Colgate Games, Children Champs, Interschools etc.',
      },
    ],
  },
  {
    category: 'External Events',
    items: [
      {
        q: 'Does it cost anything to attend a Ribbon Day?',
        a: 'No, Ribbon Days are free! Ribbon Day events are a great extension of what the athlete learns at Club Nights. Please see our Events page for more info on Ribbon Days.',
      },
      {
        q: 'How do I buy a singlet for my child to compete in external events like Ribbon Days?',
        a: 'Club singlets are ordered direct from Code Sport. Club singlets are compulsory for all external events. Age flashes are free from the check-in desk on club night.',
        link: { label: 'Order a club singlet from Code Sport', href: links.codesport },
      },
      {
        q: 'Do I need to register in advance for a Ribbon Day?',
        a: 'No, Ribbon Days are pretty casual when it comes to attendance. You can show up on the day and compete. Each club will post information on their Facebook pages or Website as to how the day will run, so please ensure you follow these pages.',
      },
      {
        q: 'My child is competing at an external event, do they need to wear anything special?',
        a: 'Yes, all children are to wear the following: club singlet, age flash sewn onto the top left hand side of the singlet (available free from the desk at Club Nights), and black shorts. This is compulsory and if your child is not wearing the required uniform they will not be able to compete.',
      },
    ],
  },
]
