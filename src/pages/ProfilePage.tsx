import { ProfileSections, ALL_SECTIONS } from '@/components/ProfileSections';

export default function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <h1 className="text-2xl md:text-3xl font-bold text-[#10213f] mb-6">My Profile</h1>
      <ProfileSections sections={ALL_SECTIONS} />
    </div>
  );
}
