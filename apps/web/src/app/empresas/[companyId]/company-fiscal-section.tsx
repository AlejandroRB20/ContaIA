'use client';

import type { CompanyDetail } from '@contaia/types';
import { Button, FormField, Input } from '@contaia/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useUpdateFiscalProfile } from '@/hooks/use-update-fiscal-profile';
import { ApiError } from '@/lib/http';

const schema = z.object({
  taxRegime: z.string().max(100).optional().or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

interface CompanyFiscalSectionProps {
  companyId: string;
  data: CompanyDetail;
  canEdit: boolean;
}

/**
 * Sección "Información fiscal" del perfil de Empresa (EWO-003 sección 5.7).
 * `taxRegime` es texto libre — sin catálogo de regímenes SAT hardcodeado
 * (CLAUDE.md regla 6: ninguna información fiscal sin validar por el usuario).
 */
export function CompanyFiscalSection({
  companyId,
  data,
  canEdit,
}: CompanyFiscalSectionProps): React.JSX.Element {
  const updateFiscalProfileMutation = useUpdateFiscalProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { taxRegime: data.fiscalProfile?.taxRegime ?? '' },
  });
  const { reset } = form;

  useEffect(() => {
    reset({ taxRegime: data.fiscalProfile?.taxRegime ?? '' });
  }, [data, reset]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await updateFiscalProfileMutation.mutateAsync({
        companyId,
        input: { taxRegime: values.taxRegime ? values.taxRegime : undefined },
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
          : 'No se pudo actualizar el perfil fiscal.',
      );
    }
  });

  if (isEditing) {
    return (
      <form onSubmit={onSubmit} className="gap-md flex flex-col" noValidate>
        <FormField
          label="Régimen fiscal"
          helpText="Código o nombre del régimen fiscal según tu constancia de situación fiscal."
          error={form.formState.errors.taxRegime?.message}
        >
          <Input {...form.register('taxRegime')} />
        </FormField>
        {formError ? <p className="text-danger text-sm">{formError}</p> : null}
        <div className="gap-sm flex">
          <Button type="submit" isLoading={updateFiscalProfileMutation.isPending}>
            Guardar cambios
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setIsEditing(false);
              setFormError(null);
              form.reset({ taxRegime: data.fiscalProfile?.taxRegime ?? '' });
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
          <dt className="text-muted-foreground dark:text-muted-foreground-dark">Régimen fiscal</dt>
          <dd className="text-foreground dark:text-foreground-dark">
            {data.fiscalProfile?.taxRegime ?? '—'}
          </dd>
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
