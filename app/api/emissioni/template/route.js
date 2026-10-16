import { creaTemplateEmissioni } from "../../../../lib/emissioni-xlsx";

export const dynamic = "force-dynamic";

// Scarica il template Excel per caricare l'anagrafica clienti emissioni
export async function GET() {
  const buffer = await creaTemplateEmissioni();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-clienti-emissioni.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
