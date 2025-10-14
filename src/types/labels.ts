export interface LabelConfig {
  id: string
  name: string
  color: string
  enabled: boolean
  isCustom: boolean
}

export interface CustomizationRules {
  includeSenders?: string[]
  excludeSenders?: string[]
  includeDomains?: string[]
  includeSubjectKeywords?: string[]
  excludeSubjectKeywords?: string[]
  customInstructions?: string
}

export type LabelsRecord = Record<string, LabelConfig>
export type CustomizationRecord = Record<string, CustomizationRules>



