import Image from 'next/image'

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} CCF Portal. All rights reserved.</p>
          </div>
          <div className="flex items-center">
            <Image
              src="/jlb-logo.png"
              alt="JLB Logo"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
          </div>
        </div>
      </div>
    </footer>
  )
}

