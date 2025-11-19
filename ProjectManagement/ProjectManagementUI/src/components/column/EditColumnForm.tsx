// src/components/column/EditColumnForm.tsx

import React, { useEffect, useMemo } from 'react'; // useMemo eklendi
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { useAppDispatch } from '../../store/hooks';
import { updateColumn } from '../../store/features/columnSlice';
import { ColumnType, DependencyAction, type Column, type ColumnSettings } from '../../types';

interface ColumnFormData {
    title: string;
    dependencyAction: DependencyAction;
}

interface EditColumnFormProps {
    boardId: number;
    column: Column;
    onClose: () => void;
}

const EditColumnForm: React.FC<EditColumnFormProps> = ({ boardId, column, onClose }) => {
    const dispatch = useAppDispatch();

    // Mevcut ayarları parse et
    const defaultSettings = useMemo(() => {
        if (column.settings) {
            try {
                const parsed = JSON.parse(column.settings) as ColumnSettings;
                return parsed;
            } catch {
                return {};
            }
        }
        return {};
    }, [column.settings]);

    // Form hook'u (reset fonksiyonunu da aldık)
    const { register, handleSubmit, reset, formState: { errors } } = useForm<ColumnFormData>({
        defaultValues: {
            title: column.title,
            dependencyAction: defaultSettings.dependencyAction || DependencyAction.Ignore
        }
    });

    // --- BU KISMI EKLEYİN: Prop değişirse formu güncelle ---
    useEffect(() => {
        reset({
            title: column.title,
            dependencyAction: defaultSettings.dependencyAction || DependencyAction.Ignore
        });
    }, [column, defaultSettings, reset]);
    // -------------------------------------------------------

    const onSubmit: SubmitHandler<ColumnFormData> = (data) => {
        const settings: ColumnSettings = {
            dependencyAction: data.dependencyAction
        };

        const updatePayload = {
            title: data.title,
            settings: JSON.stringify(settings)
        };

        dispatch(updateColumn({ boardId, columnId: column.id, columnData: updatePayload as any }));
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

                {/* SADECE BAĞIMLILIK SÜTUNUYSA GÖSTER */}
                {column.type === ColumnType.Dependency && (
                    <div className="mt-4 border-t pt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bağımlılık Modu</label>
                        <div className="space-y-2">
                            <div className="flex items-center">
                                <input
                                    id="mode-ignore"
                                    type="radio"
                                    value={DependencyAction.Ignore}
                                    {...register('dependencyAction')}
                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <label htmlFor="mode-ignore" className="ml-2 block text-sm text-gray-900">
                                    Serbest (Varsayılan) - <span className="text-gray-500 text-xs">Kontrol yapılmaz.</span>
                                </label>
                            </div>
                            <div className="flex items-center">
                                <input
                                    id="mode-restrict"
                                    type="radio"
                                    value={DependencyAction.Restrict}
                                    {...register('dependencyAction')}
                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <label htmlFor="mode-restrict" className="ml-2 block text-sm text-gray-900">
                                    Kısıtlayıcı - <span className="text-gray-500 text-xs">İhlal olursa hareketi engeller.</span>
                                </label>
                            </div>
                            <div className="flex items-center">
                                <input
                                    id="mode-auto"
                                    type="radio"
                                    value={DependencyAction.AutoMove}
                                    {...register('dependencyAction')}
                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <label htmlFor="mode-auto" className="ml-2 block text-sm text-gray-900">
                                    Zincirleme - <span className="text-gray-500 text-xs">Bağlı görevleri otomatik öteler.</span>
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md">İptal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Kaydet</button>
            </div>
        </form>
    );
};

export default EditColumnForm;