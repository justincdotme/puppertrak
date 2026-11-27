import { http, HttpResponse } from 'msw'
import list from '../fixtures/supplement-logs/list.json'
import created from '../fixtures/supplement-logs/created.json'
import updated from '../fixtures/supplement-logs/updated.json'

export const supplementLogHandlers = [
  http.get('/api/supplement-logs', () => HttpResponse.json(list)),
  http.post('/api/dogs/:slug/supplement-logs', () => HttpResponse.json(created, { status: 201 })),
  http.put('/api/supplement-logs/:id', () => HttpResponse.json(updated)),
  http.delete('/api/supplement-logs/:id', () => new HttpResponse(null, { status: 204 })),
]
