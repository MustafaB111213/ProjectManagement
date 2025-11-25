// API tabanı, ortam değişkeni üzerinden yapılandırılabilir.
// Geliştirme sırasında Vite proxy'si ile aynı origin'den istek atmak için
// varsayılan olarak "/api" yolunu kullanır.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
// --- Zoom Adımları ---
// Her adımda gün genişliğini tanımla (daha fazla adım eklenebilir)
export const ZOOM_STEPS = [
    // --- "Yıl" Seviyesi (Header: On Yıllar > Yıllar) ---
    // 1 Yıl = 365 gün. 0.5px ile bir yıl yaklaşık 182px yer kaplar.
    { level: 'year', dayWidth: 0.5 }, // Index 0
    { level: 'year', dayWidth: 1 },   // Index 1

    // --- "Çeyrek" Seviyesi (Header: Yıllar > Çeyrekler) ---
    // 1 Çeyrek = ~90 gün. 3px ile bir çeyrek ~270px yer kaplar.
    { level: 'quarter', dayWidth: 2 }, // Index 2
    { level: 'quarter', dayWidth: 4 }, // Index 3

    // --- "Ay" Seviyesi (Header: Yıllar > Aylar) ---
    { level: 'month', dayWidth: 7 },   // Index 4
    { level: 'month', dayWidth: 12 },  // Index 5

    // --- "Hafta" Seviyesi (Header: Aylar > Haftalar) ---
    { level: 'week', dayWidth: 20 }, // Index 6
    { level: 'week', dayWidth: 30 }, // Index 7
    { level: 'week', dayWidth: 40 }, // Index 8
    { level: 'week', dayWidth: 50 }, // Index 9

    // --- "Gün" Seviyesi (Header: Aylar > Günler) ---
    { level: 'day', dayWidth: 70 },  // Index 10 (Default)
    { level: 'day', dayWidth: 100 }, // Index 11
    { level: 'day', dayWidth: 150 }, // Index 12
    { level: 'day', dayWidth: 250 }, // Index 13
    { level: 'day', dayWidth: 400 }, // Index 14
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
    { text: 'Planlandı', classes: 'bg-yellow-100 text-yellow-800' },
    { text: 'Belirsiz', classes: 'bg-gray-100 text-gray-800' },
];
