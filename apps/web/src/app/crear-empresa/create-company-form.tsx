'use client';

import { Button, FormField, Input } from '@contaia/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useCreateCompany } from '@/hooks/use-create-company';
import { ApiError } from '@/lib/http';
import { useSessionStore } from '@/store/use-session-store';

const schema = z.object({
  name: z.string().min(1, 'Ingresa la razón social.').max(255),
  businessActivity: z.string().min(1, 'Ingresa el giro de la empresa.').max(255),
  rfc: z.string().max(13, 'El RFC tiene como máximo 13 caracteres.').optional().or(z.literal('')),
});
type FormValues = z.infer<typeof schema>;

/**
 * UI-0006 — Creación de Empresa (BR-EMP-001). Extiende el flujo de
 * `/seleccionar-empresa` (brain/DECISIONS.md D-005 ya no aplica: el módulo
 * Companies completo llegó con EWO-003). Al crear, la nueva Empresa se
 * vuelve la Empresa activa del cliente (cambio de contexto es solo estado
 * local, docs/08_API_DESIGN.md sección 5 — no una operación de API).
 */
export function CreateCompanyForm(): React.JSX.Element {
  const router = useRouter();
  const setActiveCompany = useSessionStore((state) => state.setActiveCompany);
  const createCompanyMutation = useCreateCompany();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', businessActivity: '', rfc: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const created = await createCompanyMutation.mutateAsync({
        name: values.name,
        businessActivity: values.businessActivity,
        rfc: values.rfc ? values.rfc : undefined,
      });
      setActiveCompany(created.id);
      router.push('/');
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.detail.message : 'No se pudo crear la empresa.',
      );
    }
  });

  return (
    <form onSubmit={onSubmit} className="gap-md flex flex-col" noValidate>
      <FormField label="Razón social" required error={form.formState.errors.name?.message}>
        <Input autoComplete="organization" {...form.register('name')} />
      </FormField>
      <FormField
        label="Giro"
        required
        helpText="A qué se dedica la empresa (por ejemplo: comercio al por menor, servicios de consultoría)."
        error={form.formState.errors.businessActivity?.message}
      >
        <Input {...form.register('businessActivity')} />
      </FormField>
      <FormField
        label="RFC"
        helpText="Opcional. Puedes agregarlo más adelante desde el perfil de la empresa."
        error={form.formState.errors.rfc?.message}
      >
        <Input maxLength={13} {...form.register('rfc')} />
      </FormField>
      {formError ? <p className="text-danger text-sm">{formError}</p> : null}
      <Button type="submit" isLoading={createCompanyMutation.isPending}>
        Crear empresa
      </Button>
    </form>
  );
}
