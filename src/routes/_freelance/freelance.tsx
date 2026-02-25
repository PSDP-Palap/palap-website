import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_freelance/freelance")({
  component: RouteComponent
});

function RouteComponent() {
  return (
    <div className="pt-24 container mx-auto text-center">
      <h1 className="text-2xl font-bold text-orange-600">
        Freelance Dashboard
      </h1>
      <p className="mt-4 text-gray-600">
        ยินดีต้อนรับ Freelance! คุณสามารถจัดการงานของคุณได้ที่นี่
      </p>

      <div className="mt-8 p-12 border-2 border-dashed border-gray-200 rounded-3xl">
        <p className="text-gray-400">Freelance Features Coming Soon...</p>
      </div>
    </div>
  );
}
