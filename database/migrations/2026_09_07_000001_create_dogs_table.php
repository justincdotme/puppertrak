<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('dogs', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('breed')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->unsignedTinyInteger('age_years')->nullable();
            $table->string('sex')->nullable();
            $table->boolean('is_neutered_or_spayed')->default(false);
            $table->decimal('weight', 6, 2)->nullable();
            $table->string('weight_unit')->default('lb');
            $table->string('color_markings')->nullable();
            $table->string('microchip_number')->nullable();
            $table->date('rabies_vaccine_date')->nullable();
            $table->date('da2pp_vaccine_date')->nullable();
            $table->text('other_vaccines')->nullable();
            $table->text('allergies')->nullable();
            $table->text('medical_conditions')->nullable();
            $table->text('current_medications')->nullable();
            $table->string('primary_vet_name')->nullable();
            $table->string('primary_vet_phone')->nullable();
            $table->string('primary_vet_address')->nullable();
            $table->string('emergency_vet_name')->nullable();
            $table->string('emergency_vet_phone')->nullable();
            $table->string('emergency_vet_address')->nullable();
            $table->string('owner_name')->nullable();
            $table->string('owner_phone')->nullable();
            $table->text('notes')->nullable();
            $table->json('feed_times')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dogs');
    }
};
