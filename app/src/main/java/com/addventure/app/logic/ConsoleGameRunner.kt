package com.addventure.app.logic

import java.util.Scanner

fun main() {
    ConsoleGameRunner.run()
}

object ConsoleGameRunner {
    private val activityManager = ActivityManager()
    private val difficultyEngine = AdaptiveDifficultyEngine()
    private val hintManager = HintManager()
    private val scanner = Scanner(System.`in`)

    // Session state
    private var currentDifficulty = AdaptiveDifficultyEngine.DIFFICULTY_EASY
    private var consecutiveCorrect = 0
    private var consecutiveWrong = 0
    private var totalStarsEarned = 0

    fun run() {
        printHeader()
        var running = true

        while (running) {
            println("\n========================================")
            println("              MAIN MENU 🦉")
            println("========================================")
            println("Current Difficulty: ${difficultyEngine.getDifficultyLabel(currentDifficulty)}")
            println("Total Stars Earned: ⭐ $totalStarsEarned")
            println("----------------------------------------")
            println("Choose a strategy to play:")
            println("1) Count All 🍎")
            println("2) Count On 🔢")
            println("3) Number Bonds 🧩")
            println("4) Change Difficulty Manual Setting ⚙️")
            println("5) Exit Game 🚪")
            print("\nEnter option (1-5): ")

            val input = scanner.nextLine().trim()
            when (input) {
                "1" -> playSession(ActivityManager.STRATEGY_COUNT_ALL)
                "2" -> playSession(ActivityManager.STRATEGY_COUNT_ON)
                "3" -> playSession(ActivityManager.STRATEGY_NUMBER_BONDS)
                "4" -> changeDifficultyMenu()
                "5", "exit", "quit" -> {
                    println("\nThanks for playing Add-Venture! Bye! 🦉👋")
                    running = false
                }
                else -> println("Invalid option. Please enter a number 1-5.")
            }
        }
    }

    private fun printHeader() {
        println("************************************************")
        println("*                                              *")
        println("*            A D D - V E N T U R E             *")
        println("*         Mac Interactive Console Game         *")
        println("*                                              *")
        println("************************************************")
        println("    ,___,")
        println("    [O.o]    Hi! I'm Owly! 🦉")
        println("    /)__)    Let's learn addition together!")
        println("    \"\" \"\"")
        println("Type 'hint' or 'h' during gameplay if you get stuck!")
    }

    private fun changeDifficultyMenu() {
        println("\n--- Select Difficulty ---")
        println("1) Easy")
        println("2) Medium")
        println("3) Hard")
        print("Enter choice (1-3): ")
        val choice = scanner.nextLine().trim()
        when (choice) {
            "1" -> {
                currentDifficulty = AdaptiveDifficultyEngine.DIFFICULTY_EASY
                println("Difficulty set to Easy.")
            }
            "2" -> {
                currentDifficulty = AdaptiveDifficultyEngine.DIFFICULTY_MEDIUM
                println("Difficulty set to Medium.")
            }
            "3" -> {
                currentDifficulty = AdaptiveDifficultyEngine.DIFFICULTY_HARD
                println("Difficulty set to Hard.")
            }
            else -> println("Invalid choice.")
        }
    }

    private fun playSession(strategy: String) {
        val strategyLabel = when (strategy) {
            ActivityManager.STRATEGY_COUNT_ALL -> "COUNT ALL 🍎"
            ActivityManager.STRATEGY_COUNT_ON -> "COUNT ON 🔢"
            ActivityManager.STRATEGY_NUMBER_BONDS -> "NUMBER BONDS 🧩"
            else -> strategy
        }

        println("\n========================================")
        println("🎮 STARTING SESSION: $strategyLabel")
        println("========================================")

        var correctAnswersThisSession = 0
        var starsThisSession = 0
        var totalAttempts = 0
        val maxActivities = 5

        hintManager.resetHints(strategy)

        for (i in 1..maxActivities) {
            println("\n--- Question $i of $maxActivities ---")
            val problem = activityManager.generateProblem(strategy, currentDifficulty)
            
            var solved = false
            var retryCount = 0
            var hintsUsed = 0
            val startTime = System.currentTimeMillis()

            while (!solved) {
                // Display the problem based on the strategy
                when (strategy) {
                    ActivityManager.STRATEGY_COUNT_ALL -> {
                        println("Count the objects in both groups to find the sum!")
                        val (group1, group2) = activityManager.getCountAllObjects(problem.num1, problem.num2)
                        println("Group 1: ${group1.joinToString(" ")}")
                        println("Group 2: ${group2.joinToString(" ")}")
                        println("Question: ${problem.num1} + ${problem.num2} = ?")
                    }
                    ActivityManager.STRATEGY_COUNT_ON -> {
                        val bigger = maxOf(problem.num1, problem.num2)
                        val smaller = minOf(problem.num1, problem.num2)
                        println("Start with the bigger number ($bigger) and count forward $smaller times:")
                        val countOnCircles = List(smaller) { "🔵" }.joinToString(" ")
                        println("Counting steps: $bigger -> $countOnCircles")
                        println("Question: What is the total sum?")
                    }
                    ActivityManager.STRATEGY_NUMBER_BONDS -> {
                        println("Find the missing part that adds up to the whole!")
                        println("    [ Whole: ${problem.correctAnswer} ]")
                        println("       /      \\")
                        println(" [ Part1: ${problem.num1} ]   [ Part2: ? ]")
                        println("Question: ${problem.num1} + ? = ${problem.correctAnswer}")
                    }
                }

                print("Your Answer (or 'h' for hint): ")
                val userInput = scanner.nextLine().trim().lowercase()

                if (userInput == "h" || userInput == "hint") {
                    hintsUsed++
                    println("\n🦉 Hint: ${hintManager.getHint(strategy)}\n")
                    continue
                }

                val answerInt = userInput.toIntOrNull()
                if (answerInt == null) {
                    println("Please enter a valid number or 'h' for hint.")
                    continue
                }

                totalAttempts++
                val isCorrect = if (strategy == ActivityManager.STRATEGY_NUMBER_BONDS) {
                    answerInt == problem.num2
                } else {
                    answerInt == problem.correctAnswer
                }

                val responseTimeMs = System.currentTimeMillis() - startTime

                if (isCorrect) {
                    println("🎉 Correct! Great job!")
                    val stars = activityManager.calculateStars(true, responseTimeMs, hintsUsed, retryCount)
                    println("Earned: ⭐ $stars")
                    starsThisSession += stars
                    totalStarsEarned += stars
                    correctAnswersThisSession++
                    
                    // Evaluate adaptive difficulty based on first-attempt correctness
                    val evaluation = difficultyEngine.evaluatePerformance(
                        currentDifficulty,
                        consecutiveCorrect,
                        consecutiveWrong,
                        retryCount == 0,
                        responseTimeMs
                    )
                    
                    val oldDiff = currentDifficulty
                    currentDifficulty = evaluation.first
                    consecutiveCorrect = evaluation.second
                    consecutiveWrong = evaluation.third

                    if (currentDifficulty > oldDiff) {
                        println("🚀 Performance update: You leveled up! Difficulty is now: ${difficultyEngine.getDifficultyLabel(currentDifficulty)}")
                    }
                    
                    solved = true
                } else {
                    retryCount++
                    println("❌ Oops! That's incorrect. Try again! 😊")
                    
                    if (retryCount >= 2) {
                        // Adaptive difficulty decrease after consecutive errors
                        val evaluation = difficultyEngine.evaluatePerformance(
                            currentDifficulty,
                            consecutiveCorrect,
                            consecutiveWrong,
                            false,
                            responseTimeMs
                        )
                        val oldDiff = currentDifficulty
                        currentDifficulty = evaluation.first
                        consecutiveCorrect = evaluation.second
                        consecutiveWrong = evaluation.third

                        if (currentDifficulty < oldDiff) {
                            println("📉 System update: Adjusted difficulty to: ${difficultyEngine.getDifficultyLabel(currentDifficulty)}")
                        }
                    }
                }
            }
        }

        // Session summary
        println("\n========================================")
        println("🏁 SESSION COMPLETE!")
        println("========================================")
        println("Correct Answers: $correctAnswersThisSession / $maxActivities")
        println("Stars Earned this session: ⭐ $starsThisSession")
        val accuracy = if (totalAttempts > 0) (correctAnswersThisSession.toFloat() / maxActivities * 100).toInt() else 0
        println("Session Accuracy: $accuracy%")
        println("Current Difficulty: ${difficultyEngine.getDifficultyLabel(currentDifficulty)}")
        println("========================================\n")
        
        print("Press ENTER to return to Main Menu...")
        scanner.nextLine()
    }
}
