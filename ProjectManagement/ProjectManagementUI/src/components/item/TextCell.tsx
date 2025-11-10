import React, { useState } from 'react';
import type { Item, Column } from '../../types';
import { useAppDispatch } from '../../store/hooks';
import { updateItemValue } from '../../store/features/itemSlice';

interface TextCellProps {
    item: Item;
    column: Column;
}

const TextCell: React.FC<TextCellProps> = ({ item, column }) => {
    const dispatch = useAppDispatch();
    const [isEditing, setIsEditing] = useState(false);
    
    const value = item.itemValues.find(v => v.columnId === column.id)?.value || '';
    const [editingValue, setEditingValue] = useState(value);

    const handleUpdate = () => {
        if (editingValue.trim() !== value) {
            dispatch(updateItemValue({
                itemId: item.id,
                columnId: column.id,
                value: editingValue,
            }));
        }
        setIsEditing(false);
    };
    
    if (isEditing) {
        return (
            <input
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={handleUpdate}
                onKeyDown={(e) => { if (e.key === 'Enter') handleUpdate() }}
                autoFocus
                className="w-full h-full p-2 bg-white outline-none ring-2 ring-blue-500 rounded"
            />
        );
    }

    return (
        <div onClick={() => setIsEditing(true)} className="w-full h-full flex items-center justify-center">
            <span className="truncate">{value || "-"}</span>
        </div>
    );
};

export default TextCell;