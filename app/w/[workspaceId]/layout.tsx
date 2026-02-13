import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { WorkspaceProvider } from '@/app/context/WorkspaceContext'
import { isWorkspacesEnabledForUser } from '@/lib/feature-flags/workspaces'
import type { TeamRole } from '@prisma/client'

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

  return (
    <WorkspaceProvider
      initialWorkspaceId={workspaceId}
      initialWorkspaceName={membership.team.name}
      initialRole={membership.role as 'OWNER' | 'ADMIN' | 'MEMBER'}
    >
      {children}
    </WorkspaceProvider>
  )
}
