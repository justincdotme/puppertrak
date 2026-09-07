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
            $table->dateTime('feed_times_set_at')->nullable()->after('feed_times');
        });

        DB::table('dogs')->update(['feed_times_set_at' => DB::raw('created_at')]);
    }

    public function down(): void
    {
        Schema::table('dogs', function (Blueprint $table) {
            $table->dropColumn('feed_times_set_at');
        });
    }
};
