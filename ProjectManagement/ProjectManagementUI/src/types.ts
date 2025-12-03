// src/types.ts

// Backend'den gelen Board nesnesinin tip tanımı
export interface Board {
    id: number;
    name: string;
    description?: string;
}

// Group nesnesinin tip tanımı
export interface Group {
    id: number;
    title: string;
    color: string;
    boardId: number;
    order: number;
}

// ItemValue tipi
export interface ItemValue {
    id: number;
    value: string;
    itemId: number;
    columnId: number;
}

// Item nesnesinin tip tanımı
export interface Item {
    id: number;
    name: string;
    groupId: number;
    itemValues: ItemValue[]; 
    order: number;
    parentItemId: number | null;
}
export interface ItemTree extends Item {
    children: ItemTree[];
}

// ColumnType enum'ı
export enum ColumnType {
    Text = 0,
    Status = 1,
    Date = 2,
    Person = 3,
    Timeline = 4,
    Document = 5,
    Dependency = 6  
}

// DependencyAction enum'ı
export enum DependencyAction {
  Ignore = 'ignore',   // Mod 1: Kontrol yok (Default)
  Restrict = 'restrict', // Mod 2: İhlal varsa izin verme
  AutoMove = 'autoMove'  // Mod 3: Zincirleme hareket (Auto-schedule)
}

// ColumnSettings Interface'i
export interface ColumnSettings {
    dependencyAction?: DependencyAction;
}

// Column tipi (DÜZELTİLDİ)
export interface Column {
    id: number;
    title: string;
    type: ColumnType;
    boardId: number;
    order: number;
    settings?: string; // <-- BURASI DÜZELTİLDİ: Artık JSON string tutuyor
}

// User tipi
export interface User {
    id: number;
    username: string; // name -> username, backend yapısına göre
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    initials?: string; // İsteğe bağlı eklendi
}

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

// DependencyLink interface
export interface DependencyLink {
    id: number;       
    type: DependencyType; 
}