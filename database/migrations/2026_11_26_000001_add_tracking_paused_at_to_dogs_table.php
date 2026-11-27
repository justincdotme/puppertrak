<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dogs', function (Blueprint $table) {
            $table->timestamp('tracking_paused_at')->nullable()->after('hidden_at');
        });
    }

    public function down(): void
    {
        Schema::table('dogs', function (Blueprint $table) {
            $table->dropColumn('tracking_paused_at');
        });
    }
};
