import { z } from 'zod';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

import { getError } from 'components/form/Fields';
import { optionalText, requiredText } from 'lib/zodFields';

const blankToNull = (value) => (value === '' || value === undefined ? null : value);

/** One instrument row of the request (Formulir Permintaan Kalibrasi). */
export const itemSchema = z.object({
  equipment_id: z.preprocess(blankToNull, z.coerce.number().int().positive().nullable()),
  method_id: z.coerce.number({ message: 'Pilih metode' }).int().positive('Pilih metode'),
  qty: z.coerce.number().int('Bilangan bulat').min(1, 'Minimal 1').max(100),
  instrument_name: requiredText(150),
  brand: optionalText(100),
  model: optionalText(100),
  serial_number: optionalText(100),
  identity_no: optionalText(100),
  range: optionalText(100),
  resolution: optionalText(100),
  extra_specs: z.record(z.string(), z.string().trim().max(255)).optional(),
  calibration_point: optionalText(255),
  usage_range: optionalText(255),
  location: z.enum(['in_lab', 'on_site'])
});

export const EMPTY_ITEM = {
  equipment_id: '',
  method_id: '',
  qty: 1,
  instrument_name: '',
  brand: '',
  model: '',
  serial_number: '',
  identity_no: '',
  range: '',
  resolution: '',
  extra_specs: {},
  calibration_point: '',
  usage_range: '',
  location: 'in_lab'
};

const COPIED = ['instrument_name', 'brand', 'model', 'serial_number', 'identity_no', 'range', 'resolution'];

function Input({ form, name, label, ...props }) {
  const error = getError(form.formState.errors, name);
  return (
    <Form.Group controlId={`field-${name}`}>
      <Form.Label className="small mb-1">{label}</Form.Label>
      <Form.Control size="sm" isInvalid={Boolean(error)} {...props} {...form.register(name)} />
      <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
    </Form.Group>
  );
}

/**
 * Fields of one item, bound at `prefix` (e.g. "items.0." in the request, "" when editing one item).
 * Picking an instrument from the customer's registry copies its data; the method decides the extra fields.
 */
export default function ItemFields({ form, prefix = '', methods, equipment, showQty = true }) {
  const name = (field) => `${prefix}${field}`;
  const methodId = Number(form.watch(name('method_id')));
  const extraFields = methods.find((method) => method.id === methodId)?.extra_spec_fields ?? [];
  const methodError = getError(form.formState.errors, name('method_id'));

  const pickEquipment = (event) => {
    const picked = equipment.find((row) => row.id === Number(event.target.value));
    form.setValue(name('equipment_id'), event.target.value);
    if (picked) {
      // The registry calls it `name`; the item keeps it as `instrument_name`.
      const source = { ...picked, instrument_name: picked.name };
      for (const field of COPIED) form.setValue(name(field), source[field] ?? '', { shouldValidate: field === 'instrument_name' });
    }
  };

  return (
    <Row className="g-2">
      <Col md={4}>
        <Form.Group controlId={`field-${name('equipment_id')}`}>
          <Form.Label className="small mb-1">Dari daftar alat pelanggan</Form.Label>
          <Form.Select size="sm" value={form.watch(name('equipment_id')) ?? ''} onChange={pickEquipment}>
            <option value="">— Alat baru / ketik manual —</option>
            {equipment.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} {row.brand ? `· ${row.brand}` : ''} {row.serial_number ? `· ${row.serial_number}` : ''}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
      </Col>
      <Col md={showQty ? 6 : 8}>
        <Form.Group controlId={`field-${name('method_id')}`}>
          <Form.Label className="small mb-1">Metode</Form.Label>
          <Form.Select size="sm" isInvalid={Boolean(methodError)} {...form.register(name('method_id'))}>
            <option value="">— Pilih metode —</option>
            {methods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.code ? `${method.code} · ` : ''}
                {method.name}
              </option>
            ))}
          </Form.Select>
          <Form.Control.Feedback type="invalid">{methodError}</Form.Control.Feedback>
        </Form.Group>
      </Col>
      {showQty && (
        <Col md={2}>
          <Input form={form} name={name('qty')} label="Jumlah" type="number" min={1} />
        </Col>
      )}
      <Col md={4}>
        <Input form={form} name={name('instrument_name')} label="Nama Alat" />
      </Col>
      <Col md={4}>
        <Input form={form} name={name('brand')} label="Merek" />
      </Col>
      <Col md={4}>
        <Input form={form} name={name('model')} label="Tipe" />
      </Col>
      <Col md={4}>
        <Input form={form} name={name('serial_number')} label="No. Seri" />
      </Col>
      <Col md={4}>
        <Input form={form} name={name('identity_no')} label="No. Identitas" />
      </Col>
      <Col md={2}>
        <Input form={form} name={name('range')} label="Kapasitas" />
      </Col>
      <Col md={2}>
        <Input form={form} name={name('resolution')} label="Ketelitian" />
      </Col>
      {extraFields.map((field) => (
        <Col md={4} key={field}>
          <Input form={form} name={name(`extra_specs.${field}`)} label={field} />
        </Col>
      ))}
      <Col md={4}>
        <Input form={form} name={name('calibration_point')} label="Titik Ukur" />
      </Col>
      <Col md={4}>
        <Input form={form} name={name('usage_range')} label="Rentang Pemakaian" />
      </Col>
      <Col md={4}>
        <Form.Label className="small mb-1 d-block">Lokasi Kalibrasi</Form.Label>
        <Form.Check
          inline
          type="radio"
          id={`${name('location')}-in_lab`}
          label="Di Lab"
          value="in_lab"
          {...form.register(name('location'))}
        />
        <Form.Check
          inline
          type="radio"
          id={`${name('location')}-on_site`}
          label="On-site"
          value="on_site"
          {...form.register(name('location'))}
        />
      </Col>
    </Row>
  );
}
