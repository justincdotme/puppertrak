import { http, HttpResponse } from 'msw'
import listMaple from '../fixtures/feeding-plans/list-maple.json'
import created from '../fixtures/feeding-plans/created.json'
import updated from '../fixtures/feeding-plans/updated.json'

export const feedingPlanHandlers = [
  http.get('/api/dogs/:slug/feeding-plans', () => HttpResponse.json(listMaple)),
  http.post('/api/dogs/:slug/feeding-plans', () => HttpResponse.json(created, { status: 201 })),
  http.put('/api/feeding-plans/:id', () => HttpResponse.json(updated)),
  http.delete('/api/feeding-plans/:id', () => new HttpResponse(null, { status: 204 })),
]
