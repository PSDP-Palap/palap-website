import { useState } from "react";

import { useProfileStore } from "@/stores/useProfileStore";
import { useServiceStore } from "@/stores/useServiceStore";
import type { Service, ServiceCategory } from "@/types/service";

type ServiceFormState = Omit<Service, "service_id">;

const emptyForm: ServiceFormState = {
  name: "",
  price: 0,
  category: "SHOPPING",
  pickup_address: "",
  dest_address: ""
};

const AdminDashboard = () => {
  const { profile } = useProfileStore();

  const { services, createService, updateService, deleteService } =
    useServiceStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceFormState>(emptyForm);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "price" ? Number(value) || 0 : value
    }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleEdit = (service: Service) => {
    const { service_id, ...rest } = service;
    setEditingId(service_id);
    setForm(rest);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) return;

    if (editingId) {
      updateService(editingId, form);
    } else {
      createService(form);
    }

    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm("ลบบริการนี้หรือไม่ ?")) {
      deleteService(id);
      if (editingId === id) {
        resetForm();
      }
    }
  };

  const categoryLabel = (category: ServiceCategory) => {
    switch (category) {
      case "DELIVERY":
        return "รับ-ส่ง";
      case "SHOPPING":
        return "ซื้อของ";
      case "CARE":
        return "ดูแล";
      default:
        return category;
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 pt-28 pb-16">
      <div className="container mx-auto px-4 flex flex-col gap-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-gray-600">
              จัดการบริการที่เชื่อมกับหน้าลูกค้า (SERVICE)
            </p>
          </div>

          {profile && (
            <div className="rounded-xl bg-white shadow px-4 py-3 text-right">
              <p className="text-sm text-gray-500">เข้าสู่ระบบในนาม</p>
              <p className="font-semibold">{profile.full_name}</p>
              <p className="text-xs text-gray-500">{profile.email}</p>
            </div>
          )}
        </header>

        <section className="grid md:grid-cols-[2fr,1.3fr] gap-8 items-start">
          <div className="bg-white rounded-xl shadow p-4 md:p-6 overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Services</h2>
              <span className="text-sm text-gray-500">
                ทั้งหมด {services.length} รายการ
              </span>
            </div>

            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-2">ID</th>
                  <th className="text-left py-2 px-2">ชื่อบริการ</th>
                  <th className="text-left py-2 px-2">หมวดหมู่</th>
                  <th className="text-right py-2 px-2">ราคา</th>
                  <th className="text-left py-2 px-2">ต้นทาง</th>
                  <th className="text-left py-2 px-2">ปลายทาง</th>
                  <th className="text-right py-2 px-2">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr
                    key={service.service_id}
                    className="border-b last:border-0 hover:bg-orange-50/40"
                  >
                    <td className="py-2 px-2 align-top text-xs text-gray-500">
                      {service.service_id}
                    </td>
                    <td className="py-2 px-2 align-top font-semibold">
                      {service.name}
                    </td>
                    <td className="py-2 px-2 align-top">
                      {categoryLabel(service.category)}
                    </td>
                    <td className="py-2 px-2 align-top text-right">
                      {service.price.toLocaleString()} ฿
                    </td>
                    <td className="py-2 px-2 align-top max-w-40">
                      <p className="line-clamp-2 text-xs text-gray-700">
                        {service.pickup_address}
                      </p>
                    </td>
                    <td className="py-2 px-2 align-top max-w-40">
                      <p className="line-clamp-2 text-xs text-gray-700">
                        {service.dest_address}
                      </p>
                    </td>
                    <td className="py-2 px-2 align-top text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200"
                        onClick={() => handleEdit(service)}
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 hover:bg-red-200"
                        onClick={() => handleDelete(service.service_id)}
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))}

                {services.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-6 text-center text-gray-400 text-sm"
                    >
                      ยังไม่มีบริการ โปรดเพิ่มบริการใหม่จากแบบฟอร์มด้านขวา
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl shadow p-4 md:p-6 w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {editingId ? "แก้ไขบริการ" : "เพิ่มบริการใหม่"}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-gray-500 underline"
                >
                  ยกเลิกการแก้ไข
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block mb-1 font-medium">ชื่อบริการ</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="เช่น ซื้อของ, รับ-ส่ง, ดูแล"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium">ราคา (บาท)</label>
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2"
                    min={0}
                  />
                </div>

                <div>
                  <label className="block mb-1 font-medium">หมวดหมู่</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="DELIVERY">รับ-ส่ง</option>
                    <option value="SHOPPING">ซื้อของ</option>
                    <option value="CARE">ดูแล</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-medium">
                  ที่อยู่รับสัตว์เลี้ยง
                </label>
                <input
                  type="text"
                  name="pickup_address"
                  value={form.pickup_address}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="เช่น บ้านลูกค้า, คอนโด, จุดนัดรับ"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium">ที่อยู่ปลายทาง</label>
                <input
                  type="text"
                  name="dest_address"
                  value={form.dest_address}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="เช่น โรงพยาบาลสัตว์, ร้านอาบน้ำตัดขน"
                />
              </div>

              <div className="pt-2 flex gap-2 justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600"
                >
                  {editingId ? "บันทึกการแก้ไข" : "เพิ่มบริการ"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
};

export default AdminDashboard;
