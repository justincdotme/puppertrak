import { http, HttpResponse } from 'msw'
import listMaple from '../fixtures/dog-supplements/list-maple.json'
import created from '../fixtures/dog-supplements/created.json'
import updated from '../fixtures/dog-supplements/updated.json'

export const dogSupplementHandlers = [
  http.get('/api/dogs/:slug/supplements', () => HttpResponse.json(listMaple)),
  http.post('/api/dogs/:slug/supplements', () => HttpResponse.json(created, { status: 201 })),
  http.put('/api/dog-supplements/:id', () => HttpResponse.json(updated)),
  http.delete('/api/dog-supplements/:id', () => new HttpResponse(null, { status: 204 })),
]
