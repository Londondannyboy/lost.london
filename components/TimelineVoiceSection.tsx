'use client'

import { CategoryVoiceWidget } from './CategoryVoiceWidget'

interface TimelineVoiceSectionProps {
  era: string
  eraInfo: {
    years: string
    description: string
  }
  articles: Array<{
    title: string
    excerpt: string
  }>
}

export function TimelineVoiceSection({ era, eraInfo, articles }: TimelineVoiceSectionProps) {
  return (
    <CategoryVoiceWidget
      category={{
        name: `${era} London`,
        description: `${eraInfo.years}. ${eraInfo.description}`,
        articles: articles
      }}
    />
  )
}
