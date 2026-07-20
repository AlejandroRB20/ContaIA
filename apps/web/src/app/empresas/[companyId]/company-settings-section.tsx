'use client';

import type { CompanyDetail } from '@contaia/types';
import { Button, FormField, Input } from '@contaia/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useUpdateSettings } from '@/hooks/use-update-settings';
import { ApiError } from '@/lib/http';

const schema = z.object({
  timeZone: z.string().min(1, 'Ingresa la zona horaria.').max(60),
  baseCurrency: z.string().length(3, 'Usa el código de 3 letras de la moneda (por ejemplo, MXN).'),
  language: z.string().min(1, 'Ingresa el idioma.').max(10),
  country: z.string().length(2, 'Usa el código de 2 letras del país (por ejemplo, MX).'),
});
type FormValues = z.infer<typeof schema>;

interface CompanySettingsSectionProps {
  companyId: string;
  data: CompanyDetail;
  canEdit: boolean;
}

function getDefaultValues(data: CompanyDetail): FormValues {
  return {
    timeZone: data.settings?.timeZone ?? 'America/Mexico_City',
    baseCurrency: data.settings?.baseCurrency ?? 'MXN',
    language: data.settings?.language ?? 'es-MX',
    country: data.settings?.country ?? 'MX',
  };
}

/** Sección "Configuración" regional/operativa del perfil de Empresa (EWO-003 sección 5.8). */
export function CompanySettingsSection({
  companyId,
  data,
  canEdit,
}: CompanySettingsSectionProps): React.JSX.Element {
  const updateSettingsMutation = useUpdateSettings();
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
      await updateSettingsMutation.mutateAsync({
        companyId,
        input: values,
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
        error instanceof ApiError
          ? error.detail.message
          : 'No se pudo actualizar la configuración.',
      );
    }
  });

  if (isEditing) {
    return (
      <form onSubmit={onSubmit} className="gap-md flex flex-col" noValidate>
        <FormField
          label="Zona horaria"
          helpText="Por ejemplo: America/Mexico_City, America/Cancun."
          error={form.formState.errors.timeZone?.message}
        >
          <Input {...form.register('timeZone')} />
        </FormField>
        <FormField label="Moneda base" error={form.formState.errors.baseCurrency?.message}>
          <Input maxLength={3} {...form.register('baseCurrency')} />
        </FormField>
        <FormField label="Idioma" error={form.formState.errors.language?.message}>
          <Input {...form.register('language')} />
        </FormField>
        <FormField label="País" error={form.formState.errors.country?.message}>
          <Input maxLength={2} {...form.register('country')} />
        </FormField>
        {formError ? <p className="text-danger text-sm">{formError}</p> : null}
        <div className="gap-sm flex">
          <Button type="submit" isLoading={updateSettingsMutation.isPending}>
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
      <dl className="gap-sm flex flex-col text-sm">
        <div>
          <dt className="text-muted-foreground dark:text-muted-foreground-dark">Zona horaria</dt>
          <dd className="text-foreground dark:text-foreground-dark">{defaults.timeZone}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground dark:text-muted-foreground-dark">Moneda base</dt>
          <dd className="text-foreground dark:text-foreground-dark">{defaults.baseCurrency}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground dark:text-muted-foreground-dark">Idioma</dt>
          <dd className="text-foreground dark:text-foreground-dark">{defaults.language}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground dark:text-muted-foreground-dark">País</dt>
          <dd className="text-foreground dark:text-foreground-dark">{defaults.country}</dd>
        </div>
      </dl>
      {canEdit ? (
        <Button variant="secondary" onClick={() => setIsEditing(true)}>
          Editar
        </Button>
      ) : null}
    </div>
  );
}
