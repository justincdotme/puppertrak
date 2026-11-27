<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dog_supplements', function (Blueprint $table) {
            $table->string('frequency', 20)->default('as_needed')->after('times');
            $table->unsignedSmallInteger('interval_days')->nullable()->after('frequency');
            $table->date('start_date')->nullable()->after('interval_days');
        });

        // Decoding in PHP because MySQL compares JSON columns by type, so a
        // string match against '[]' never excludes empty arrays there.
        $timedIds = DB::table('dog_supplements')
            ->whereNotNull('times')
            ->get(['id', 'times'])
            ->filter(function (object $row): bool {
                $times = json_decode((string) $row->times, true);

                return is_array($times) && count($times) > 0;
            })
            ->pluck('id');

        DB::table('dog_supplements')
            ->whereIn('id', $timedIds)
            ->update(['frequency' => 'daily']);
    }

    public function down(): void
    {
        Schema::table('dog_supplements', function (Blueprint $table) {
            $table->dropColumn(['frequency', 'interval_days', 'start_date']);
        });
    }
};
