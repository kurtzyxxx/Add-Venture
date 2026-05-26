package com.addventure.app.logic

/**
 * Provides appropriate feedback messages based on learner performance.
 */
class FeedbackManager {

    private val correctMessages = listOf(
        "🌟 Amazing job! You got it right!",
        "⭐ Wonderful! Keep going!",
        "🎉 Excellent! You're a math star!",
        "🏆 Perfect! You're doing great!",
        "💪 Super! That was awesome!",
        "🎯 Bullseye! Correct answer!",
        "🌈 Brilliant! You're so smart!",
        "🥇 Champion! Way to go!"
    )

    private val incorrectMessages = listOf(
        "Oops! Not quite. Let's try again! 💪",
        "Almost there! Give it another try! 🌟",
        "Don't worry! Let's try once more! 😊",
        "That's okay! Everyone makes mistakes! 💛",
        "Keep trying! You'll get it! 🎯"
    )

    private val encouragementMessages = listOf(
        "You can do it! 💪",
        "Believe in yourself! ⭐",
        "Keep going, you're doing great! 🌟",
        "Practice makes perfect! 🎯",
        "You're getting better every time! 📈"
    )

    fun getCorrectFeedback(): String {
        return correctMessages.random()
    }

    fun getIncorrectFeedback(): String {
        return incorrectMessages.random()
    }

    fun getEncouragement(): String {
        return encouragementMessages.random()
    }

    /**
     * Gets star-specific feedback message.
     */
    fun getStarFeedback(stars: Int): String {
        return when (stars) {
            3 -> "🌟🌟🌟 Perfect! 3 Stars!"
            2 -> "🌟🌟 Great job! 2 Stars!"
            1 -> "🌟 Good try! 1 Star!"
            else -> "Keep practicing! You'll earn stars next time! 💪"
        }
    }
}
