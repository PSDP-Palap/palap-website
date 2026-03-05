import { Link } from "@tanstack/react-router";
import type { Profile } from "@/types/user";
import type { Session } from "@supabase/supabase-js";

interface AccountSettingTabProps {
  profile: Profile | null;
  session: Session | null;
}

const AccountSettingTab = ({ profile, session }: AccountSettingTabProps) => {
  return (
    <div className="bg-white rounded-xl border border-orange-100 p-4 shadow-sm space-y-4">
      <h2 className="text-xl font-black text-[#4A2600]">Account Setting</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-orange-50 border border-orange-100 p-3">
          <p className="text-xs text-gray-500 uppercase">Full Name</p>
          <p className="font-bold text-[#4A2600]">
            {profile?.full_name || "Not set"}
          </p>
        </div>
        <div className="rounded-lg bg-orange-50 border border-orange-100 p-3">
          <p className="text-xs text-gray-500 uppercase">Email</p>
          <p className="font-bold text-[#4A2600]">
            {profile?.email || session?.user?.email || "Not set"}
          </p>
        </div>
        <div className="rounded-lg bg-orange-50 border border-orange-100 p-3">
          <p className="text-xs text-gray-500 uppercase">Phone</p>
          <p className="font-bold text-[#4A2600]">
            {profile?.phone_number || "Not set"}
          </p>
        </div>
        <div className="rounded-lg bg-orange-50 border border-orange-100 p-3">
          <p className="text-xs text-gray-500 uppercase">Role</p>
          <p className="font-bold text-[#4A2600]">
            {profile?.role || "freelance"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          to="/profile"
          className="px-4 py-2 rounded-md bg-[#A03F00] text-white text-sm font-black"
        >
          View Profile
        </Link>
        <Link
          to="/edit-profile"
          className="px-4 py-2 rounded-md bg-white border border-orange-200 text-[#A03F00] text-sm font-black"
        >
          Edit Profile
        </Link>
      </div>
    </div>
  );
};

export default AccountSettingTab;
