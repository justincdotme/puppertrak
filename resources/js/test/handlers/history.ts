import { http, HttpResponse } from 'msw'
import mapleHistory from '../fixtures/history/maple-7days.json'

export const historyHandlers = [
  http.get('/api/dogs/:slug/history', () => HttpResponse.json(mapleHistory)),
]
