'use client';

import type { CompanyDetail } from '@contaia/types';
import { Button, FormField, Input } from '@contaia/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useUpdateAddress } from '@/hooks/use-update-address';
import { ApiError } from '@/lib/http';

const optionalText = (max: number) => z.string().max(max).optional().or(z.literal(''));

const schema = z.object({
  street: optionalText(255),
  exteriorNumber: optionalText(20),
  interiorNumber: optionalText(20),
  neighborhood: optionalText(120),
  municipality: optionalText(120),
  state: optionalText(120),
  postalCode: optionalText(10),
  country: optionalText(2),
});
type FormValues = z.infer<typeof schema>;

interface CompanyAddressSectionProps {
  companyId: string;
  data: CompanyDetail;
  canEdit: boolean;
}

function getDefaultValues(data: CompanyDetail): FormValues {
  return {
    street: data.address?.street ?? '',
    exteriorNumber: data.address?.exteriorNumber ?? '',
    interiorNumber: data.address?.interiorNumber ?? '',
    neighborhood: data.address?.neighborhood ?? '',
    municipality: data.address?.municipality ?? '',
    state: data.address?.state ?? '',
    postalCode: data.address?.postalCode ?? '',
    country: data.address?.country ?? 'MX',
  };
}

const FIELD_LABELS: Record<keyof FormValues, string> = {
  street: 'Calle',
  exteriorNumber: 'Número exterior',
  interiorNumber: 'Número interior',
  neighborhood: 'Colonia',
  municipality: 'Municipio o alcaldía',
  state: 'Estado',
  postalCode: 'Código postal',
  country: 'País',
};

/** Sección "Domicilio" (domicilio fiscal) del perfil de Empresa (EWO-003 sección 5.7). */
export function CompanyAddressSection({
  companyId,
  data,
  canEdit,
}: CompanyAddressSectionProps): React.JSX.Element {
  const updateAddressMutation = useUpdateAddress();
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const defaults = getDefaultValues(data);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults });
  const { reset } = form;

  useEffect(() => {
    reset(getDefaultValues(data));
  }, [data, reset]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await updateAddressMutation.mutateAsync({
        companyId,
        input: {
          street: values.street || undefined,
          exteriorNumber: values.exteriorNumber || undefined,
          interiorNumber: values.interiorNumber || undefined,
          neighborhood: values.neighborhood || undefined,
          municipality: values.municipality || undefined,
          state: values.state || undefined,
          postalCode: values.postalCode || undefined,
          country: values.country || undefined,
        },
        expectedVersion: data.version,
      });
      setIsEditing(false);
    } catch (error) {
      if (error instanceof ApiError && error.detail.code === 'CONFLICT') {
        setFormError(
          'Esta empresa fue modificada por otra persona. Recarga la página e intenta de nuevo.',
        );
        return;
      }
      setFormError(
        error instanceof ApiError ? error.detail.message : 'No se pudo actualizar el domicilio.',
      );
    }
  });

  if (isEditing) {
    return (
      <form onSubmit={onSubmit} className="gap-md flex flex-col" noValidate>
        <div className="gap-sm grid grid-cols-2">
          <FormField label="Calle" error={form.formState.errors.street?.message}>
            <Input {...form.register('street')} />
          </FormField>
          <FormField label="Número exterior" error={form.formState.errors.exteriorNumber?.message}>
            <Input {...form.register('exteriorNumber')} />
          </FormField>
        </div>
        <div className="gap-sm grid grid-cols-2">
          <FormField label="Número interior" error={form.formState.errors.interiorNumber?.message}>
            <Input {...form.register('interiorNumber')} />
          </FormField>
          <FormField label="Colonia" error={form.formState.errors.neighborhood?.message}>
            <Input {...form.register('neighborhood')} />
          </FormField>
        </div>
        <div className="gap-sm grid grid-cols-2">
          <FormField
            label="Municipio o alcaldía"
            error={form.formState.errors.municipality?.message}
          >
            <Input {...form.register('municipality')} />
          </FormField>
          <FormField label="Estado" error={form.formState.errors.state?.message}>
            <Input {...form.register('state')} />
          </FormField>
        </div>
        <div className="gap-sm grid grid-cols-2">
          <FormField
            label="Código postal"
            helpText="5 dígitos del domicilio fiscal."
            error={form.formState.errors.postalCode?.message}
          >
            <Input maxLength={10} {...form.register('postalCode')} />
          </FormField>
          <FormField label="País" error={form.formState.errors.country?.message}>
            <Input maxLength={2} {...form.register('country')} />
          </FormField>
        </div>
        {formError ? <p className="text-danger text-sm">{formError}</p> : null}
        <div className="gap-sm flex">
          <Button type="submit" isLoading={updateAddressMutation.isPending}>
            Guardar cambios
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setIsEditing(false);
              setFormError(null);
              form.reset(defaults);
            }}
          >
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="gap-md flex flex-col">
      <dl className="gap-sm grid grid-cols-2 text-sm">
        {(Object.keys(FIELD_LABELS) as Array<keyof FormValues>).map((key) => (
          <div key={key}>
            <dt className="text-muted-foreground dark:text-muted-foreground-dark">
              {FIELD_LABELS[key]}
            </dt>
            <dd className="text-foreground dark:text-foreground-dark">{defaults[key] || '—'}</dd>
          </div>
        ))}
      </dl>
      {canEdit ? (
        <Button variant="secondary" onClick={() => setIsEditing(true)}>
          Editar
        </Button>
      ) : null}
    </div>
  );
}
