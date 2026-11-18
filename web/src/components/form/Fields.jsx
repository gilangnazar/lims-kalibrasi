import Form from 'react-bootstrap/Form';

// Reads a nested error like "parameter_schema.0.name" from react-hook-form's errors object.
export function getError(errors, name) {
  return name.split('.').reduce((node, key) => node?.[key], errors)?.message;
}

/** Text / textarea / date input bound to a useZodForm() form. */
export function TextField({ form, name, label, type = 'text', as, rows, disabled, placeholder, autoComplete }) {
  const error = getError(form.formState.errors, name);
  return (
    <Form.Group className="mb-3" controlId={`field-${name}`}>
      {label && <Form.Label>{label}</Form.Label>}
      <Form.Control
        as={as}
        type={as ? undefined : type}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoComplete}
        isInvalid={Boolean(error)}
        {...form.register(name)}
      />
      <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
    </Form.Group>
  );
}

/** <select>; options: [{ value, label }]. Pass setValueAs to convert (e.g. to Number). */
export function SelectField({ form, name, label, options, placeholder, setValueAs, disabled }) {
  const error = getError(form.formState.errors, name);
  return (
    <Form.Group className="mb-3" controlId={`field-${name}`}>
      <Form.Label>{label}</Form.Label>
      <Form.Select isInvalid={Boolean(error)} disabled={disabled} {...form.register(name, setValueAs ? { setValueAs } : undefined)}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Form.Select>
      <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
    </Form.Group>
  );
}
