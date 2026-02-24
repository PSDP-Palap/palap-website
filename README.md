# 🐾 Palap

### 🛠 Tech Stack

- **Frontend:** React
- **Routing:** TanStack Router
- **Data Fetching:** TanStack Query
- **Backend/Auth:** Supabase

---

## 🚀 Getting Started (วิธีการ Setup)

### 1. ติดตั้ง Bun

ถ้ายังไม่มี Bun ในเครื่อง ให้ติดตั้งก่อน:

**สำหรับ Windows (PowerShell):**

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

**สำหรับ Unix (shell):**

```sh
curl -fsSL https://bun.sh/install | bash
```

### Clone โปรเจค (หากใช้ Github Desktop ให้ข้ามขั้นตอนนี้)

```sh
git clone [https://github.com/your-username/palap-website.git](https://github.com/your-username/palap-website.git)

cd palap-website
```

### ติดตั้ง Library ต่างๆ ด้วย Bun

ใน root ของโปรเจคเปิด terminal ขึ้นมาแล้วรัน

```sh
bun install
```

### Setup Environment Variables (.env)

```sh
cp .env.example .env
```

เปิดไฟล์ `.env` และกรอกข้อมูล API Key ที่ได้จาก [Supabase Dashboard](https://supabase.com/dashboard) (Project Settings > API Keys)

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
```

### 💻 Development

```sh
bun dev
```
