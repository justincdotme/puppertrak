# Changelog

## [1.0.0] - 2026-11-27

### Added
- Dog profiles with breed, weight, sex, microchip, vaccine dates, allergies, medications, and owner, primary vet and emergency vet contacts
- Age from a date of birth, or from an entered age that counts up from the day it was recorded
- Shared feeding instructions per dog, shown wherever a feeding is logged
- Archive for dogs that won't come back, and a Settings page with a per-dog hide toggle that pauses tracking without losing history
- Feeding plans that tie a food, amount and unit to each dog's scheduled feed times
- Feeding logs that record the meal they belong to, with an unscheduled option and several portions per meal
- Pantry catalog of foods and supplements, with per-dog supplement assignments that can be edited and removed
- Supplement schedules: as needed, every day, or every N days from a start date, each with optional times
- Today view on the dashboard and each dog page with fed, skipped, overdue, upcoming and not-tracked states
- Missed-meal and overdue-supplement alerts per dog, never raised for slots before a schedule existed or while a dog was hidden
- History grouped by day, per dog and across all dogs, with edit and delete on every entry
- Health notes recording when the incident happened
- Docker Compose stack with a Laravel 13 API, React 19 SPA, MySQL 8, queue worker, scheduler and nginx

### Security
- PHP and JavaScript dependencies updated for current security advisories
