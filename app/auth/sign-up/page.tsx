import { SignUpForm } from "@/components/auth/sign-up-form"

export default function Page() {
  return (
    <>
      <div className="mb-8 flex flex-col gap-1">
        <p className="text-xs font-light uppercase tracking-[0.2em] text-muted-foreground">
          Get Started
        </p>
        <h1 className="text-3xl font-light tracking-tight">Create an account.</h1>
      </div>
      <SignUpForm />
    </>
  )
}
