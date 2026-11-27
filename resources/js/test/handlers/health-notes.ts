import { http, HttpResponse } from 'msw'
import listMaple from '../fixtures/health-notes/list-maple.json'
import created from '../fixtures/health-notes/created.json'
import updated from '../fixtures/health-notes/updated.json'

export const healthNoteHandlers = [
  http.get('/api/dogs/:slug/health-notes', () => HttpResponse.json(listMaple)),
  http.post('/api/dogs/:slug/health-notes', () => HttpResponse.json(created, { status: 201 })),
  http.put('/api/health-notes/:id', () => HttpResponse.json(updated)),
  http.delete('/api/health-notes/:id', () => new HttpResponse(null, { status: 204 })),
]
