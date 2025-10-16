import { EmailLabelsConfig } from "@/components/email-labels-config"

export default function TagsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="px-4 lg:px-6">
          <EmailLabelsConfig />
        </div>
      </div>
    </div>
  )
}

