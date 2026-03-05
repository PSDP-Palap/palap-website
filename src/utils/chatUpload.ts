import supabase  from "@/utils/supabase";

/**
 * ฟังก์ชันสำหรับอัปโหลดรูปภาพเข้า Supabase Storage
 * และส่ง URL กลับไปให้คุณนำไปบันทึกลงฐานข้อมูล
 */
export const uploadChatImage = async (
  file: File, 
  roomId: string
): Promise<string> => {
  // 1. สร้าง Path ของไฟล์ (เก็บตาม roomId เพื่อความเป็นระเบียบ)
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `${roomId}/${fileName}`;

  // 2. อัปโหลดไฟล์ไปยัง Bucket ที่ชื่อ 'chat-images'
  const { error: uploadError } = await supabase.storage
    .from("chat-images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // 3. ดึง Public URL ของไฟล์
  const { data } = supabase.storage
    .from("chat-images")
    .getPublicUrl(filePath);

  return data.publicUrl;
};