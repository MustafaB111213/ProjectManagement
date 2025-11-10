import React from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { useAppDispatch } from '../../store/hooks';
import { updateColumn } from '../../store/features/columnSlice';
import type { Column } from '../../types';

interface ColumnFormData {
    title: string;
}

interface EditColumnFormProps {
    boardId: number;
    column: Column; // Düzenlenecek sütunun verilerini prop olarak al
    onClose: () => void;
}

const EditColumnForm: React.FC<EditColumnFormProps> = ({ boardId, column, onClose }) => {
    const dispatch = useAppDispatch();
    const { register, handleSubmit, formState: { errors } } = useForm<ColumnFormData>({
        // Formu, düzenlenecek sütunun mevcut başlığıyla doldur
        defaultValues: {
            title: column.title,
        }
    });

    const onSubmit: SubmitHandler<ColumnFormData> = (data) => {
        dispatch(updateColumn({ boardId, columnId: column.id, columnData: data }));
        onClose();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Sütun Başlığı</label>
                <input
                    id="title"
                    {...register('title', { required: 'Başlık zorunludur' })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>
            
            {/* Sütun Tipi DEĞİŞTİRİLEMEZ olduğu için burada gösterilmiyor. */}

            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md">İptal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Kaydet</button>
            </div>
        </form>
    );
};

export default EditColumnForm;