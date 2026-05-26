package com.addventure.app.logic

/**
 * Provides contextual hints for each addition strategy type.
 */
class HintManager {

    private val countAllHints = listOf(
        "Count all the objects one by one!",
        "Start from 1 and count every object you see!",
        "Put all objects together and count them all!",
        "Touch each object as you count: 1, 2, 3...",
        "Group all the items and count from the beginning!"
    )

    private val countOnHints = listOf(
        "Start with the bigger number and count on!",
        "You already know one number — just count forward!",
        "Hold the first number in your head and add more!",
        "Start from the bigger group and keep counting!",
        "Don't start from 1 — start from the bigger number!"
    )

    private val numberBondsHints = listOf(
        "Look at the parts — what do they add up to?",
        "The two parts together make the whole!",
        "Think: what number plus this part equals the whole?",
        "Look at what's missing in the number bond!",
        "The whole is split into two parts — find the missing one!"
    )

    private var hintIndex = mutableMapOf<String, Int>()

    /**
     * Gets the next hint for a given strategy. Cycles through hints.
     */
    fun getHint(strategy: String): String {
        val hints = when (strategy) {
            ActivityManager.STRATEGY_COUNT_ALL -> countAllHints
            ActivityManager.STRATEGY_COUNT_ON -> countOnHints
            ActivityManager.STRATEGY_NUMBER_BONDS -> numberBondsHints
            else -> countAllHints
        }

        val currentIndex = hintIndex.getOrDefault(strategy, 0)
        val hint = hints[currentIndex % hints.size]
        hintIndex[strategy] = currentIndex + 1

        return hint
    }

    /**
     * Resets hint cycling for a strategy.
     */
    fun resetHints(strategy: String) {
        hintIndex[strategy] = 0
    }

    /**
     * Gets the mascot message for the hint popup.
     */
    fun getMascotMessage(strategy: String): String {
        return when (strategy) {
            ActivityManager.STRATEGY_COUNT_ALL ->
                "Hi! I'm Owly!\nLet me help you count!"
            ActivityManager.STRATEGY_COUNT_ON ->
                "Hey there!\nLet's count forward together!"
            ActivityManager.STRATEGY_NUMBER_BONDS ->
                "Hello friend!\nLet's find the missing number!"
            else -> "I'm here to help!"
        }
    }
}
