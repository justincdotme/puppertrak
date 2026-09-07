<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * All existing rows were written through the SPA, which sent UTC
     * timestamps that Eloquent stored verbatim without converting to
     * the app timezone. Re-interpret each stored value as UTC and
     * convert to the app timezone so the digits match local time.
     *
     * @return void
     */
    public function up(): void
    {
        $appTz = config('app.timezone');

        $columns = [
            'feeding_logs'    => 'fed_at',
            'supplement_logs' => 'given_at',
            'health_notes'    => 'noted_at',
        ];

        foreach ($columns as $table => $column) {
            $rows = DB::table($table)->select(['id', $column])->get();

            foreach ($rows as $row) {
                if ($row->{$column} === null) {
                    continue;
                }

                $corrected = Carbon::parse($row->{$column}, 'UTC')
                    ->setTimezone($appTz)
                    ->format('Y-m-d H:i:s');

                DB::table($table)
                    ->where('id', $row->id)
                    ->update([$column => $corrected]);
            }
        }
    }

    /**
     * @return void
     */
    public function down(): void
    {
        $appTz = config('app.timezone');

        $columns = [
            'feeding_logs'    => 'fed_at',
            'supplement_logs' => 'given_at',
            'health_notes'    => 'noted_at',
        ];

        foreach ($columns as $table => $column) {
            $rows = DB::table($table)->select(['id', $column])->get();

            foreach ($rows as $row) {
                if ($row->{$column} === null) {
                    continue;
                }

                $reverted = Carbon::parse($row->{$column}, $appTz)
                    ->setTimezone('UTC')
                    ->format('Y-m-d H:i:s');

                DB::table($table)
                    ->where('id', $row->id)
                    ->update([$column => $reverted]);
            }
        }
    }
};
