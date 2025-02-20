'use client';

import { api } from '@/lib/trpc/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useTranslations } from 'use-intl';
import { z } from 'zod';

const roomSchema = z.object({
  number: z.string().min(1, 'validation.numberRequired'),
  type: z.enum(['SUITE', 'STUDIO', 'STANDARD', 'DELUXE'], {
    errorMap: () => ({ message: 'validation.typeRequired' }),
  }),
  size: z.coerce.number().min(1, 'validation.sizeRequired'),
  amenities: z.array(z.string()).min(1, 'validation.amenitiesRequired'),
  price: z.coerce.number().min(0, 'validation.priceRequired'),
});

type RoomFormData = z.infer<typeof roomSchema>;

// List of common room amenities
const AMENITIES = [
  'bathroom',
  'ac',
  'balcony',
  'tv',
  'fridge',
  'desk',
  'wardrobe',
  'waterHeater',
  'window',
];

interface RoomFormProps {
  propertyId: string;
  initialData?: RoomFormData & { id: string };
}

export function RoomForm({ propertyId, initialData }: RoomFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    initialData?.amenities || []
  );
  const [customAmenity, setCustomAmenity] = useState('');
  const t = useTranslations('properties.pages.room.form');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      ...initialData,
      size: initialData?.size || undefined,
      price: initialData?.price || undefined,
      amenities: initialData?.amenities || [],
    },
  });

  const createMutation = api.room.create.useMutation({
    onSuccess: () => {
      toast.success(initialData ? t('toast.updated') : t('toast.created'));
      router.push(`/properties/${propertyId}`);
      router.refresh();
    },
    onError: error => {
      toast.error(error.message);
      setIsLoading(false);
    },
  });

  const updateMutation = api.room.update.useMutation({
    onSuccess: () => {
      toast.success(t('toast.updated'));
      router.push(`/properties/${propertyId}`);
      router.refresh();
    },
    onError: error => {
      toast.error(error.message);
      setIsLoading(false);
    },
  });

  const onSubmit = async (data: RoomFormData) => {
    try {
      setIsLoading(true);

      // Update the amenities in the form data
      setValue('amenities', selectedAmenities);

      const roomData = {
        ...data,
        amenities: selectedAmenities,
        propertyId,
      };

      console.log('Submitting room data:', roomData);

      if (initialData) {
        await updateMutation.mutateAsync({
          id: initialData.id,
          data: roomData,
        });
      } else {
        await createMutation.mutateAsync(roomData);
      }
    } catch (error) {
      console.error('Failed to save room:', error);
      toast.error(t('toast.error'));
      setIsLoading(false);
    }
  };

  const toggleAmenity = (amenity: string) => {
    const newAmenities = selectedAmenities.includes(amenity)
      ? selectedAmenities.filter(a => a !== amenity)
      : [...selectedAmenities, amenity];

    setSelectedAmenities(newAmenities);
    setValue('amenities', newAmenities, { shouldValidate: true });
  };

  const addCustomAmenity = () => {
    if (customAmenity.trim() && !selectedAmenities.includes(customAmenity.trim())) {
      const newAmenities = [...selectedAmenities, customAmenity.trim()];
      setSelectedAmenities(newAmenities);
      setValue('amenities', newAmenities, { shouldValidate: true });
      setCustomAmenity('');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="text-sm font-medium">{t('number')}</label>
        <input
          type="text"
          id="number"
          {...register('number')}
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
        {errors.number && (
          <p className="mt-1 text-sm text-red-600">{t('validation.numberRequired')}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">{t('type')}</label>
        <select
          id="type"
          {...register('type')}
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        >
          <option value="">{t('selectType')}</option>
          <option value="STANDARD">{t('types.standard')}</option>
          <option value="DELUXE">{t('types.deluxe')}</option>
          <option value="SUITE">{t('types.suite')}</option>
          <option value="STUDIO">{t('types.studio')}</option>
        </select>
        {errors.type && <p className="mt-1 text-sm text-red-600">{t('validation.typeRequired')}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">{t('size')}</label>
        <input
          type="number"
          id="size"
          {...register('size')}
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
        {errors.size && <p className="mt-1 text-sm text-red-600">{t('validation.sizeRequired')}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">{t('price')}</label>
        <input
          type="number"
          id="price"
          {...register('price')}
          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        />
        {errors.price && (
          <p className="mt-1 text-sm text-red-600">{t('validation.priceRequired')}</p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">{t('amenitiesLabel')}</label>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {AMENITIES.map(amenity => (
            <button
              key={amenity}
              type="button"
              onClick={() => toggleAmenity(amenity)}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                selectedAmenities.includes(amenity)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {t(`amenities.${amenity}`)}
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={customAmenity}
            onChange={e => setCustomAmenity(e.target.value)}
            placeholder={t('amenities.custom')}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            onKeyPress={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomAmenity();
              }
            }}
          />
          <button
            type="button"
            onClick={addCustomAmenity}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t('amenities.add')}
          </button>
        </div>

        {selectedAmenities.filter(a => !AMENITIES.includes(a)).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedAmenities
              .filter(a => !AMENITIES.includes(a))
              .map(amenity => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {amenity}
                </button>
              ))}
          </div>
        )}

        {errors.amenities && (
          <p className="mt-1 text-sm text-red-600">{t('validation.amenitiesRequired')}</p>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading
            ? initialData
              ? t('updating')
              : t('creating')
            : initialData
              ? t('update')
              : t('create')}
        </button>
      </div>
    </form>
  );
}
