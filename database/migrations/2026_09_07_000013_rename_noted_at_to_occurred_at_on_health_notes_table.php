<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('health_notes', function (Blueprint $table) {
            $table->renameColumn('noted_at', 'occurred_at');
        });
    }

    public function down(): void
    {
        Schema::table('health_notes', function (Blueprint $table) {
            $table->renameColumn('occurred_at', 'noted_at');
        });
    }
};
