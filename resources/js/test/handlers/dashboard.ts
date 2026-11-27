import { http, HttpResponse } from 'msw'
import today from '../fixtures/dashboard/today.json'

interface DashboardEntry {
  dog: { slug: string }
}

const entries = (today as { data: DashboardEntry[] }).data

export const dashboardHandlers = [
  http.get('/api/dashboard/today', () => HttpResponse.json(today)),
  http.get('/api/dogs/:slug/today', ({ params }) => {
    const entry = entries.find(candidate => candidate.dog.slug === params.slug)
    return entry ? HttpResponse.json({ data: entry }) : new HttpResponse(null, { status: 404 })
  }),
]
