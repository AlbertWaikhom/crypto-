import { PortalShell } from '../../components/PortalShell';

export default function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalShell>{children}</PortalShell>;
}

