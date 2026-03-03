import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/service/")({
  component: ServiceDashboardPlaceholder,
});

function ServiceDashboardPlaceholder() {
  return (
    <div className="min-h-screen bg-[#F9E6D8] pt-24 pb-10">
      <main className="max-w-5xl mx-auto px-4">
        <div className="bg-[#FF914D] rounded-xl px-6 py-5 mb-4 text-white">
          <h1 className="text-3xl font-black uppercase">Service Dashboard</h1>
          <p className="text-sm text-white/90 font-semibold">Freelancer job posting will be available here soon</p>
        </div>

        <section className="bg-white rounded-xl border border-orange-100 shadow-sm p-6">
          <h2 className="text-xl font-black text-[#4A2600] mb-2">Coming Soon</h2>
          <p className="text-sm text-gray-600 mb-6">
            This page is reserved for customers to post service jobs and for freelancers to browse and accept them.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/product"
              className="px-5 py-2.5 rounded-lg bg-[#D35400] text-white font-bold hover:bg-[#b34700]"
            >
              Go to Product
            </Link>
            <Link
              to="/"
              className="px-5 py-2.5 rounded-lg bg-gray-100 text-gray-700 font-bold hover:bg-gray-200"
            >
              Back Home
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
