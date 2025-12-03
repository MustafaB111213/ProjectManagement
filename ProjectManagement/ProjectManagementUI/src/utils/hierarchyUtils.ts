// src/utils/hierarchyUtils.ts

import { type Item } from '../types';

export interface ItemWithDepth extends Item {
    depth: number;
}

/**
 * Düz item listesini alır, parent/child ilişkisine göre sıralar
 * ve her item'a depth (derinlik) bilgisi ekler.
 */
export const sortItemsHierarchically = (items: Item[]): ItemWithDepth[] => {
    const itemMap = new Map<number, Item>();
    const childrenMap = new Map<number | null, Item[]>();

    // 1. Map'leri oluştur
    items.forEach(item => {
        itemMap.set(item.id, item);
        const parentId = item.parentItemId || null;
        
        if (!childrenMap.has(parentId)) {
            childrenMap.set(parentId, []);
        }
        childrenMap.get(parentId)!.push(item);
    });

    // 2. Her seviyeyi kendi içinde order'a göre sırala
    childrenMap.forEach(list => {
        list.sort((a, b) => a.order - b.order);
    });

    const result: ItemWithDepth[] = [];

    // 3. Recursive olarak listeyi oluştur (DFS)
    const traverse = (parentId: number | null, currentDepth: number) => {
        const children = childrenMap.get(parentId);
        if (!children) return;

        children.forEach(child => {
            // Eğer item filtrelenmiş listede (items içinde) varsa ekle
            // (Bazen parent filtrelenmiş olabilir ama child duruyor olabilir, bu durumda child'ı root gibi gösteriyoruz)
            if (itemMap.has(child.id)) {
                result.push({ ...child, depth: currentDepth });
                traverse(child.id, currentDepth + 1);
            } else {
                // Parent listede yoksa bile çocuklarını ara (orphan check)
                // Bu senaryoda derinlik artmaz veya child root olur.
                // Basitlik için: Parent yoksa çocuklarını root seviyesinden başlatabiliriz veya es geçebiliriz.
                // Burada zinciri korumak için traverse etmeye devam ediyoruz.
                traverse(child.id, currentDepth); 
            }
        });
    };

    // Root'ları (parent'ı null olanlar veya parent'ı bu listede olmayanlar) bul
    // Ancak yukarıdaki logic'te sadece `childrenMap.get(null)` rootları verir.
    // Filtreleme yapıldığı için (örn: Status=Done), parent'ı 'Done' olmayan ama kendisi 'Done' olan itemlar kaybolabilir.
    // Bu yüzden daha sağlam bir "Root Bulucu" mantığı kuralım:
    
    // items listesindeki her item için:
    // Eğer parentItemId'si null ise -> ROOT
    // Eğer parentItemId'si var ama parent'ı `items` listesinde YOKSA -> ROOT (Yetim)
    const roots = items.filter(item => {
        if (!item.parentItemId) return true;
        return !itemMap.has(item.parentItemId);
    });

    // Rootları sırala
    roots.sort((a, b) => a.order - b.order);

    // Her root için ağacı gez
    const visited = new Set<number>();
    
    const traverseExplicit = (item: Item, depth: number) => {
        if (visited.has(item.id)) return;
        visited.add(item.id);
        
        result.push({ ...item, depth });

        const children = childrenMap.get(item.id);
        if (children) {
            children.forEach(child => traverseExplicit(child, depth + 1));
        }
    };

    roots.forEach(root => traverseExplicit(root, 0));

    return result;
};