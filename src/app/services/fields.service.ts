/*
  Fields service (Tiếng Việt):
  - Hàm `getFields` cố gọi API `/api/fields`; nếu thất bại sẽ trả về dữ liệu mock
  - Hàm `getFieldById` lấy một sân theo id từ danh sách
*/
export async function getFields() : Promise<any[]> {
  try{
    const res = await fetch('/api/fields');
    if(res.ok){
      const data = await res.json();
      // Map dữ liệu backend thành shape mà UI mong đợi
      return data.map((f: any) => ({
        id: f.id,
        name: f.name,
        description: f.description || '',
        // backend có thể trả về fieldType object hoặc chỉ id
        type: (f.fieldType && f.fieldType.name) || f.fieldTypeId || f.fieldType || 'Không rõ',
        // city có thể không có trong response; cố lấy từ địa chỉ nếu backend cung cấp
        city: f.city || f.addressCity || null,
        // Giá được lưu ở time_slots; nếu backend không trả, để null (UI sẽ hiển thị 'Liên hệ')
        pricePerHour: f.pricePerHour || null,
        images: f.images || [],
        avgRating: f.avgRating !== undefined ? Number(f.avgRating) : null
      }));
    }
  }catch(e){
    // Nếu gọi API thất bại thì dùng dữ liệu giả để giao diện vẫn hoạt động
    console.warn('getFields: cannot fetch from backend, using mock', e);
  }
  // Dữ liệu mock (dùng khi backend chưa có hoặc lỗi mạng)
  return [
    {
      id: 1,
      name: 'Sân A - Cỏ nhân tạo',
      type: '5x5',
      city: 'Hanoi',
      pricePerHour: 150000,
      description: 'Sân cỏ nhân tạo chất lượng cao, hệ thống chiếu sáng, bề mặt êm.',
      images: ['https://images.unsplash.com/photo-1521412644187-c49fa049e84d?w=1200&auto=format&fit=crop&q=60']
    },
    {
      id: 2,
      name: 'Sân B - Cỏ tự nhiên',
      type: '7x7',
      city: 'Hanoi',
      pricePerHour: 200000,
      description: 'Sân cỏ tự nhiên rộng rãi, phù hợp giải đấu nhỏ.',
      images: ['https://images.unsplash.com/photo-1505842465776-3d5d2f6d9d4b?w=1200&auto=format&fit=crop&q=60']
    },
    {
      id: 3,
      name: 'Sân C - Nhà thi đấu',
      type: 'indoor',
      city: 'Hanoi',
      pricePerHour: 250000,
      description: 'Nhà thi đấu hiện đại, mái che, thích hợp khi trời mưa.',
      images: ['https://images.unsplash.com/photo-1521412644187-c49fa049e84d?w=1200&auto=format&fit=crop&q=60']
    }
  ];
}

export async function getFieldById(id: any) {
  try{
    const res = await fetch(`/api/fields/${id}`);
    if(res.ok){
      const f = await res.json();
      return {
        id: f.id,
        name: f.name,
        description: f.description || '',
        type: (f.fieldType && f.fieldType.name) || f.fieldTypeId || f.fieldType || 'Không rõ',
        city: f.city || f.addressCity || null,
        pricePerHour: f.pricePerHour || null,
        images: f.images || [],
        avgRating: f.avgRating !== undefined ? Number(f.avgRating) : null
      };
    }
  }catch(e){
    console.warn('getFieldById: cannot fetch from backend, using fallback', e);
  }
  const fields = await getFields();
  return fields.find(f => String(f.id) === String(id));
}
