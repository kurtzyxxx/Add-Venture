package com.addventure.app.viewmodel

import android.app.Application
import androidx.lifecycle.*
import com.addventure.app.AddVentureApp
import com.addventure.app.data.entity.ActivityRecord
import com.addventure.app.data.entity.SessionRecord
import com.addventure.app.logic.*
import kotlinx.coroutines.launch

class ActivityViewModel(application: Application) : AndroidViewModel(application) {

    private val db = (application as AddVentureApp).database
    private val learnerDao = db.learnerDao()
    private val activityRecordDao = db.activityRecordDao()
    private val progressDao = db.progressDao()
    private val sessionDao = db.sessionDao()

    val activityManager = ActivityManager()
    val hintManager = HintManager()
    val adaptiveEngine = AdaptiveDifficultyEngine()
    val feedbackManager = FeedbackManager()

    // Current problem state
    private val _currentProblem = MutableLiveData<AdditionProblem>()
    val currentProblem: LiveData<AdditionProblem> = _currentProblem

    // Score and stars
    private val _totalStars = MutableLiveData(0)
    val totalStars: LiveData<Int> = _totalStars

    private val _earnedStars = MutableLiveData(0)
    val earnedStars: LiveData<Int> = _earnedStars

    // Timer
    private val _timeRemainingMs = MutableLiveData(0L)
    val timeRemainingMs: LiveData<Long> = _timeRemainingMs

    private var activityStartTimeMs = 0L

    // Feedback
    private val _feedbackMessage = MutableLiveData<String>()
    val feedbackMessage: LiveData<String> = _feedbackMessage

    private val _isCorrectAnswer = MutableLiveData<Boolean?>()
    val isCorrectAnswer: LiveData<Boolean?> = _isCorrectAnswer

    // Current difficulty
    private val _currentDifficulty = MutableLiveData(1)
    val currentDifficulty: LiveData<Int> = _currentDifficulty

    // Activity count for session
    private val _activitiesCompleted = MutableLiveData(0)
    val activitiesCompleted: LiveData<Int> = _activitiesCompleted

    // Session
    private var currentSessionId: Long = 0L
    private var hintsUsedThisActivity = 0
    private var retryCountThisActivity = 0

    // Unlock event
    private val _unlockEvent = MutableLiveData<String?>()
    val unlockEvent: LiveData<String?> = _unlockEvent

    // Learner data
    val learnerProfile = learnerDao.getDefaultLearner()

    // Progress data
    fun getProgressRecords() = progressDao.getAllByLearner(1L)

    /**
     * Starts a new learning session.
     */
    fun startSession() {
        viewModelScope.launch {
            val session = SessionRecord(learnerId = 1L)
            currentSessionId = sessionDao.insert(session)
        }
    }

    /**
     * Generates a new problem for the given strategy.
     */
    fun generateNewProblem(strategy: String) {
        viewModelScope.launch {
            val learner = learnerDao.getDefaultLearnerSync()
            val difficulty = learner?.currentDifficulty ?: 1
            _currentDifficulty.value = difficulty

            val problem = activityManager.generateProblem(strategy, difficulty)
            _currentProblem.value = problem

            // Reset per-activity counters
            hintsUsedThisActivity = 0
            retryCountThisActivity = 0
            activityStartTimeMs = System.currentTimeMillis()

            // Reset feedback
            _isCorrectAnswer.value = null
            _feedbackMessage.value = ""

            // Reset hints
            hintManager.resetHints(strategy)
        }
    }

    /**
     * Submits a learner's answer and processes the result.
     */
    fun submitAnswer(learnerAnswer: Int) {
        val problem = _currentProblem.value ?: return

        viewModelScope.launch {
            val responseTimeMs = System.currentTimeMillis() - activityStartTimeMs
            val isCorrect = activityManager.validateAnswer(problem, learnerAnswer)
            val stars = activityManager.calculateStars(
                isCorrect, responseTimeMs, hintsUsedThisActivity, retryCountThisActivity
            )

            _isCorrectAnswer.value = isCorrect
            _earnedStars.value = stars

            if (isCorrect) {
                _feedbackMessage.value = feedbackManager.getCorrectFeedback()
                _totalStars.value = (_totalStars.value ?: 0) + stars
                _activitiesCompleted.value = (_activitiesCompleted.value ?: 0) + 1

                // Record activity
                val record = ActivityRecord(
                    learnerId = 1L,
                    activityType = problem.strategy,
                    activityLevel = problem.difficulty,
                    questionNum1 = problem.num1,
                    questionNum2 = problem.num2,
                    correctAnswer = problem.correctAnswer,
                    learnerAnswer = learnerAnswer,
                    isCorrect = true,
                    responseTimeMs = responseTimeMs,
                    starsEarned = stars,
                    difficulty = problem.difficulty,
                    hintsUsed = hintsUsedThisActivity,
                    retryCount = retryCountThisActivity,
                    sessionId = currentSessionId
                )
                activityRecordDao.insert(record)

                // Update progress
                progressDao.recordCompletion(1L, problem.strategy, 1, stars)

                // Update learner stars
                learnerDao.addStars(1L, stars)

                // Adaptive difficulty adjustment
                val learner = learnerDao.getDefaultLearnerSync()
                if (learner != null) {
                    val (newDiff, newCorrect, newWrong) = adaptiveEngine.evaluatePerformance(
                        learner.currentDifficulty,
                        learner.consecutiveCorrect,
                        learner.consecutiveWrong,
                        true,
                        responseTimeMs
                    )
                    learnerDao.updateDifficulty(1L, newDiff, newCorrect, newWrong)
                    _currentDifficulty.value = newDiff
                }

                // Check progression / unlock
                checkAndUnlockNext(problem.strategy)

            } else {
                _feedbackMessage.value = feedbackManager.getIncorrectFeedback()

                // Record incorrect attempt
                val record = ActivityRecord(
                    learnerId = 1L,
                    activityType = problem.strategy,
                    activityLevel = problem.difficulty,
                    questionNum1 = problem.num1,
                    questionNum2 = problem.num2,
                    correctAnswer = problem.correctAnswer,
                    learnerAnswer = learnerAnswer,
                    isCorrect = false,
                    responseTimeMs = responseTimeMs,
                    starsEarned = 0,
                    difficulty = problem.difficulty,
                    hintsUsed = hintsUsedThisActivity,
                    retryCount = retryCountThisActivity,
                    sessionId = currentSessionId
                )
                activityRecordDao.insert(record)

                // Update progress for wrong attempt
                progressDao.recordCompletion(1L, problem.strategy, 0, 0)

                // Adaptive difficulty for wrong answer
                val learner = learnerDao.getDefaultLearnerSync()
                if (learner != null) {
                    val (newDiff, newCorrect, newWrong) = adaptiveEngine.evaluatePerformance(
                        learner.currentDifficulty,
                        learner.consecutiveCorrect,
                        learner.consecutiveWrong,
                        false,
                        responseTimeMs
                    )
                    learnerDao.updateDifficulty(1L, newDiff, newCorrect, newWrong)
                    _currentDifficulty.value = newDiff
                }
            }
        }
    }

    /**
     * Records a hint usage.
     */
    fun useHint(): String {
        val strategy = _currentProblem.value?.strategy ?: return ""
        hintsUsedThisActivity++
        return hintManager.getHint(strategy)
    }

    /**
     * Records a retry.
     */
    fun retry() {
        retryCountThisActivity++
        _isCorrectAnswer.value = null
        _feedbackMessage.value = ""
        activityStartTimeMs = System.currentTimeMillis()
    }

    /**
     * Checks progression criteria and unlocks next level if met.
     */
    private suspend fun checkAndUnlockNext(strategy: String) {
        val progress = progressDao.getByStrategy(1L, strategy) ?: return

        if (activityManager.checkProgressionCriteria(
                progress.completedActivities,
                progress.totalCorrect,
                progress.totalAttempts
            )
        ) {
            val newLevel = progress.unlockedLevel + 1
            if (newLevel <= 10) { // Max 10 levels
                progressDao.unlockLevel(1L, strategy, newLevel)
                _unlockEvent.value = strategy
            }
        }

        // Update overall progress
        val allProgress = progressDao.getAllByLearnerSync(1L)
        val totalCompleted = allProgress.sumOf { it.completedActivities }
        val overallProgress = (totalCompleted.toFloat() / 30f).coerceAtMost(1f) // 30 activities total goal
        learnerDao.updateProgress(1L, overallProgress)
    }

    /**
     * Clears the unlock event after it's been handled.
     */
    fun clearUnlockEvent() {
        _unlockEvent.value = null
    }

    /**
     * Ends the current session and returns the session summary.
     */
    fun endSession(onComplete: (SessionRecord?) -> Unit) {
        viewModelScope.launch {
            if (currentSessionId > 0) {
                val records = activityRecordDao.getBySession(currentSessionId)
                val totalActivities = records.size
                val totalCorrect = records.count { it.isCorrect }
                val totalStarsEarned = records.sumOf { it.starsEarned }
                val avgAccuracy = if (totalActivities > 0) totalCorrect.toFloat() / totalActivities else 0f
                val avgResponseTime = activityRecordDao.getAverageResponseTime(currentSessionId) ?: 0L

                val session = sessionDao.getById(currentSessionId)
                if (session != null) {
                    val updated = session.copy(
                        totalActivities = totalActivities,
                        totalCorrect = totalCorrect,
                        totalStars = totalStarsEarned,
                        averageAccuracy = avgAccuracy,
                        averageResponseTimeMs = avgResponseTime,
                        endedAt = System.currentTimeMillis(),
                        durationMs = System.currentTimeMillis() - session.startedAt
                    )
                    sessionDao.update(updated)
                    onComplete(updated)
                } else {
                    onComplete(null)
                }
            } else {
                onComplete(null)
            }
        }
    }

    /**
     * Updates the learner's profile name.
     */
    fun updateLearnerName(name: String) {
        viewModelScope.launch {
            val profile = learnerDao.getDefaultLearnerSync()
            if (profile != null) {
                val updated = profile.copy(name = name)
                learnerDao.update(updated)
            }
        }
    }
}
