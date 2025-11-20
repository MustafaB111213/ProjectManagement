// API tabanı, ortam değişkeni üzerinden yapılandırılabilir.
// Geliştirme sırasında Vite proxy'si ile aynı origin'den istek atmak için
// varsayılan olarak "/api" yolunu kullanır.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
// --- Zoom Adımları ---
// Her adımda gün genişliğini tanımla (daha fazla adım eklenebilir)
export const ZOOM_STEPS = [
    // --- "Ay" Seviyesi (TimelineHeader "Yıl > Ay" gösterir) ---
    { level: 'month', dayWidth: 2 },  // Index 0: En uzak (Yıl görünümü)
    { level: 'month', dayWidth: 4 },  // Index 1
    { level: 'month', dayWidth: 7 },  // Index 2
    { level: 'month', dayWidth: 10 },  // Index 3

    // --- "Hafta" Seviyesi (TimelineHeader "Ay > Hafta" gösterir) ---
    { level: 'week', dayWidth: 19 }, // Index 3
    { level: 'week', dayWidth: 23 }, // Index 4 (Eski "Hafta" maksimumu)
    { level: 'week', dayWidth: 28 }, // Index 5 (Eski "Hafta" maksimumu)
    { level: 'week', dayWidth: 32 }, // Index 6 (Eski "Hafta" maksimumu)
    { level: 'week', dayWidth: 38 }, // Index 7 (Eski "Hafta" maksimumu)
    { level: 'week', dayWidth: 45 }, // Index 8 (Eski "Hafta" maksimumu)

    // --- "Gün" Seviyesi (TimelineHeader "Ay > Gün" gösterir) ---
    { level: 'day', dayWidth: 65 },  // Index 9 (Eski 60'a yakın)
    { level: 'day', dayWidth: 120 },  // Index 10 (Eski 80'e yakın)
    { level: 'day', dayWidth: 200 },  // Index 11 (Yeni detay seviyesi)
    { level: 'day', dayWidth: 300 }, // Index 12
    { level: 'day', dayWidth: 400 }, // Index 13: En yakın (Maksimum detay)

];

export const DEFAULT_ZOOM_INDEX = 10;
export const MAX_ZOOM_INDEX = ZOOM_STEPS.length - 1;

// YENİ: Gantt Şeması için paylaşılan satır yüksekliği
// Değeri buradan 36'dan 44'e yükselttik.
export const GANTT_ROW_HEIGHT_PX = 50; 
export const GANTT_BAR_HEIGHT_PX = 25; // Bu sabit kalabilir

// Çubukların dikeyde ortalanması için hesaplama
export const GANTT_BAR_TOP_OFFSET_PX = (GANTT_ROW_HEIGHT_PX - GANTT_BAR_HEIGHT_PX) / 2;

// Okların çubuğun ortasından çıkması için hesaplama (Bar yüksekliğinin yarısı + offset)
export const GANTT_ARROW_VERTICAL_MID_OFFSET = GANTT_BAR_TOP_OFFSET_PX + (GANTT_BAR_HEIGHT_PX / 2);

// --- StatusCell'deki Mantık (Modal içine taşındı) ---
export const STATUS_OPTIONS = [
    { text: 'Yapılıyor', classes: 'bg-orange-100 text-orange-800' },
    { text: 'Tamamlandı', classes: 'bg-green-100 text-green-800' },
    { text: 'Takıldı', classes: 'bg-red-100 text-red-800' },
    { text: 'Beklemede', classes: 'bg-blue-100 text-blue-800' },
    { text: 'Belirsiz', classes: 'bg-gray-100 text-gray-800' },
];
