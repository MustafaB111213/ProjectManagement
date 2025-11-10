// Backend'den gelen Board nesnesinin tip tanımı
export interface Board {
    id: number;
    name: string;
    description?: string; // Soru işareti bu alanın opsiyonel olduğunu belirtir
}

// YENİ: Backend'den gelen Group nesnesinin tip tanımı
export interface Group {
    id: number;
    title: string;
    color: string;
    boardId: number;
    order: number;
}

// YENİ: ItemValue tipi
export interface ItemValue {
    id: number;
    value: string;
    itemId: number;
    columnId: number;
}
// YENİ: Backend'den gelen Item nesnesinin tip tanımı
// GÜNCELLEME: Item tipi artık değerlerini de içeriyor
export interface Item {
    id: number;
    name: string;
    groupId: number;
    itemValues: ItemValue[]; 
    order: number;
}

// YENİ: ColumnType enum'ı (Backend'deki ile aynı olmalı)
export enum ColumnType {
    Text = 0,
    Status = 1,
    Date = 2,
    Person = 3,
    Timeline = 4,
    Document = 5,
    Dependency = 6  
}

// YENİ: Column tipi
export interface Column {
    id: number;
    title: string;
    type: ColumnType;
    boardId: number;
    order: number;
}

// YENİ: Kullanıcıları temsil etmek için yeni bir tip ekleyelim.
export interface User {
    id: number;
    name: string;
    avatarUrl?: string; // Opsiyonel avatar resmi
    initials: string; // Avatar yerine gösterilecek baş harfler
}

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

// YENİ: Bağımlılık sütununun 'value' alanında saklanacak JSON yapısı için interface
// Örnek: [{"id": 5, "type": "FS"}, {"id": 12, "type": "FS"}]
export interface DependencyLink {
    id: number;       // Bağlı olunan (öncül) görevin ID'si
    type: DependencyType; // Bağımlılık tipi
}

export interface User {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    // avatarUrl backend'den gelmiyorsa, onu burada tutmuyoruz.
    // Bileşen içinde Gravatar gibi bir servisten türetebiliriz.
}