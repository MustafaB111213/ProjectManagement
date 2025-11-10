import React from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';

import { useAppDispatch } from '../../store/hooks';
import { createGroup } from '../../store/features/groupSlice';

interface GroupFormData {
    title: string;
    color: string;
}

interface AddGroupFormProps {
    boardId: number;
    onClose: () => void;
}

const AddGroupForm: React.FC<AddGroupFormProps> = ({ boardId, onClose }) => {
    const dispatch = useAppDispatch();
    const { register, handleSubmit, formState: { errors } } = useForm<GroupFormData>({
        defaultValues: { color: '#FF5733' } // Varsayılan renk
    });

    const onSubmit: SubmitHandler<GroupFormData> = (data) => {
        dispatch(createGroup({ boardId, groupData: data }));
        onClose();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Grup Adı</label>
                <input
                    id="title"
                    {...register('title', { required: 'Grup adı zorunludur' })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>
            <div>
                <label htmlFor="color" className="block text-sm font-medium text-gray-700">Renk</label>
                <input
                    id="color"
                    type="color" // Tarayıcının renk seçicisini kullanır
                    {...register('color', { required: 'Renk zorunludur' })}
                    className="mt-1 block w-full h-10 border border-gray-300 rounded-md"
                />
            </div>
            <div className="flex justify-end space-x-2">
                 <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">İptal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Oluştur</button>
            </div>
        </form>
    );
};

export default AddGroupForm;