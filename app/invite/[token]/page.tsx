export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  return (
    <div className="flex h-svh items-center justify-center">
      <div className="w-full max-w-md space-y-4 px-4">
        <h1 className="text-2xl font-semibold">You&apos;ve been invited</h1>
        <p className="text-muted-foreground text-sm">
          Accept your invite to join a PracticeLab team.
        </p>
        <p className="font-mono text-xs opacity-50">{token}</p>
      </div>
    </div>
  )
}
