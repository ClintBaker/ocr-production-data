import { Mail, HelpCircle, FileText } from 'lucide-react'

export default async function SupportPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Support Center
          </h1>
          <p className="text-lg text-muted-foreground">
            We're here to help you with any questions or issues
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="p-6 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-md bg-primary/10">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Email Support</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Send us an email and we'll get back to you as soon as possible.
            </p>
            <a
              href="mailto:support@jlbcompanies.com"
              className="text-primary hover:text-primary/80 transition-colors font-medium"
            >
              support@jlbcompanies.com
            </a>
          </div>

          <div className="p-6 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-md bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">PDF Upload</h2>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Quick Instructions:</p>
              <ul className="space-y-2 list-disc list-inside">
                <li>Only PDF files are accepted</li>
                <li>You can upload multiple files at once</li>
                <li>Files are processed automatically after upload</li>
                <li>Ensure PDFs contain valid CCF form data</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-md bg-primary/10">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                How do I upload forms?
              </h3>
              <p className="text-muted-foreground">
                Navigate to the Upload page from the main navigation to upload your CCF forms. 
                PDFs are processed automatically after upload.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Who can I contact for technical issues?
              </h3>
              <p className="text-muted-foreground">
                For technical support, please reach out to our support team via email. 
                We're available during business hours to assist you.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Need additional help?{' '}
            <a
              href="mailto:support@jlbcompanies.com"
              className="text-primary hover:text-primary/80 transition-colors font-medium"
            >
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

