import * as XLSX from 'xlsx';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function importCompanyWorkbook(fileBuffer: Buffer) {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

  // 1. Company Overview Sheet
  const overviewSheet = workbook.Sheets['Company Overview'];
  if (!overviewSheet) throw new Error("Missing 'Company Overview' sheet.");

  const ovRows: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(overviewSheet, { header: 1 });
  const getCell = (r: number, c: number): string => {
    const row = ovRows[r];
    if (!row) return '';
    const cell = row[c];
    return cell !== undefined && cell !== null ? String(cell).trim() : '';
  };

  const companyName = getCell(2, 1) || 'CBZ Holdings Limited';
  const natureOps = getCell(3, 1);
  const prodServices = getCell(4, 1);
  const marketsServed = getCell(5, 1);
  const marketShare = getCell(6, 1);
  const listings = getCell(7, 1);

  const corpInfoMap: Record<string, string> = {};
  for (let r = 11; r < ovRows.length; r++) {
    const k = getCell(r, 0);
    const v = getCell(r, 1);
    if (k && k !== 'Corporate Information Item') corpInfoMap[k] = v;
  }

  const { data: company, error: compErr } = await supabaseAdmin
    .from('companies')
    .upsert(
      {
        ticker: 'CBZH.zw',
        name: companyName,
        country: corpInfoMap['Country of Incorporation'] || 'Zimbabwe',
        sector: 'Banking & Financial Services',
        website: corpInfoMap['Company Website'] || '',
        email: corpInfoMap['Company Email'] || '',
        registered_address: corpInfoMap['Registered Address'] || '',
        postal_address: corpInfoMap['Postal Address'] || '',
        telephone: corpInfoMap['Telephone'] || '',
        branches: corpInfoMap['Branches'] || '',
        workforce: corpInfoMap['Workforce'] || '',
        listings,
        nature_of_operations: natureOps,
        products_services: prodServices,
        markets_served: marketsServed,
        market_share: marketShare,
      },
      { onConflict: 'ticker' }
    )
    .select('id')
    .single();

  if (compErr || !company) throw new Error(`Company creation failed: ${compErr?.message || 'Unknown error'}`);
  const companyId = company.id;

  // Clear existing records before importing new ones
  await Promise.all([
    supabaseAdmin.from('shareholders').delete().eq('company_id', companyId),
    supabaseAdmin.from('subsidiaries').delete().eq('company_id', companyId),
    supabaseAdmin.from('credit_ratings').delete().eq('company_id', companyId),
    supabaseAdmin.from('directors').delete().eq('company_id', companyId),
  ]);

  // Parse Shareholders (Cols D, E, F)
  const shareholders: Array<{ company_id: string; shareholder_name: string; percentage: string; reporting_date: string }> = [];
  for (let r = 11; r < ovRows.length; r++) {
    const name = getCell(r, 3);
    const pct = getCell(r, 4);
    const date = getCell(r, 5);
    if (name && name !== 'Shareholder name') {
      shareholders.push({ company_id: companyId, shareholder_name: name, percentage: pct, reporting_date: date });
    }
  }
  if (shareholders.length > 0) await supabaseAdmin.from('shareholders').insert(shareholders);

  // Parse Subsidiaries (Cols H, I, J)
  const subsidiaries: Array<{ company_id: string; subsidiary_name: string; shareholding_pct: string; purpose: string }> = [];
  for (let r = 11; r < ovRows.length; r++) {
    const subName = getCell(r, 7);
    const holding = getCell(r, 8);
    const purpose = getCell(r, 9);
    if (subName && subName !== 'Subsidiary') {
      subsidiaries.push({ company_id: companyId, subsidiary_name: subName, shareholding_pct: holding, purpose });
    }
  }
  if (subsidiaries.length > 0) await supabaseAdmin.from('subsidiaries').insert(subsidiaries);

  // Parse Credit Ratings (Cols L, M)
  const ratings: Array<{ company_id: string; entity_name: string; rating: string }> = [];
  for (let r = 11; r < ovRows.length; r++) {
    const entity = getCell(r, 11);
    const rating = getCell(r, 12);
    if (entity && entity !== 'Entity name') {
      ratings.push({ company_id: companyId, entity_name: entity, rating });
    }
  }
  if (ratings.length > 0) await supabaseAdmin.from('credit_ratings').insert(ratings);

  // 2. Directors and Management Sheet
  const dmSheet = workbook.Sheets['Directors and Management'];
  if (dmSheet) {
    const dmRows: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(dmSheet, { header: 1 });
    let category: 'Board' | 'Executive' = 'Board';
    const directorsList: Array<{
      company_id: string;
      person_name: string;
      role_title: string;
      board_committees: string;
      appointed_date: string;
      profile: string;
      other_directorships: string;
      category: 'Board' | 'Executive';
    }> = [];

    for (let r = 1; r < dmRows.length; r++) {
      const row = dmRows[r];
      if (!row) continue;
      const name = row[0] !== undefined && row[0] !== null ? String(row[0]).trim() : '';
      if (!name) continue;

      if (name.toLowerCase() === 'name') {
        if (directorsList.length > 0) category = 'Executive';
        continue;
      }

      directorsList.push({
        company_id: companyId,
        person_name: name,
        role_title: row[1] !== undefined && row[1] !== null ? String(row[1]).trim() : '',
        board_committees: row[2] !== undefined && row[2] !== null ? String(row[2]).trim() : '',
        appointed_date: row[3] !== undefined && row[3] !== null ? String(row[3]).trim() : '',
        profile: row[4] !== undefined && row[4] !== null ? String(row[4]).trim() : '',
        other_directorships: row[5] !== undefined && row[5] !== null ? String(row[5]).trim() : '',
        category,
      });
    }
    if (directorsList.length > 0) await supabaseAdmin.from('directors').insert(directorsList);
  }

  // 3. Financial Statements & Ratios
  const statements = [
    { name: 'Income Statement', code: 'pnl' },
    { name: 'Balance Sheet', code: 'bs' },
    { name: 'Statement of Changes in Equity', code: 'soce' },
    { name: 'Cashflow Statement', code: 'cf' },
    { name: 'Ratios', code: 'ratios' },
  ];

  for (const stmt of statements) {
    const sheet = workbook.Sheets[stmt.name];
    if (!sheet) continue;

    const rows: (string | number | undefined)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (rows.length < 9) continue;

    const periodEndings = rows[0].slice(1);
    const accountingMethods = rows[1]?.slice(1) || [];
    const periodLengths = rows[2]?.slice(1) || [];
    const currencies = rows[4]?.slice(1) || [];
    const auditors = rows[5]?.slice(1) || [];
    const opinions = rows[6]?.slice(1) || [];
    const units = rows[7]?.slice(1) || [];

    const periodIdMap: Record<number, string> = {};

    for (let c = 0; c < periodEndings.length; c++) {
      const pStr = String(periodEndings[c] || '');
      const yrMatch = pStr.match(/\b(20\d{2})\b/);
      if (!yrMatch) continue;

      const fiscalYear = parseInt(yrMatch[1], 10);
      const colIdx = c + 1;

      const { data: period } = await supabaseAdmin
        .from('financial_periods')
        .upsert(
          {
            company_id: companyId,
            fiscal_year: fiscalYear,
            period_type: 'FY',
            period_end_date: pStr,
            accounting_method: String(accountingMethods[c] || 'Historical'),
            period_length_months: parseInt(String(periodLengths[c] || 12), 10),
            reporting_currency: String(currencies[c] || 'ZWG'),
            auditor_name: String(auditors[c] || ''),
            audit_opinion: String(opinions[c] || ''),
            units_of_reporting: String(units[c] || ''),
          },
          { onConflict: 'company_id,fiscal_year,period_type' }
        )
        .select('id')
        .single();

      if (period) periodIdMap[colIdx] = period.id;
    }

    for (let r = 9; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row[0]) continue;

      const lineLabel = String(row[0]).trim();
      const lineCode = `${stmt.code}_${lineLabel.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const isHeader = lineLabel === lineLabel.toUpperCase() && !row.slice(1).some((v) => v !== null && v !== undefined && v !== '');
      const isTotal = lineLabel.toLowerCase().includes('total') || lineLabel.toLowerCase().includes('profit');

      const { data: lineItem } = await supabaseAdmin
        .from('financial_line_items')
        .upsert(
          {
            statement_type: stmt.code,
            line_code: lineCode,
            label: lineLabel,
            sort_order: r * 10,
            is_header: isHeader,
            is_total: isTotal,
          },
          { onConflict: 'statement_type,line_code' }
        )
        .select('id')
        .single();

      if (!lineItem) continue;

      for (const [colIdxStr, periodId] of Object.entries(periodIdMap)) {
        const colIdx = parseInt(colIdxStr, 10);
        const rawVal = row[colIdx];
        if (rawVal === undefined || rawVal === null || rawVal === '') continue;

        let numericVal: number | null = null;
        let textVal: string | null = null;

        if (typeof rawVal === 'number') {
          numericVal = rawVal;
        } else {
          const str = String(rawVal).trim();
          const cleanStr = str.replace(/,/g, '');
          if (/^\(.*\)$/.test(cleanStr)) {
            numericVal = -parseFloat(cleanStr.replace(/[()]/g, ''));
          } else if (!isNaN(parseFloat(cleanStr))) {
            numericVal = parseFloat(cleanStr);
          } else {
            textVal = str;
          }
        }

        await supabaseAdmin.from('financial_values').upsert(
          {
            company_id: companyId,
            period_id: periodId,
            line_item_id: lineItem.id,
            amount: numericVal,
            amount_text: textVal,
          },
          { onConflict: 'company_id,period_id,line_item_id' }
        );
      }
    }
  }

  return { success: true, companyId };
}
