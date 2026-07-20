import { InvitationView } from './invitation-view';

import { AuthShell } from '@/components/auth-shell';

export const metadata = { title: 'Invitación — ContaIA' };

export default function InvitationPage(): React.JSX.Element {
  return (
    <AuthShell title="Invitación a una Empresa">
      <InvitationView />
    </AuthShell>
  );
}
