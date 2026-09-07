import { http, HttpResponse } from 'msw'
import list from '../fixtures/feeding-logs/list.json'
import created from '../fixtures/feeding-logs/created.json'
import updated from '../fixtures/feeding-logs/updated.json'
import validationError from '../fixtures/feeding-logs/validation-422.json'

interface FeedingLogRequestBody {
  amount?: number | string
  was_skipped?: boolean
  skip_reason?: string | null
}

export const feedingLogHandlers = [
  http.get('/api/feeding-logs', () => HttpResponse.json(list)),
  http.post('/api/dogs/:slug/feeding-logs', async ({ request }) => {
    const body = (await request.json()) as FeedingLogRequestBody
    if (Number(body.amount) === 0 && !body.skip_reason) {
      return HttpResponse.json(validationError, { status: 422 })
    }
    return HttpResponse.json(created, { status: 201 })
  }),
  http.put('/api/feeding-logs/:id', () => HttpResponse.json(updated)),
  http.delete('/api/feeding-logs/:id', () => new HttpResponse(null, { status: 204 })),
]
