/**
 * This file defines some basic cryptographic tools.
 * Uses the "seedrandom" Pseudo Random Number Generator.
 * See: https://github.com/davidbau/seedrandom
 */
/*jslint node: true */
"use strict";

define(["Squishy", "Squishy/../seedrandom.min"], function() {
    /**
     * Generates a random float between 0 and 1.
     */
    squishy.seedRandom = function(seed) {
        return Math.seedrandom(seed);       // replaces Math.random
    };
});