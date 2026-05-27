package com.addventure.app.logic

import kotlin.random.Random

/**
 * Represents an addition problem for the learner to solve.
 */
data class AdditionProblem(
    val num1: Int,
    val num2: Int,
    val correctAnswer: Int = num1 + num2,
    val strategy: String,
    val difficulty: Int
)

/**
 * Manages activity flow: generates problems, validates responses, and manages progression.
 */
class ActivityManager {

    companion object {
        const val STRATEGY_COUNT_ALL = "COUNT_ALL"
        const val STRATEGY_COUNT_ON = "COUNT_ON"
        const val STRATEGY_NUMBER_BONDS = "NUMBER_BONDS"

        // Difficulty ranges for addends
        private val EASY_RANGE = 1..3    // sums 2-6
        private val MEDIUM_RANGE = 2..5  // sums 4-10
        private val HARD_RANGE = 3..9    // sums 6-18 (capped at 9+9)
    }

    /**
     * Generates an addition problem based on strategy and difficulty level.
     */
    fun generateProblem(strategy: String, difficulty: Int): AdditionProblem {
        val range = when (difficulty) {
            1 -> EASY_RANGE
            2 -> MEDIUM_RANGE
            3 -> HARD_RANGE
            else -> EASY_RANGE
        }

        val num1 = Random.nextInt(range.first, range.last + 1)
        val num2 = Random.nextInt(range.first, range.last + 1)

        return AdditionProblem(
            num1 = num1,
            num2 = num2,
            correctAnswer = num1 + num2,
            strategy = strategy,
            difficulty = difficulty
        )
    }

    /**
     * Validates a learner's answer against the correct answer.
     */
    fun validateAnswer(problem: AdditionProblem, learnerAnswer: Int): Boolean {
        return learnerAnswer == problem.correctAnswer
    }

    /**
     * Calculates stars earned based on performance.
     * 3 stars: correct on first try, fast
     * 2 stars: correct on first try, slower
     * 1 star: correct after hints/retries
     * 0 stars: incorrect
     */
    fun calculateStars(
        isCorrect: Boolean,
        responseTimeMs: Long,
        hintsUsed: Int,
        retryCount: Int
    ): Int {
        if (!isCorrect) return 0

        // Start with 5 stars for a correct first try. Each mistake (retry) reduces by 1.
        // Minimum stars is 0.
        val baseStars = 5
        val starsAfterRetries = (baseStars - retryCount).coerceAtLeast(0)
        return starsAfterRetries
    }

    /**
     * Checks if the learner meets progression criteria to unlock next level.
     * Requires at least 3 completed activities with >= 80% accuracy.
     */
    fun checkProgressionCriteria(completedActivities: Int, totalCorrect: Int, totalAttempts: Int): Boolean {
        if (completedActivities < 3) return false
        if (totalAttempts == 0) return false
        val accuracy = totalCorrect.toFloat() / totalAttempts
        return accuracy >= 0.8f
    }

    /**
     * Gets the list of objects/fruits for Count All activities.
     */
    fun getCountAllObjects(num1: Int, num2: Int): Pair<List<String>, List<String>> {
        val fruits = listOf("berry", "nut", "seed")
        val fruit1 = fruits[Random.nextInt(fruits.size)]
        val fruit2 = fruits.filter { it != fruit1 }[Random.nextInt(fruits.size - 1)]

        return Pair(
            List(num1) { fruit1 },
            List(num2) { fruit2 }
        )
    }
}
