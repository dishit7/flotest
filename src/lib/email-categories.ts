export const EMAIL_CATEGORIES = {
  TO_RESPOND: {
    label: '1: to respond',
    color: 'red',
    gmailColor: { backgroundColor: '#fb4c2f', textColor: '#ffffff' },
    description: 'Emails requiring your response or action'
  },
  FYI: {
    label: '2: FYI',
    color: 'orange',
    gmailColor: { backgroundColor: '#f691b2', textColor: '#ffffff' },
    description: 'Informational emails for your awareness, no action needed'
  },
  COMMENT: {
    label: '3: comment',
    color: 'yellow',
    gmailColor: { backgroundColor: '#fad165', textColor: '#000000' },
    description: 'Emails with comments, feedback, or discussion threads'
  },
  NOTIFICATION: {
    label: '4: notification',
    color: 'green',
    gmailColor: { backgroundColor: '#16a765', textColor: '#ffffff' },
    description: 'System notifications, automated alerts, updates'
  },
  MEETING_UPDATE: {
    label: '5: meeting update',
    color: 'blue',
    gmailColor: { backgroundColor: '#4a86e8', textColor: '#ffffff' },
    description: 'Meeting invitations, calendar updates, schedule changes'
  },
  AWAITING_REPLY: {
    label: '6: awaiting reply',
    color: 'purple',
    gmailColor: { backgroundColor: '#a479e2', textColor: '#ffffff' },
    description: 'Emails where you are waiting for a response from others'
  },
  ACTIONED: {
    label: '7: actioned',
    color: 'purple',
    gmailColor: { backgroundColor: '#b99aff', textColor: '#000000' },
    description: 'Emails that have been completed or resolved'
  },
  MARKETING: {
    label: '8: marketing',
    color: 'gray',
    gmailColor: { backgroundColor: '#8e8e8e', textColor: '#ffffff' },
    description: 'Marketing emails, promotional content, newsletters'
  }
} as const

export type EmailCategory = keyof typeof EMAIL_CATEGORIES

