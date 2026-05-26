package com.addventure.app.logic

/**
 * Adjusts difficulty based on learner accuracy and response time.
 *
 * Rules:
 * - Increase difficulty after 3 consecutive correct + fast responses
 * - Decrease difficulty after 2 consecutive wrong answers
 * - Difficulty levels: 1 (Easy), 2 (Medium), 3 (Hard)
 */
class AdaptiveDifficultyEngine {

    companion object {
        const val DIFFICULTY_EASY = 1
        const val DIFFICULTY_MEDIUM = 2
        const val DIFFICULTY_HARD = 3

        private const val CONSECUTIVE_CORRECT_TO_INCREASE = 3
        private const val CONSECUTIVE_WRONG_TO_DECREASE = 2
        private const val FAST_RESPONSE_THRESHOLD_MS = 20000L // 20 seconds
    }

    /**
     * Evaluates performance and returns updated difficulty state.
     *
     * @return Triple(newDifficulty, newConsecutiveCorrect, newConsecutiveWrong)
     */
    fun evaluatePerformance(
        currentDifficulty: Int,
        consecutiveCorrect: Int,
        consecutiveWrong: Int,
        isCorrect: Boolean,
        responseTimeMs: Long
    ): Triple<Int, Int, Int> {
        var newCorrect = consecutiveCorrect
        var newWrong = consecutiveWrong
        var newDifficulty = currentDifficulty

        if (isCorrect) {
            newWrong = 0
            if (responseTimeMs <= FAST_RESPONSE_THRESHOLD_MS) {
                newCorrect++
            } else {
                // Correct but slow — don't increment streak
                newCorrect = maxOf(newCorrect, 1)
            }

            // Check if we should increase difficulty
            if (newCorrect >= CONSECUTIVE_CORRECT_TO_INCREASE && newDifficulty < DIFFICULTY_HARD) {
                newDifficulty++
                newCorrect = 0
            }
        } else {
            newCorrect = 0
            newWrong++

            // Check if we should decrease difficulty
            if (newWrong >= CONSECUTIVE_WRONG_TO_DECREASE && newDifficulty > DIFFICULTY_EASY) {
                newDifficulty--
                newWrong = 0
            }
        }

        return Triple(newDifficulty, newCorrect, newWrong)
    }

    /**
     * Returns a human-readable difficulty label.
     */
    fun getDifficultyLabel(difficulty: Int): String {
        return when (difficulty) {
            DIFFICULTY_EASY -> "Easy"
            DIFFICULTY_MEDIUM -> "Medium"
            DIFFICULTY_HARD -> "Hard"
            else -> "Easy"
        }
    }
}
