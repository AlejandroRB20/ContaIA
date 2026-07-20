import { cloneElement, useId, type ReactElement } from 'react';

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  helpText?: string;
  required?: boolean;
  children: ReactElement<{ id?: string; 'aria-describedby'?: string; hasError?: boolean }>;
}

/**
 * docs/13_DESIGN_SYSTEM.md seccion 18 — label siempre visible, texto de
 * ayuda bajo el campo, error cerca del campo (nunca solo un resumen global).
 */
export function FormField({
  label,
  htmlFor,
  error,
  helpText,
  required = false,
  children,
}: FormFieldProps): React.JSX.Element {
  const generatedId = useId();
  const fieldId = htmlFor ?? generatedId;
  const describedById = error ? `${fieldId}-error` : helpText ? `${fieldId}-help` : undefined;

  const field = cloneElement(children, {
    id: fieldId,
    'aria-describedby': describedById,
    hasError: Boolean(error),
  });

  return (
    <div className="gap-xs flex flex-col">
      <label
        htmlFor={fieldId}
        className="text-foreground dark:text-foreground-dark text-sm font-medium"
      >
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {field}
      {error ? (
        <p id={`${fieldId}-error`} role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : helpText ? (
        <p
          id={`${fieldId}-help`}
          className="text-muted-foreground dark:text-muted-foreground-dark text-sm"
        >
          {helpText}
        </p>
      ) : null}
    </div>
  );
}
