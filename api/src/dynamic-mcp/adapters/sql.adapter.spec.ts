import { buildQuestionMarkQuery } from './sql.adapter';

describe('SQL adapter parameterization', () => {
  it('converts named placeholders to question marks while preserving value order', () => {
    expect(buildQuestionMarkQuery(
      'select * from invoices where customer_id = :customerId and status = :status',
      { customerId: 42, status: 'open' },
    )).toEqual({
      text: 'select * from invoices where customer_id = ? and status = ?',
      values: [42, 'open'],
    });
  });

  it('binds repeated placeholders for every positional occurrence', () => {
    expect(buildQuestionMarkQuery('select :id as first_id, :id as second_id', { id: 7 })).toEqual({
      text: 'select ? as first_id, ? as second_id',
      values: [7, 7],
    });
  });
});
