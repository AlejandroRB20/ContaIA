'use client';

import type { CompanyDetail } from '@contaia/types';
import { Button, FormField, Input } from '@contaia/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useUpdateCompany } from '@/hooks/use-update-company';
import { ApiError } from '@/lib/http';

const schema = z.object({
  name: z.string().min(1, 'Ingresa la razón social.').max(255),
  tradeName: z.string().max(255).optional().or(z.literal('')),
  businessActivity: z.string().min(1, 'Ingresa el giro de la empresa.').max(255),
  rfc: z.string().max(13, 'El RFC tiene como máximo 13 caracteres.').optional().or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

interface CompanyGeneralSectionProps {
  companyId: string;
  data: CompanyDetail;
  canEdit: boolean;
}

/** Sección "Información general" del perfil de Empresa (BR-EMP-003). */
export function CompanyGeneralSection({
  companyId,
  data,
  canEdit,
}: CompanyGeneralSectionProps): React.JSX.Element {
  const updateCompanyMutation = useUpdateCompany();
  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: data.name,
      tradeName: data.tradeName ?? '',
      businessActivity: data.businessActivity,
      rfc: data.rfc ?? '',
    },
  });
  const { reset } = form;

  useEffect(() => {
    reset({
      name: data.name,
      tradeName: data.tradeName ?? '',
      businessActivity: data.businessActivity,
      rfc: data.rfc ?? '',
    });
  }, [data, reset]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await updateCompanyMutation.mutateAsync({
        companyId,
        input: {
          name: values.name,
          tradeName: values.tradeName ? values.tradeName : undefined,
          businessActivity: values.businessActivity,
          rfc: values.rfc ? values.rfc : undefined,
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
        error instanceof ApiError ? error.detail.message : 'No se pudo actualizar la empresa.',
      );
    }
  });

  if (isEditing) {
    return (
      <form onSubmit={onSubmit} className="gap-md flex flex-col" noValidate>
        <FormField label="Razón social" required error={form.formState.errors.name?.message}>
          <Input autoComplete="organization" {...form.register('name')} />
        </FormField>
        <FormField label="Nombre comercial" error={form.formState.errors.tradeName?.message}>
          <Input {...form.register('tradeName')} />
        </FormField>
        <FormField label="Giro" required error={form.formState.errors.businessActivity?.message}>
          <Input {...form.register('businessActivity')} />
        </FormField>
        <FormField label="RFC" error={form.formState.errors.rfc?.message}>
          <Input maxLength={13} {...form.register('rfc')} />
        </FormField>
        {formError ? <p className="text-danger text-sm">{formError}</p> : null}
        <div className="gap-sm flex">
          <Button type="submit" isLoading={updateCompanyMutation.isPending}>
            Guardar cambios
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setIsEditing(false);
              setFormError(null);
              form.reset({
                name: data.name,
                tradeName: data.tradeName ?? '',
                businessActivity: data.businessActivity,
                rfc: data.rfc ?? '',
              });
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
          <dt className="text-muted-foreground dark:text-muted-foreground-dark">Razón social</dt>
          <dd className="text-foreground dark:text-foreground-dark">{data.name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground dark:text-muted-foreground-dark">
            Nombre comercial
          </dt>
          <dd className="text-foreground dark:text-foreground-dark">{data.tradeName ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground dark:text-muted-foreground-dark">Giro</dt>
          <dd className="text-foreground dark:text-foreground-dark">{data.businessActivity}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground dark:text-muted-foreground-dark">RFC</dt>
          <dd className="text-foreground dark:text-foreground-dark">{data.rfc ?? '—'}</dd>
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
