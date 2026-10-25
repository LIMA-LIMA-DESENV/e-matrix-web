import { redirect } from 'next/navigation'

// Projects has no page of its own: it opens on its first tab, keeping the
// query, so a link with `?period=` lands on the same slice (J1, FR-031).
export default async function ProjetosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) query.append(key, item)
    }
  }

  const search = query.toString()
  redirect(search ? `/projetos/producao?${search}` : '/projetos/producao')
}
