import React from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';

import { useAppDispatch } from '../../store/hooks';
import { createColumn } from '../../store/features/columnSlice';
import { ColumnType } from '../../types';

// Formumuzun veri yapısını tanımlıyoruz
interface ColumnFormData {
    title: string;
    type: ColumnType;
}

interface AddColumnFormProps {
    boardId: number;
    onClose: () => void;
}

const AddColumnForm: React.FC<AddColumnFormProps> = ({ boardId, onClose }) => {
    const dispatch = useAppDispatch();
    const { register, handleSubmit, formState: { errors } } = useForm<ColumnFormData>();

    const onSubmit: SubmitHandler<ColumnFormData> = (data) => {
        // Formdan gelen 'type' string olabilir, onu sayıya çeviriyoruz.
        const columnData = {
            ...data,
            type: Number(data.type) as ColumnType,
        };
        dispatch(createColumn({ boardId, columnData }));
        onClose(); // Formu gönderdikten sonra modal'ı kapat
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Sütun Başlığı Input'u */}
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Sütun Başlığı</label>
                <input
                    id="title"
                    {...register('title', { required: 'Başlık zorunludur' })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>

            {/* Sütun Tipi Dropdown'ı */}
            <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">Sütun Tipi</label>
                <select
                    id="type"
                    {...register('type', { required: 'Tip seçimi zorunludur' })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                    {/* TypeScript enum'ını map'leyerek seçenekleri dinamik olarak oluşturuyoruz */}
                    {Object.values(ColumnType)
                        .filter(value => !isNaN(Number(value))) // Sadece sayısal değerleri al
                        .map(value => (
                            <option key={value} value={value as number}>
                                {ColumnType[value as number]} {/* Enum'ın string karşılığını göster */}
                            </option>
                        ))}
                </select>
                {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">İptal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Oluştur</button>
            </div>
        </form>
    );
};

export default AddColumnForm;