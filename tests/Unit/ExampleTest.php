<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ExampleTest extends TestCase
{
    /**
     * Verifies the test runner boots and string assertions work.
     *
     * @return void
     */
    public function test_puppertrak_string_is_lowercase(): void
    {
        $this->assertSame('puppertrak', strtolower('PupperTrak'));
    }
}
