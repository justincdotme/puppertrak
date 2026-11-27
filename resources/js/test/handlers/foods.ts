import { http, HttpResponse } from 'msw'
import list from '../fixtures/foods/list.json'
import created from '../fixtures/foods/created.json'
import updated from '../fixtures/foods/updated.json'
import deleteBlocked from '../fixtures/foods/delete-blocked-422.json'

// Every seeded food except id 4 (Blue Buffalo Wilderness) is still on a
// feeding plan, so deleting it should be rejected.
const UNASSIGNED_FOOD_ID = '4'

export const foodHandlers = [
  http.get('/api/foods', () => HttpResponse.json(list)),
  http.post('/api/foods', () => HttpResponse.json(created, { status: 201 })),
  http.put('/api/foods/:id', () => HttpResponse.json(updated)),
  http.delete('/api/foods/:id', ({ params }) =>
    params.id === UNASSIGNED_FOOD_ID
      ? new HttpResponse(null, { status: 204 })
      : HttpResponse.json(deleteBlocked, { status: 422 })
  ),
]
