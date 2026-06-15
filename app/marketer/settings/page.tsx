import { Topbar } from '@/components/layout/Topbar';
import { EmailSettingsCard } from '@/components/EmailSettingsCard';

export const metadata = { title: 'Settings — WeViral' };

export default function MarketerSettingsPage() {
  return (
    <div className="min-h-screen">
      <Topbar title="Settings" />
      <div className="px-4 md:px-8 py-6 md:py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-[#0B0B0C]">Settings</h1>
          <p className="mt-1 text-sm text-[#8C8C88]">
            Manage your notification preferences and account settings.
          </p>
        </div>
        <EmailSettingsCard role="marketer" />
      </div>
    </div>
  );
}
