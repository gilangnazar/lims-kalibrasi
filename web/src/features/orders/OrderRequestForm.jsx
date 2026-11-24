import { useFieldArray } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

import MainCard from 'components/MainCard';
import { getError, SelectField, TextField } from 'components/form/Fields';
import { api } from 'lib/api';
import { useList } from 'lib/useResource';
import { useZodForm } from 'lib/useZodForm';
import { optionalText, requiredText } from 'lib/zodFields';
import ItemFields, { EMPTY_ITEM, itemSchema } from './ItemFields';

const blankToUndefined = (value) => (value === '' ? undefined : value);

export const requestSchema = z.object({
  customer_id: z.coerce.number({ message: 'Pilih pelanggan' }).int().positive('Pilih pelanggan'),
  contact_name: optionalText(100),
  contact_phone: optionalText(30),
  contact_email: z.preprocess((value) => (value === '' ? null : value), z.email('Email tidak valid').max(150).nullable()),
  // Blank = the customer's name and address (filled in by the API).
  certificate_name: z.preprocess(blankToUndefined, z.string().trim().max(150).optional()),
  certificate_address: z.preprocess(blankToUndefined, z.string().trim().max(2000).optional()),
  calibrated_before: z.boolean(),
  apply_ppn: z.boolean(),
  apply_pph23: z.boolean(),
  request_notes: optionalText(2000),
  items: z.array(itemSchema).min(1, 'Minimal satu alat'),
  other_costs: z.array(
    z.object({
      description: requiredText(255),
      qty: z.coerce.number().positive('Harus lebih dari 0'),
      unit: optionalText(30)
    })
  )
});

const EMPTY = {
  customer_id: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  certificate_name: '',
  certificate_address: '',
  calibrated_before: false,
  apply_ppn: true,
  apply_pph23: false,
  request_notes: '',
  items: [EMPTY_ITEM],
  other_costs: []
};

// Formulir Permintaan Kalibrasi, entered by staff for the customer. A row with Jumlah N becomes N items.
export default function OrderRequestForm({ onCreated }) {
  const navigate = useNavigate();
  const form = useZodForm({
    schema: requestSchema,
    defaultValues: EMPTY,
    onSubmit: async (values) => {
      const res = await api.post('/orders', values);
      if (onCreated) onCreated(res.data);
      else navigate(`/orders/${res.data.id}`);
    }
  });
  const items = useFieldArray({ control: form.control, name: 'items' });
  const costs = useFieldArray({ control: form.control, name: 'other_costs' });

  const customerId = Number(form.watch('customer_id')) || undefined;
  const { rows: customers } = useList('customers', { limit: 100, sort: 'company_name' });
  const { rows: methods } = useList('methods', { limit: 100, sort: 'name' });
  const { rows: equipment } = useList('equipment', { limit: 100, customer_id: customerId }, { enabled: Boolean(customerId) });
  const customer = customers.find((row) => row.id === customerId);
  const itemsError = form.formState.errors.items?.message ?? form.formState.errors.items?.root?.message;

  return (
    <MainCard title="Permintaan Kalibrasi Baru">
      <Form noValidate onSubmit={form.submit}>
        {form.formError && <Alert variant="danger">{form.formError}</Alert>}
        <Row className="g-3">
          <Col md={6}>
            <SelectField
              form={form}
              name="customer_id"
              label="Pelanggan"
              placeholder="— Pilih pelanggan —"
              options={customers.map((c) => ({ value: c.id, label: `${c.code} · ${c.company_name}` }))}
            />
          </Col>
          <Col md={6}>
            <TextField form={form} name="contact_name" label="Nama Kontak" />
          </Col>
          <Col md={6}>
            <TextField form={form} name="contact_phone" label="Telepon Kontak" />
          </Col>
          <Col md={6}>
            <TextField form={form} name="contact_email" label="Email Kontak" type="email" />
          </Col>
          <Col md={6}>
            <TextField
              form={form}
              name="certificate_name"
              label="Nama pada Sertifikat"
              placeholder={customer?.company_name ?? 'Sama dengan pelanggan'}
            />
          </Col>
          <Col md={6}>
            <TextField
              form={form}
              name="certificate_address"
              label="Alamat pada Sertifikat"
              as="textarea"
              rows={1}
              placeholder={customer?.address ?? 'Sama dengan pelanggan'}
            />
          </Col>
          <Col md={12} className="d-flex flex-wrap gap-4">
            <Form.Check
              type="checkbox"
              id="field-calibrated_before"
              label="Pernah kalibrasi di Lichem"
              {...form.register('calibrated_before')}
            />
            <Form.Check type="checkbox" id="field-apply_ppn" label="PPN" {...form.register('apply_ppn')} />
            <Form.Check type="checkbox" id="field-apply_pph23" label="PPh 23" {...form.register('apply_pph23')} />
          </Col>
        </Row>

        <h6 className="mt-4">Alat yang Dikalibrasi</h6>
        {itemsError && <div className="text-danger small mb-2">{itemsError}</div>}
        {items.fields.map((field, index) => (
          <Card key={field.id} className="mb-3 border">
            <Card.Body className="p-3">
              <div className="d-flex justify-content-between mb-2">
                <strong>Baris {index + 1}</strong>
                {items.fields.length > 1 && (
                  <Button size="sm" variant="outline-danger" onClick={() => items.remove(index)} aria-label={`Hapus baris ${index + 1}`}>
                    <i className="ph ph-trash" />
                  </Button>
                )}
              </div>
              <ItemFields form={form} prefix={`items.${index}.`} methods={methods} equipment={equipment} />
            </Card.Body>
          </Card>
        ))}
        <Button size="sm" variant="light-primary" onClick={() => items.append(EMPTY_ITEM)}>
          + Tambah alat
        </Button>

        <h6 className="mt-4">Biaya Lain-lain</h6>
        {costs.fields.map((field, index) => (
          <Row key={field.id} className="g-2 mb-2 align-items-start">
            <Col md={6}>
              <Form.Control
                size="sm"
                placeholder="Keterangan (mis. Transport dan Engineer)"
                aria-label={`Keterangan biaya ${index + 1}`}
                isInvalid={Boolean(getError(form.formState.errors, `other_costs.${index}.description`))}
                {...form.register(`other_costs.${index}.description`)}
              />
            </Col>
            <Col md={2}>
              <Form.Control
                size="sm"
                type="number"
                step="any"
                aria-label={`Jumlah biaya ${index + 1}`}
                {...form.register(`other_costs.${index}.qty`)}
              />
            </Col>
            <Col md={3}>
              <Form.Control
                size="sm"
                placeholder="Satuan (mis. Day)"
                aria-label={`Satuan biaya ${index + 1}`}
                {...form.register(`other_costs.${index}.unit`)}
              />
            </Col>
            <Col md={1}>
              <Button size="sm" variant="outline-danger" onClick={() => costs.remove(index)} aria-label={`Hapus biaya ${index + 1}`}>
                <i className="ph ph-trash" />
              </Button>
            </Col>
          </Row>
        ))}
        <Button size="sm" variant="light-primary" onClick={() => costs.append({ description: '', qty: 1, unit: '' })}>
          + Tambah biaya
        </Button>

        <TextField form={form} name="request_notes" label="Catatan Permintaan" as="textarea" rows={2} />

        <div className="d-flex justify-content-end gap-2 mt-3">
          <Button variant="secondary" onClick={() => navigate('/orders')} disabled={form.formState.isSubmitting}>
            Batal
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Menyimpan...' : 'Simpan Permintaan'}
          </Button>
        </div>
      </Form>
    </MainCard>
  );
}
