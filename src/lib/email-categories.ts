export const EMAIL_CATEGORIES = {
  IMPORTANT: {
    label: 'Important',
    color: 'red',
    description: 'Critical emails requiring immediate attention, urgent matters, deadlines'
  },
  OPPORTUNITY: {
    label: 'New Opportunity',
    color: 'green',
    description: 'Business opportunities, potential deals, partnership proposals, job offers'
  },
  SALES: {
    label: 'Sales & Marketing',
    color: 'blue',
    description: 'Sales pitches, marketing emails, promotional content, newsletters'
  },
  PERSONAL: {
    label: 'Personal',
    color: 'purple',
    description: 'Personal communications, family, friends, casual conversations'
  },
  INFORMATIONAL: {
    label: 'Informational',
    color: 'yellow',
    description: 'Updates, notifications, receipts, confirmations, general information'
  },
  SPAM: {
    label: 'Low Priority',
    color: 'gray',
    description: 'Spam, unwanted emails, automated messages, low-value content'
  }
} as const

export type EmailCategory = keyof typeof EMAIL_CATEGORIES

