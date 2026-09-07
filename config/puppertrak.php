<?php

declare(strict_types=1);

return [
    'reminder_variance_minutes' => (int) env('PUPPERTRAK_REMINDER_VARIANCE_MINUTES', 120),
    'health_note_recent_hours'  => (int) env('PUPPERTRAK_HEALTH_NOTE_RECENT_HOURS', 24),
];
