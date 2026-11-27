import { http, HttpResponse } from 'msw'
import list from '../fixtures/dogs/list.json'
import archived from '../fixtures/dogs/archived.json'
import listWithHidden from '../fixtures/dogs/list-with-hidden.json'
import detailMaple from '../fixtures/dogs/detail-maple.json'
import detailOdie from '../fixtures/dogs/detail-odie.json'
import created from '../fixtures/dogs/created.json'
import updated from '../fixtures/dogs/updated.json'
import archiveResponse from '../fixtures/dogs/archive-response.json'
import unarchiveResponse from '../fixtures/dogs/unarchive-response.json'
import hideResponse from '../fixtures/dogs/hide-response.json'

const detailBySlug: Record<string, object> = {
  maple: detailMaple,
  odie: detailOdie,
}

export const dogHandlers = [
  http.get('/api/dogs', ({ request }) => {
    const url = new URL(request.url)
    const archivedOnly = url.searchParams.get('archived') === '1'
    const includeHidden = url.searchParams.get('include_hidden') === '1'

    if (archivedOnly) {
      return HttpResponse.json(archived)
    }
    if (includeHidden) {
      return HttpResponse.json(listWithHidden)
    }
    return HttpResponse.json(list)
  }),
  http.get('/api/dogs/:slug', ({ params }) => {
    const detail = detailBySlug[String(params.slug)]
    return detail ? HttpResponse.json(detail) : new HttpResponse(null, { status: 404 })
  }),
  http.post('/api/dogs', () => HttpResponse.json(created, { status: 201 })),
  http.put('/api/dogs/:slug', () => HttpResponse.json(updated)),
  http.post('/api/dogs/:slug/archive', () => HttpResponse.json(archiveResponse)),
  http.post('/api/dogs/:slug/unarchive', () => HttpResponse.json(unarchiveResponse)),
  http.post('/api/dogs/:slug/hide', () => HttpResponse.json(hideResponse)),
  http.post('/api/dogs/:slug/unhide', () => {
    return HttpResponse.json({ data: { ...hideResponse.data, hidden_at: null } })
  }),
]
