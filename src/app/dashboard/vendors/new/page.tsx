import { ActionForm } from "@/components/action-form";
import { createVendor } from "../actions";

const inputClass = "rounded border border-gray-300 px-3 py-2 font-normal";

export default function NewVendorPage() {
  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Add vendor</h1>
        <p className="text-sm text-gray-600">
          Risk is tiered per engagement: each service or relationship with the vendor is assessed
          on its own.
        </p>
      </div>

      <ActionForm action={createVendor} submitLabel="Add vendor" className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Vendor name
          <input name="name" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Website
          <input name="website" type="url" placeholder="https://" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          First service or engagement
          <input
            name="engagement_name"
            required
            placeholder="e.g. Payroll processing, Cloud hosting, Customer support"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          What the vendor does for us
          <textarea
            name="engagement_description"
            rows={3}
            placeholder="e.g. Runs bi-weekly payroll for all US employees; receives SSNs and bank details via SFTP; no access to our network."
            className={inputClass}
          />
          <span className="text-xs font-normal text-gray-500">
            Optional. Note the data it handles and the systems it can access, so reviewers have
            context when confirming the tier.
          </span>
        </label>
      </ActionForm>
    </div>
  );
}
