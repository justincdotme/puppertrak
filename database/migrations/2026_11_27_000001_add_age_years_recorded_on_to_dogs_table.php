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
        Schema::table('dogs', function (Blueprint $table) {
            $table->date('age_years_recorded_on')->nullable()->after('age_years');
        });

        // The last edit is the latest moment the age could have been entered, so
        // anchoring there can only undercount, never invent a birthday.
        DB::table('dogs')
            ->whereNotNull('age_years')
            ->get(['id', 'updated_at', 'created_at'])
            ->each(fn (object $dog) => DB::table('dogs')
                ->where('id', $dog->id)
                ->update(['age_years_recorded_on' => substr((string) ($dog->updated_at ?? $dog->created_at), 0, 10)]));
    }

    public function down(): void
    {
        Schema::table('dogs', function (Blueprint $table) {
            $table->dropColumn('age_years_recorded_on');
        });
    }
};
