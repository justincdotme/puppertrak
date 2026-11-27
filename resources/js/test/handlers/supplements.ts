import { http, HttpResponse } from 'msw'
import list from '../fixtures/supplements/list.json'
import created from '../fixtures/supplements/created.json'
import updated from '../fixtures/supplements/updated.json'
import deleteBlocked from '../fixtures/supplements/delete-blocked-422.json'

// Every seeded supplement except id 5 (Glucosamine chew) is assigned to a
// dog, so deleting it should be rejected.
const UNASSIGNED_SUPPLEMENT_ID = '5'

export const supplementHandlers = [
  http.get('/api/supplements', () => HttpResponse.json(list)),
  http.post('/api/supplements', () => HttpResponse.json(created, { status: 201 })),
  http.put('/api/supplements/:id', () => HttpResponse.json(updated)),
  http.delete('/api/supplements/:id', ({ params }) =>
    params.id === UNASSIGNED_SUPPLEMENT_ID
      ? new HttpResponse(null, { status: 204 })
      : HttpResponse.json(deleteBlocked, { status: 422 })
  ),
]
