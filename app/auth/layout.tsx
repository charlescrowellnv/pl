import BigText from "@/components/big-text"
import Link from "next/link"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="border-b">
        <div className="mx-auto flex h-11 w-full max-w-5xl items-center justify-between border-l border-r px-4">
          <Link href="/" className="text-sm font-normal tracking-tight">
            practiceLab
          </Link>
          <span className="text-sm font-light text-muted-foreground">v0.1</span>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <div className="mx-auto grid h-full w-full max-w-5xl border-l border-r md:grid-cols-2">
          <div className="flex flex-col justify-center border-b p-8 md:border-b-0 md:border-r">
            {children}
          </div>
          <div className="hidden flex-col justify-end p-8 md:flex">
            <p className="max-w-[28ch] text-sm font-light leading-relaxed text-muted-foreground">
              Practice the hard conversations before they happen.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-5xl overflow-hidden border-l border-r">
          <div className="select-none opacity-[0.07]">
            <BigText text="practiceLab" />
          </div>
        </div>
      </footer>
    </div>
  )
}
