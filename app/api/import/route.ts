import { NextRequest, NextResponse } from 'next/server';
import { importCompanyWorkbook } from '@/lib/services/excelImporter';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await importCompanyWorkbook(buffer);

    return NextResponse.json({
      message: `Workbook '${file.name}' successfully imported to Capital IQ schema!`,
      result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Import failed.' }, { status: 500 });
  }
}
