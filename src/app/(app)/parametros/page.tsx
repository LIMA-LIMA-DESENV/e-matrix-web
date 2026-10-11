import { redirect } from 'next/navigation'

// Parameters has no page of its own: it opens on its first tab. Non-admins are
// sent to the dashboard by the tab page.
export default function ParametrosPage() {
  redirect('/parametros/atividades')
}
