import { UpdatePasswordForm } from "@/components/auth/update-password-form"

export default function Page() {
  return (
    <>
      <div className="mb-8 flex flex-col gap-1">
        <p className="text-xs font-light uppercase tracking-[0.2em] text-muted-foreground">
          Account Recovery
        </p>
        <h1 className="text-3xl font-light tracking-tight">Choose a new password.</h1>
      </div>
      <UpdatePasswordForm />
    </>
  )
}
