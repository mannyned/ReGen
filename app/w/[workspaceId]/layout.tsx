import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { isWorkspacesEnabledForUser } from '@/lib/feature-flags/workspaces'

interface Props {
  children: React.ReactNode
  params: Promise<{ workspaceId: string }>
}

export default async function WorkspaceLayout({ children, params }: Props) {
  const { workspaceId } = await params

  // Get current user
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if workspaces are enabled for this user
  if (!isWorkspacesEnabledForUser(user.id)) {
    redirect('/dashboard')
  }

  // Verify workspace access
  const membership = await prisma.teamMember.findFirst({
    where: {
      teamId: workspaceId,
      userId: user.id,
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          isDefault: true,
        },
      },
    },
  })

  if (!membership) {
    redirect('/workspaces?error=no_access')
  }

  // WorkspaceProvider is already in root layout, no need to wrap again
  return <>{children}</>
}
