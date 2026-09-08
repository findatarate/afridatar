import { NextRequest, NextResponse } from 'next/server';
import { importCompanyWorkbook } from '@/lib/services/excelImporter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await importCompanyWorkbook(buffer);

    return NextResponse.json({
      message: `Workbook '${file.name}' successfully imported!`,
      result,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Import failed.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
